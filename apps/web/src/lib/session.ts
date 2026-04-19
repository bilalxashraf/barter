import { getSessionCookieName, isProduction } from "@barter/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getWebRuntime } from "./server";

export async function getCurrentSession() {
  const store = await cookies();
  const sessionToken = store.get(getSessionCookieName())?.value;

  if (!sessionToken) {
    return null;
  }

  return getWebRuntime().repository.getAuthSession(sessionToken);
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  return session;
}

export async function setSessionCookie(session: {
  sessionToken: string;
  expiresAt: string;
}) {
  const store = await cookies();
  store.set(getSessionCookieName(), session.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    expires: new Date(session.expiresAt)
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(getSessionCookieName());
}
