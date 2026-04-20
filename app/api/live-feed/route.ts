import { NextRequest, NextResponse } from "next/server";
import { getLiveFeedHub } from "@/modules/live-feed/hub";
import { getLiveFeedSnapshot } from "@/modules/live-feed/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function GET(req: NextRequest) {
  const rawLimit = req.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

  try {
    const snapshot = await getLiveFeedSnapshot({
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(
      {
        snapshot,
        viewerCount: getLiveFeedHub().getViewerCount(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Live feed snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to load live feed." },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
