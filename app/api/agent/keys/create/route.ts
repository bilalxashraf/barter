import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { createAgentKey } from '../../../../_lib/agentApi';
import { upsertMarketplaceAgentProfile } from '../../../../_lib/marketplaceRegistration';
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
  if (existing?.apiKey) {
    return redirectTo('/dashboard?status=key_exists');
  }

  try {
    const keyResp = await createAgentKey(session.agentId);
    await upsertUser({
      xUserId: session.xUserId,
      xUsername: session.username,
      agentId: session.agentId,
      apiKey: keyResp.apiKey,
      walletAddress: existing?.walletAddress,
      walletNo: existing?.walletNo,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    });

    if (existing?.solanaWalletNo) {
      try {
        await upsertMarketplaceAgentProfile({
          agentId: session.agentId,
          apiKey: keyResp.apiKey,
          username: session.username,
          chain: 'solana',
          walletNo: existing.solanaWalletNo,
        });
      } catch (error) {
        console.error('[Marketplace] Failed to sync registration after API key create', error);
        return redirectTo('/dashboard?status=key_created_marketplace_sync_pending');
      }
    } else if (existing?.walletNo) {
      try {
        await upsertMarketplaceAgentProfile({
          agentId: session.agentId,
          apiKey: keyResp.apiKey,
          username: session.username,
          chain: 'base',
          walletNo: existing.walletNo,
        });
      } catch (error) {
        console.error('[Marketplace] Failed to sync registration after API key create', error);
        return redirectTo('/dashboard?status=key_created_marketplace_sync_pending');
      }
    }

    return redirectTo('/dashboard?status=key_created');
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'key_create_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
