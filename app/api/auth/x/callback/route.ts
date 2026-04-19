import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setSessionCookie } from '../../../../_lib/session';
import { getUserByXId, upsertUser } from '../../../../_lib/xUserStore';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, baseUrl));
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  console.log('[OAuth Callback] Starting OAuth flow', {
    hasCode: !!code,
    hasState: !!state,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasRedirectUri: !!redirectUri
  });

  if (!code || !state || !clientId || !redirectUri) {
    console.error('[OAuth Callback] Missing required parameters');
    return redirectTo('/dashboard?error=oauth_missing');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('x_oauth_state')?.value;
  const verifier = cookieStore.get('x_oauth_verifier')?.value;

  console.log('[OAuth Callback] Cookie check', {
    hasStoredState: !!storedState,
    stateMatches: storedState === state,
    hasVerifier: !!verifier
  });

  if (!storedState || storedState !== state || !verifier) {
    console.error('[OAuth Callback] State/verifier validation failed');
    return redirectTo('/dashboard?error=oauth_state');
  }

  const tokenBody = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const tokenHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  console.log('[OAuth Callback] Preparing auth header', {
    hasClientSecret: !!clientSecret,
    clientSecretLength: clientSecret?.length,
    willAddAuthHeader: !!clientSecret,
    clientIdPrefix: clientId?.substring(0, 10),
    redirectUri
  });

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    tokenHeaders.Authorization = `Basic ${basic}`;
    console.log('[OAuth Callback] Authorization header set', {
      authHeaderPrefix: tokenHeaders.Authorization.substring(0, 20)
    });
  } else {
    console.error('[OAuth Callback] X_CLIENT_SECRET is missing!');
  }

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: tokenHeaders,
    body: tokenBody
  });

  console.log('[OAuth Callback] Token exchange', { status: tokenRes.status });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    console.error('[OAuth Callback] Token exchange failed', { status: tokenRes.status, error: errorText });
    return redirectTo('/dashboard?error=token_failed');
  }

  const tokenJson = await tokenRes.json() as { access_token?: string };
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return redirectTo('/dashboard?error=token_missing');
  }

  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!userRes.ok) {
    return redirectTo('/dashboard?error=user_failed');
  }

  const userJson = await userRes.json() as { data?: { id: string; username: string } };
  const xUser = userJson.data;
  if (!xUser) {
    return redirectTo('/dashboard?error=user_missing');
  }

  const agentId = xUser.username;
  const existing = await getUserByXId(xUser.id);
  const apiKey = existing?.apiKey;
  const walletAddress = existing?.walletAddress;
  const walletNo = existing?.walletNo;

  await upsertUser({
    xUserId: xUser.id,
    xUsername: xUser.username,
    agentId,
    apiKey,
    walletAddress,
    walletNo,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  console.log('[OAuth Callback] User upserted, setting session cookie', {
    xUserId: xUser.id,
    username: xUser.username,
    agentId
  });

  setSessionCookie(cookieStore, {
    xUserId: xUser.id,
    username: xUser.username,
    agentId
  });

  cookieStore.set('x_oauth_state', '', { path: '/', maxAge: 0 });
  cookieStore.set('x_oauth_verifier', '', { path: '/', maxAge: 0 });

  console.log('[OAuth Callback] Redirecting to dashboard');
  return redirectTo('/dashboard');
}