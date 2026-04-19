import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const runtime = getWebRuntime();
  const store = await cookies();
  const sessionToken = store.get(runtime.config.BARTER_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await runtime.repository.revokeAuthSession(sessionToken);
  }

  await clearSessionCookie();

  return NextResponse.redirect(new URL("/", runtime.config.BARTER_BASE_URL));
}
