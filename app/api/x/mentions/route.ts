import { NextResponse } from "next/server";
import { getXMentions } from "../../../_lib/xMentions";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function GET() {
  try {
    const payload = await getXMentions();
    return NextResponse.json(payload, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[X mentions] Route error", error);
    return NextResponse.json(
      {
        enabled: false,
        mentions: [],
        profileUrl: "https://x.com/barterpayments",
        searchUrl: "https://x.com/search?q=%40barterpayments&src=typed_query&f=live",
        username: "barterpayments",
        fetchedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  }
}
