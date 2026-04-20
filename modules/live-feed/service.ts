import type { LiveFeedItem, LiveFeedSnapshot, LiveFeedStats, LiveFeedStatus } from "@/modules/live-feed/contracts";
import { liveFeedConfig } from "@/modules/live-feed/config";
import { getFallbackLiveFeedProvider, getSelectedLiveFeedProvider } from "@/modules/live-feed/provider";

type SnapshotCache = {
  snapshot: LiveFeedSnapshot | null;
  fetchedAtMs: number;
  inFlight: Promise<LiveFeedSnapshot> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __barterLiveFeedCache: SnapshotCache | undefined;
}

function getCache(): SnapshotCache {
  if (!globalThis.__barterLiveFeedCache) {
    globalThis.__barterLiveFeedCache = {
      snapshot: null,
      fetchedAtMs: 0,
      inFlight: null,
    };
  }

  return globalThis.__barterLiveFeedCache;
}

function buildStats(items: LiveFeedItem[], providerLabel: string, totalItems24hOverride?: number): LiveFeedStats {
  const categories = new Set(items.map((item) => item.category)).size;
  const newestTransactionAt = items.length ? items[0].transactionAt : null;

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const totalItems24h = totalItems24hOverride ?? items.filter((item) => Date.parse(item.transactionAt) >= cutoff).length;

  return {
    visibleItems: items.length,
    categories,
    newestTransactionAt,
    refreshCadenceMs: liveFeedConfig.pollIntervalMs,
    providerLabel,
    totalItems24h,
  };
}

function createSnapshot(items: LiveFeedItem[], providerLabel: string, status: LiveFeedStatus): LiveFeedSnapshot {
  const sorted = [...items].sort(
    (left, right) => Date.parse(right.displayedAt) - Date.parse(left.displayedAt)
  );

  return {
    items: sorted,
    stats: buildStats(sorted, providerLabel),
    status,
    fetchedAt: new Date().toISOString(),
  };
}

function trimSnapshot(snapshot: LiveFeedSnapshot, limit: number): LiveFeedSnapshot {
  const items = snapshot.items.slice(0, limit);

  return {
    ...snapshot,
    items,
    stats: buildStats(items, snapshot.stats.providerLabel),
  };
}

async function fetchFreshSnapshot(limit: number) {
  const cache = getCache();
  const selectedProvider = getSelectedLiveFeedProvider();

  try {
    const items = await selectedProvider.fetchSnapshot({ limit });
    const status = selectedProvider.id === "mock" ? "fallback" : "live";
    const snapshot = createSnapshot(items, selectedProvider.label, status);
    cache.snapshot = snapshot;
    cache.fetchedAtMs = Date.now();
    return snapshot;
  } catch (error) {
    console.error("Live feed fetch failed:", error);

    if (cache.snapshot) {
      return {
        ...cache.snapshot,
        status: "stale" as const,
      };
    }

    const fallbackProvider = getFallbackLiveFeedProvider();
    const items = await fallbackProvider.fetchSnapshot({ limit });
    const snapshot = createSnapshot(items, fallbackProvider.label, "fallback");
    cache.snapshot = snapshot;
    cache.fetchedAtMs = Date.now();
    return snapshot;
  }
}

export async function getLiveFeedSnapshot({
  limit = liveFeedConfig.snapshotLimit,
  forceRefresh = false,
}: {
  limit?: number;
  forceRefresh?: boolean;
} = {}) {
  const cache = getCache();
  const resolvedLimit = Math.min(Math.max(limit, 1), 40);

  // Keep the cache window short so SSR, JSON, and SSE consumers share the same upstream read.
  if (
    !forceRefresh &&
    cache.snapshot &&
    Date.now() - cache.fetchedAtMs < liveFeedConfig.cacheTtlMs
  ) {
    return trimSnapshot(cache.snapshot, resolvedLimit);
  }

  if (!cache.inFlight) {
    cache.inFlight = fetchFreshSnapshot(Math.max(resolvedLimit, liveFeedConfig.snapshotLimit)).finally(
      () => {
        cache.inFlight = null;
      }
    );
  }

  const snapshot = await cache.inFlight;
  return trimSnapshot(snapshot, resolvedLimit);
}
