import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../../../../_lib/xAuth';

export async function GET() {
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'X_CLIENT_ID or X_REDIRECT_URI missing' }, { status: 500 });
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
