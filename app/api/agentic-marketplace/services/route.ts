import { NextRequest, NextResponse } from "next/server";
import type { AgenticMarketplaceCategory } from "@/modules/agentic-marketplace/contracts";
import { getAgenticMarketplaceSnapshot } from "@/modules/agentic-marketplace/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const category = (req.nextUrl.searchParams.get("category") || "all") as AgenticMarketplaceCategory;
  const network = req.nextUrl.searchParams.get("network") || "all";
  const rawLimit = req.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

  try {
    const snapshot = await getAgenticMarketplaceSnapshot({
      query,
      category,
      network,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    return NextResponse.json(
      { snapshot },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Agentic marketplace API error:", error);
    return NextResponse.json(
      { error: "Failed to load agentic marketplace." },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
