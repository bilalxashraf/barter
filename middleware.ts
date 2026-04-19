import { NextResponse, type NextRequest } from "next/server";
import { isWaitlistOnlyMode } from "./app/_lib/appMode";

const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/apple-icon",
  "/opengraph-image",
  "/twitter-image",
  "/BarterPaymentLogo.png",
]);

const PUBLIC_API_PREFIXES = ["/api/metrics", "/api/waitlist"];

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(req: NextRequest) {
  if (!isWaitlistOnlyMode()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/:path*"],
};
