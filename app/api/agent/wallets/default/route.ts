import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { listAgentWallets, listSolanaWallets } from '../../../../_lib/agentApi';
import { getUserByXId, upsertUser } from '../../../../_lib/xUserStore';

export async function POST(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, baseUrl));

  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  if (!session) {
    return redirectTo('/dashboard?error=not_authenticated');
  }

  const form = await req.formData();
  const walletNoRaw = String(form.get('walletNo') || '').trim();
  const networkId = String(form.get('networkId') || 'base').trim();
  const walletNo = Number(walletNoRaw);

  if (!walletNoRaw || Number.isNaN(walletNo)) {
    return redirectTo('/dashboard?error=invalid_wallet');
  }

  const existing = await getUserByXId(session.xUserId);
  if (!existing?.apiKey) {
    return redirectTo('/dashboard?error=missing_api_key');
  }

  try {
    let wallet;

    // Handle Solana wallets
    if (networkId === 'solana') {
      const list = await listSolanaWallets(session.agentId, existing.apiKey);
      wallet = list.wallets.find((item) => item.walletNo === walletNo);

      if (!wallet) {
        return redirectTo('/dashboard?error=solana_wallet_not_found');
      }

      await upsertUser({
        xUserId: session.xUserId,
        xUsername: session.username,
        agentId: session.agentId,
        apiKey: existing.apiKey,
        walletAddress: existing.walletAddress,
        walletNo: existing.walletNo,
        solanaWalletAddress: wallet.address,
        solanaWalletNo: wallet.walletNo,
        createdAt: existing.createdAt || Date.now(),
        updatedAt: Date.now()
      });

      return redirectTo('/dashboard?status=solana_wallet_default_set');
    }
    // Handle EVM wallets
    else {
      const list = await listAgentWallets(session.agentId, existing.apiKey);
      wallet = list.wallets.find((item) => item.walletNo === walletNo);

      if (!wallet) {
        return redirectTo('/dashboard?error=wallet_not_found');
      }

      await upsertUser({
        xUserId: session.xUserId,
        xUsername: session.username,
        agentId: session.agentId,
        apiKey: existing.apiKey,
        walletAddress: wallet.address,
        walletNo: wallet.walletNo,
        solanaWalletAddress: existing.solanaWalletAddress,
        solanaWalletNo: existing.solanaWalletNo,
        createdAt: existing.createdAt || Date.now(),
        updatedAt: Date.now()
      });

      return redirectTo('/dashboard?status=wallet_default_set');
    }
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'wallet_default_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
