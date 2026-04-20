import { HomePageClient } from "@/app/components/HomePageClient";
import { getAgenticMarketplaceSnapshot } from "@/modules/agentic-marketplace/service";
import { getLiveFeedSnapshot } from "@/modules/live-feed/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const [initialLiveFeed, initialMarketplace] = await Promise.all([
    getLiveFeedSnapshot(),
    getAgenticMarketplaceSnapshot(),
  ]);

  return (
    <HomePageClient
      initialLiveFeed={initialLiveFeed}
      initialMarketplace={initialMarketplace}
    />
  );
}
