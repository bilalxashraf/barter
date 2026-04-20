import type { LiveFeedProvider } from "@/modules/live-feed/contracts";
import { liveFeedConfig } from "@/modules/live-feed/config";
import { mockFeedProvider } from "@/modules/live-feed/providers/mock-feed";
import { wtfFeedProvider } from "@/modules/live-feed/providers/wtf-feed";

const providers: Record<string, LiveFeedProvider> = {
  mock: mockFeedProvider,
  wtf: wtfFeedProvider,
};

export function getSelectedLiveFeedProvider() {
  return providers[liveFeedConfig.provider] ?? wtfFeedProvider;
}

export function getFallbackLiveFeedProvider() {
  return mockFeedProvider;
}
