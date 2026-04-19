import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionCookie } from '../../../../_lib/session';
import { getUserByXId, upsertUser } from '../../../../_lib/xUserStore';

function getBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const baseUrl = getBaseUrl(req);
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, baseUrl));

  const cookieStore = await cookies();
  const session = getSessionCookie(cookieStore);
  if (!session) {
    return redirectTo('/dashboard?error=not_authenticated');
  }

  const form = await req.formData();
  const apiKey = String(form.get('apiKey') || '').trim();
  if (!apiKey) {
    return redirectTo('/dashboard?error=missing_api_key');
  }

  try {
    const res = await fetch(`${process.env.AGENT_API_BASE_URL || 'https://api.barterpayments.xyz'}/agent/wallets/${session.agentId}/list`, {
      headers: { 'X-API-Key': apiKey }
    });
    if (!res.ok) {
      return redirectTo('/dashboard?error=invalid_api_key');
    }

    const existing = await getUserByXId(session.xUserId);
    await upsertUser({
      xUserId: session.xUserId,
      xUsername: session.username,
      agentId: session.agentId,
      apiKey,
      walletAddress: existing?.walletAddress,
      walletNo: existing?.walletNo,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now()
    });

    return redirectTo('/dashboard?status=key_saved');
  } catch (error: any) {
    const message = encodeURIComponent(error?.message || 'key_save_failed');
    return redirectTo(`/dashboard?error=${message}`);
  }
}
