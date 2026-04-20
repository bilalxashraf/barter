function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function intFromEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function providerFromEnv() {
  const raw = process.env.LIVE_FEED_PROVIDER?.trim().toLowerCase();
  if (raw === "mock") return "mock";
  return "wtf";
}

export const liveFeedConfig = {
  provider: providerFromEnv(),
  upstreamBaseUrl: process.env.LIVE_FEED_UPSTREAM_BASE_URL || "https://wtfareagentsbuying.com",
  snapshotLimit: intFromEnv("LIVE_FEED_SNAPSHOT_LIMIT", 14, 6, 40),
  pollIntervalMs: intFromEnv("LIVE_FEED_POLL_INTERVAL_MS", 5000, 2000, 60000),
  cacheTtlMs: intFromEnv("LIVE_FEED_CACHE_TTL_MS", 3000, 1000, 20000),
  upstreamTimeoutMs: intFromEnv("LIVE_FEED_UPSTREAM_TIMEOUT_MS", 8000, 1000, 30000),
};
