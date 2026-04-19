import { NextResponse } from "next/server";
import { getXPosts } from "../../../_lib/xMentions";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function GET() {
  try {
    const payload = await getXPosts();
    return NextResponse.json(payload, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("[X posts] Route error", error);
    return NextResponse.json(
      {
        enabled: false,
        posts: [],
        profileUrl: "https://x.com/barterpayments",
        username: "barterpayments",
        fetchedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  }
}
