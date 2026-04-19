import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../../_lib/session';
import { createSolanaWallet, listSolanaWallets, listAgentWallets } from '../../../../../_lib/agentApi';
import { upsertMarketplaceAgentProfile } from '../../../../../_lib/marketplaceRegistration';
import { getUserByXId, upsertUser } from '../../../../../_lib/xUserStore';

export async function POST(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, baseUrl));

  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  if (!session) {
    return redirectTo('/dashboard?error=not_authenticated');
  }

  const existing = await getUserByXId(session.xUserId);
  if (!existing?.apiKey) {
    return redirectTo('/dashboard?error=missing_api_key');
  }

  try {
    // Fetch both EVM and Solana wallets to avoid wallet number conflicts
    const solanaList = await listSolanaWallets(session.agentId, existing.apiKey);
    const solanaWallets = solanaList.wallets || [];

    const evmList = await listAgentWallets(session.agentId, existing.apiKey);
    const evmWallets = evmList.wallets || [];

    // Find the maximum wallet number across ALL wallets (EVM + Solana)
    const allWalletNumbers = [
      ...solanaWallets.map(w => w.walletNo),
      ...evmWallets.map(w => w.walletNo)
    ];

    const nextWalletNo = allWalletNumbers.length > 0
      ? Math.max(...allWalletNumbers) + 1
      : 1;

    const walletResp = await createSolanaWallet(session.agentId, existing.apiKey, nextWalletNo);

    // Store in user record as solanaWalletAddress and solanaWalletNo
    await upsertUser({
      xUserId: session.xUserId,
      xUsername: session.username,
      agentId: session.agentId,
      apiKey: existing.apiKey,
      walletAddress: existing.walletAddress,
      walletNo: existing.walletNo,
      solanaWalletAddress: walletResp.wallet.address,
      solanaWalletNo: walletResp.wallet.walletNo,
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now()
    });

    try {
      await upsertMarketplaceAgentProfile({
        agentId: session.agentId,
        apiKey: existing.apiKey,
        username: session.username,
        chain: 'solana',
        walletNo: walletResp.wallet.walletNo,
      });
    } catch (error) {
      console.error('[Marketplace] Failed to sync registration after Solana wallet create', error);
      return redirectTo('/dashboard?status=solana_wallet_created_marketplace_sync_pending');
    }

    return redirectTo('/dashboard?status=solana_wallet_created');
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'solana_wallet_create_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
