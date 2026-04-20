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

export const agenticMarketplaceConfig = {
  upstreamBaseUrl:
    process.env.AGENTIC_MARKETPLACE_UPSTREAM_BASE_URL ||
    "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources",
  cacheTtlMs: intFromEnv("AGENTIC_MARKETPLACE_CACHE_TTL_MS", 60_000, 10_000, 5 * 60_000),
  upstreamTimeoutMs: intFromEnv("AGENTIC_MARKETPLACE_TIMEOUT_MS", 8_000, 1_000, 30_000),
  pageSize: intFromEnv("AGENTIC_MARKETPLACE_PAGE_SIZE", 24, 10, 50),
  pageCount: intFromEnv("AGENTIC_MARKETPLACE_PAGE_COUNT", 5, 1, 10),
  defaultLimit: intFromEnv("AGENTIC_MARKETPLACE_DEFAULT_LIMIT", 12, 6, 30),
  searchLimit: intFromEnv("AGENTIC_MARKETPLACE_SEARCH_LIMIT", 18, 6, 40),
};
