import crypto from "node:crypto";

import { getWebRuntime } from "./server";

const stateCookieName = "barter_x_state";
const verifierCookieName = "barter_x_verifier";

const scopeSet = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export async function createAuthorizationRequest() {
  const runtime = getWebRuntime();

  if (!runtime.config.X_CLIENT_ID || !runtime.config.X_REDIRECT_URI) {
    throw new Error("X OAuth is not configured");
  }

  const state = crypto.randomBytes(16).toString("base64url");
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://x.com/i/oauth2/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", runtime.config.X_CLIENT_ID);
  url.searchParams.set("redirect_uri", runtime.config.X_REDIRECT_URI);
  url.searchParams.set("scope", scopeSet.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return {
    url: url.toString(),
    state,
    verifier
  };
}

export async function exchangeCodeForToken(code: string, verifier: string) {
  const runtime = getWebRuntime();

  if (!runtime.config.X_CLIENT_ID || !runtime.config.X_REDIRECT_URI) {
    throw new Error("X OAuth is not configured");
  }

  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded"
  });

  if (runtime.config.X_CLIENT_SECRET) {
    const basic = Buffer.from(
      `${runtime.config.X_CLIENT_ID}:${runtime.config.X_CLIENT_SECRET}`
    ).toString("base64");
    headers.set("Authorization", `Basic ${basic}`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: runtime.config.X_REDIRECT_URI,
    code_verifier: verifier,
    client_id: runtime.config.X_CLIENT_ID
  });

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    scopes: payload.scope?.split(" ").filter(Boolean) ?? scopeSet,
    expiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : undefined
  };
}

export async function fetchCurrentXUser(accessToken: string) {
  const response = await fetch(
    "https://api.x.com/2/users/me?user.fields=profile_image_url,verified",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Unable to fetch current X user: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as {
    data?: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
      verified?: boolean;
    };
  };

  if (!payload.data) {
    throw new Error("X user payload is missing data");
  }

  return payload.data;
}

export function getOauthCookieNames() {
  return {
    stateCookieName,
    verifierCookieName
  };
}
