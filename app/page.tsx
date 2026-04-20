import { HomePageClient } from "@/app/components/HomePageClient";
import { getLiveFeedSnapshot } from "@/modules/live-feed/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const initialLiveFeed = await getLiveFeedSnapshot();

  return <HomePageClient initialLiveFeed={initialLiveFeed} />;
}
