import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  xClientRequiresSecret,
} from '../../../../_lib/xAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, baseUrl));
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return redirectTo('/dashboard?error=config_missing&detail=check_x_oauth_env');
  }

  if (!process.env.X_AUTH_SECRET) {
    return redirectTo('/dashboard?error=config_missing&detail=missing_auth_secret');
  }

  if (xClientRequiresSecret(clientId) && !clientSecret) {
    return redirectTo('/dashboard?error=config_missing&detail=missing_x_client_secret');
  }

  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'none' : 'lax'; // 'none' required for cross-site OAuth

  cookieStore.set('x_oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 600,
    path: '/'
  });

  cookieStore.set('x_oauth_verifier', verifier, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 600,
    path: '/'
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    force_login: 'true'
  });

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
}
