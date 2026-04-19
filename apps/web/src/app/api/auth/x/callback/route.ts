import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ensureWebBootstrap } from "@/lib/bootstrap";
import { setSessionCookie } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";
import { exchangeCodeForToken, fetchCurrentXUser, getOauthCookieNames } from "@/lib/x-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureWebBootstrap();
  const runtime = getWebRuntime();

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const store = await cookies();
  const { stateCookieName, verifierCookieName } = getOauthCookieNames();
  const expectedState = store.get(stateCookieName)?.value;
  const verifier = store.get(verifierCookieName)?.value;

  store.delete(stateCookieName);
  store.delete(verifierCookieName);

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_state_mismatch", request.url));
  }

  const token = await exchangeCodeForToken(code, verifier);
  const user = await fetchCurrentXUser(token.accessToken);
  const account = await runtime.repository.upsertXAccount({
    externalUserId: user.id,
    handle: `@${user.username}`,
    displayName: user.name,
    ...(user.profile_image_url ? { profileImageUrl: user.profile_image_url } : {}),
    rawProfile: user
  });
  await runtime.repository.storeOAuthCredential({
    accountId: account.account.id,
    externalUserId: user.id,
    accessToken: token.accessToken,
    ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}),
    ...(token.tokenType ? { tokenType: token.tokenType } : {}),
    ...(token.scopes?.length ? { scopes: token.scopes } : {}),
    ...(token.expiresAt ? { expiresAt: token.expiresAt } : {}),
    metadata: {
      verified: user.verified ?? false
    }
  });
  const session = await runtime.repository.createAuthSession({
    accountId: account.account.id,
    ...(request.headers.get("user-agent")
      ? { userAgent: request.headers.get("user-agent") as string }
      : {})
  });
  await setSessionCookie(session);

  return NextResponse.redirect(new URL("/dashboard?connected=1", request.url));
}
