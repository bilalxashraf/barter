import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { createAgentKey } from '../../../../_lib/agentApi';
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
    return redirectTo('/dashboard?status=key_created');
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'key_create_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
