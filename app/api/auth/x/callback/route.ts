import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setSessionCookie } from '../../../../_lib/session';
import { xClientRequiresSecret } from '../../../../_lib/xAuth';
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
  const requiresClientSecret = clientId ? xClientRequiresSecret(clientId) : false;

  console.log('[Auth] Callback received', {
    hasCode: !!code,
    hasState: !!state,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    requiresClientSecret,
    hasRedirectUri: !!redirectUri,
    redirectUri,
    hasAuthSecret: !!process.env.X_AUTH_SECRET,
    hasGcsBucket: !!process.env.GCS_BUCKET_NAME,
    origin: url.origin,
    baseUrl,
  });

  if (!code || !state) {
    console.error('[Auth] Missing code or state from Twitter');
    return redirectTo('/dashboard?error=oauth_missing&detail=no_code_or_state');
  }

  if (!clientId || !redirectUri) {
    console.error('[Auth] Missing X_CLIENT_ID or X_REDIRECT_URI env vars');
    return redirectTo('/dashboard?error=config_missing&detail=check_env_vars');
  }

  if (!process.env.X_AUTH_SECRET) {
    console.error('[Auth] X_AUTH_SECRET is not set');
    return redirectTo('/dashboard?error=config_missing&detail=missing_auth_secret');
  }

  if (requiresClientSecret && !clientSecret) {
    console.error('[Auth] X client is confidential but X_CLIENT_SECRET is missing');
    return redirectTo('/dashboard?error=config_missing&detail=missing_x_client_secret');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('x_oauth_state')?.value;
  const verifier = cookieStore.get('x_oauth_verifier')?.value;

  console.log('[Auth] Cookie check', {
    hasStoredState: !!storedState,
    stateMatches: storedState === state,
    hasVerifier: !!verifier,
  });

  if (!storedState || storedState !== state || !verifier) {
    console.error('[Auth] State/verifier mismatch — cookie may have expired or been lost');
    return redirectTo('/dashboard?error=oauth_state&detail=cookie_mismatch');
  }

  const tokenBody = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const tokenHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    tokenHeaders.Authorization = `Basic ${basic}`;
  } else {
    console.warn('[Auth] X_CLIENT_SECRET not set — token exchange may fail for confidential apps');
  }

  console.log('[Auth] Exchanging code for token', { redirectUri });

  let tokenRes: Response;
  try {
    tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: tokenHeaders,
      body: tokenBody,
    });
  } catch (err) {
    console.error('[Auth] Network error reaching Twitter', err);
    return redirectTo('/dashboard?error=network&detail=twitter_unreachable');
  }

  const tokenText = await tokenRes.text();
  console.log('[Auth] Token exchange response', { status: tokenRes.status, body: tokenText });

  if (!tokenRes.ok) {
    try {
      const tokenError = JSON.parse(tokenText) as { error?: string; error_description?: string };
      if (
        tokenError.error === 'unauthorized_client' &&
        /authorization header/i.test(tokenError.error_description || '')
      ) {
        return redirectTo('/dashboard?error=config_missing&detail=missing_or_invalid_x_client_secret');
      }
    } catch {
      // Keep the original token failure path when the provider body is not JSON.
    }

    const detail = encodeURIComponent(tokenText.slice(0, 200));
    return redirectTo(`/dashboard?error=token_failed&detail=${detail}`);
  }

  let tokenJson: { access_token?: string };
  try {
    tokenJson = JSON.parse(tokenText);
  } catch {
    return redirectTo('/dashboard?error=token_parse&detail=invalid_json');
  }

  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return redirectTo('/dashboard?error=token_missing&detail=no_access_token');
  }

  console.log('[Auth] Got access token, fetching user info');

  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const errText = await userRes.text();
    console.error('[Auth] Failed to fetch user info', { status: userRes.status, body: errText });
    return redirectTo(`/dashboard?error=user_failed&detail=${encodeURIComponent(errText.slice(0, 200))}`);
  }

  const userJson = await userRes.json() as { data?: { id: string; username: string } };
  const xUser = userJson.data;

  if (!xUser) {
    return redirectTo('/dashboard?error=user_missing&detail=no_user_data');
  }

  console.log('[Auth] User identified', { username: xUser.username, xUserId: xUser.id });

  const agentId = xUser.username;

  // Persist user record — non-fatal if GCS is not configured
  try {
    const existing = await getUserByXId(xUser.id);
    await upsertUser({
      xUserId: xUser.id,
      xUsername: xUser.username,
      agentId,
      apiKey: existing?.apiKey,
      walletAddress: existing?.walletAddress,
      walletNo: existing?.walletNo,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    console.log('[Auth] User record saved');
  } catch (err) {
    console.error('[Auth] Failed to save user record (non-fatal, GCS may not be configured)', err);
  }

  // Set session cookie
  try {
    setSessionCookie(cookieStore, {
      xUserId: xUser.id,
      username: xUser.username,
      agentId,
    });
    console.log('[Auth] Session cookie set');
  } catch (err) {
    console.error('[Auth] Failed to set session cookie', err);
    return redirectTo('/dashboard?error=session_failed&detail=check_auth_secret');
  }

  // Clear PKCE cookies
  cookieStore.set('x_oauth_state', '', { path: '/', maxAge: 0 });
  cookieStore.set('x_oauth_verifier', '', { path: '/', maxAge: 0 });

  console.log('[Auth] Complete, redirecting to dashboard');
  return redirectTo('/dashboard');
}
