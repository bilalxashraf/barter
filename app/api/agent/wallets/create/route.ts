import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { createAgentWallet, listAgentWallets, listSolanaWallets } from '../../../../_lib/agentApi';
import { getUserByXId, upsertUser } from '../../../../_lib/xUserStore';

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
    const evmList = await listAgentWallets(session.agentId, existing.apiKey);
    const evmWallets = evmList.wallets || [];

    const solanaList = await listSolanaWallets(session.agentId, existing.apiKey);
    const solanaWallets = solanaList.wallets || [];

    // Find the maximum wallet number across ALL wallets (EVM + Solana)
    const allWalletNumbers = [
      ...evmWallets.map(w => w.walletNo),
      ...solanaWallets.map(w => w.walletNo)
    ];

    const nextWalletNo = allWalletNumbers.length > 0
      ? Math.max(...allWalletNumbers) + 1
      : 1;

    const walletResp = await createAgentWallet(session.agentId, existing.apiKey, 'base', nextWalletNo);
    await upsertUser({
      xUserId: session.xUserId,
      xUsername: session.username,
      agentId: session.agentId,
      apiKey: existing.apiKey,
      walletAddress: walletResp.wallet.address,
      walletNo: walletResp.wallet.walletNo,
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    return redirectTo('/dashboard?status=wallet_created');
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'wallet_create_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
