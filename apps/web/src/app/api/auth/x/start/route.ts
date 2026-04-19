import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ensureWebBootstrap } from "@/lib/bootstrap";
import { setSessionCookie } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";
import { createAuthorizationRequest, getOauthCookieNames } from "@/lib/x-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureWebBootstrap();
  const runtime = getWebRuntime();

  if (!runtime.config.X_CLIENT_ID || !runtime.config.X_REDIRECT_URI) {
    const handle = normalizeDevHandle(request.nextUrl.searchParams.get("handle"));
    const displayName = request.nextUrl.searchParams.get("name")?.trim() || "Local Builder";
    const session = await runtime.repository.createDevelopmentSession({
      handle,
      displayName
    });
    await setSessionCookie(session);

    const redirectUrl = new URL("/dashboard?mode=local-dev", runtime.config.BARTER_BASE_URL);
    redirectUrl.searchParams.set("handle", handle);

    return NextResponse.redirect(redirectUrl);
  }

  const authRequest = await createAuthorizationRequest();
  const store = await cookies();
  const { stateCookieName, verifierCookieName } = getOauthCookieNames();

  store.set(stateCookieName, authRequest.state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: runtime.config.NODE_ENV === "production",
    maxAge: 60 * 10
  });
  store.set(verifierCookieName, authRequest.verifier, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: runtime.config.NODE_ENV === "production",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(authRequest.url);
}

function normalizeDevHandle(input: string | null): string {
  const normalized = (input ?? "localbuilder").trim().replace(/^@+/, "").toLowerCase();

  if (!/^[a-z0-9_]{1,15}$/.test(normalized)) {
    return "@localbuilder";
  }

  return `@${normalized}`;
}
