import { NextRequest, NextResponse } from "next/server";
import { getSiteMetrics, recordVisit } from "../../_lib/siteMetrics";

const VISITOR_COOKIE = "barter_visitor_id";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function GET() {
  try {
    const metrics = await getSiteMetrics();
    return NextResponse.json({ metrics }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("Metrics read error:", error);
    return NextResponse.json({ error: "Failed to load metrics." }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
    const result = await recordVisit({
      userAgent: req.headers.get("user-agent") ?? undefined,
      visitorId,
    });

    const res = NextResponse.json(
      {
        metrics: result.metrics,
        counted: result.counted,
        isUniqueVisitor: result.isUniqueVisitor,
      },
      { headers: noStoreHeaders() }
    );

    if (!visitorId && result.visitorId) {
      res.cookies.set(VISITOR_COOKIE, result.visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (error) {
    console.error("Metrics record error:", error);
    return NextResponse.json({ error: "Failed to record visit." }, { status: 500, headers: noStoreHeaders() });
  }
}
