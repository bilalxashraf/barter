import { agenticMarketplaceConfig } from "@/modules/agentic-marketplace/config";
import type {
  AgenticMarketplaceCategory,
  AgenticMarketplaceFilters,
  AgenticMarketplaceService,
  AgenticMarketplaceSnapshot,
  AgenticMarketplaceStats,
  AgenticMarketplaceStatus,
} from "@/modules/agentic-marketplace/contracts";
import { fallbackMarketplaceServices } from "@/modules/agentic-marketplace/fallback";
import { getLiveFeedSnapshot } from "@/modules/live-feed/service";

type JsonRecord = Record<string, unknown>;

type BazaarDataset = {
  items: AgenticMarketplaceService[];
  totalResources: number;
  scannedResources: number;
  status: AgenticMarketplaceStatus;
  fetchedAt: string;
};

type DatasetCache = {
  fetchedAtMs: number;
  dataset: BazaarDataset | null;
  inFlight: Promise<BazaarDataset> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __barterMarketplaceDatasetCache: DatasetCache | undefined;
}

const networkLabels: Record<string, string> = {
  base: "Base",
  "base-sepolia": "Base Sepolia",
  ethereum: "Ethereum",
  polygon: "Polygon",
  solana: "Solana",
  "solana-devnet": "Solana Devnet",
};

const categoryLabels: Record<Exclude<AgenticMarketplaceCategory, "all">, string> = {
  data: "Data",
  search: "Search",
  social: "Social",
  media: "Media",
  inference: "Inference",
  infrastructure: "Infrastructure",
  trading: "Trading",
  other: "Other",
};

function getCache() {
  if (!globalThis.__barterMarketplaceDatasetCache) {
    globalThis.__barterMarketplaceDatasetCache = {
      fetchedAtMs: 0,
      dataset: null,
      inFlight: null,
    };
  }

  return globalThis.__barterMarketplaceDatasetCache;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toWords(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatUsdMicros(value: string | null) {
  if (!value) return "Usage priced per call";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Usage priced per call";
  const dollars = parsed / 1_000_000;
  return `Up to $${dollars.toLocaleString("en-US", {
    minimumFractionDigits: dollars < 1 ? 2 : 2,
    maximumFractionDigits: 4,
  })}`;
}

function cleanDescription(value: string | null) {
  if (!value) return "x402-compatible service discovered from the Bazaar.";
  return value.replace(/\|\s*Powered by\s+[^|]+$/i, "").replace(/\s+/g, " ").trim();
}

function extractProviderName(description: string | null, host: string) {
  const match = description?.match(/\|\s*Powered by\s+(.+)$/i);
  if (match) return match[1].trim();

  const hostParts = host.split(".");
  if (hostParts.length >= 2) {
    return toTitleCase(hostParts[hostParts.length - 2]);
  }

  return "Unknown";
}

function inferCategory(text: string): Exclude<AgenticMarketplaceCategory, "all"> {
  const value = text.toLowerCase();

  if (/(video|image|audio|speech|tts|voice|media|avatar|visual|multimodal)/.test(value)) {
    return "media";
  }

  if (/(twitter|social|telegram|discord|mentions|post|reply|retweet|engagement)/.test(value)) {
    return "social";
  }

  if (/(scrape|extract|crawl|browser|search|query|web page|webpages|research|discover)/.test(value)) {
    return "search";
  }

  if (/(stock|market data|weather|price|feed|history|real-time|real time|signal|quote|intelligence data|dataset)/.test(value)) {
    return "data";
  }

  if (/(trade|trader|token|defi|pool|nft|swap|alpha|portfolio|whale)/.test(value)) {
    return "trading";
  }

  if (/(inference|model|llm|ai platform|completion|prompt|chat agent)/.test(value)) {
    return "inference";
  }

  if (/(browser automation|automation|wallet|server|infrastructure|proxy|security|managed)/.test(value)) {
    return "infrastructure";
  }

  return "other";
}

function buildTitle(url: URL, description: string) {
  const segments = url.pathname.split("/").filter(Boolean);
  const qrnSegments = segments.filter((segment) => !segment.startsWith("qrn:") && segment !== "x402");
  const candidate = qrnSegments.at(-2) || qrnSegments.at(-1) || url.host;

  if (
    description &&
    description.length <= 80 &&
    !/^personal use$/i.test(description) &&
    !/^marketer$/i.test(description) &&
    !/^researcher$/i.test(description) &&
    !/^new\s+\w+$/i.test(description)
  ) {
    return description;
  }

  return toTitleCase(toWords(candidate.replace(/\.[a-z]{2,}$/i, "")));
}

function buildOperationName(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  if (!last || last.startsWith("qrn:")) return null;
  return toTitleCase(toWords(last));
}

function agentReady(accept: JsonRecord) {
  const outputSchema = isRecord(accept.outputSchema) ? accept.outputSchema : null;
  const input = outputSchema && isRecord(outputSchema.input) ? outputSchema.input : null;
  return Boolean(input && input.discoverable);
}

function normalizeService(raw: unknown): AgenticMarketplaceService | null {
  if (!isRecord(raw)) return null;

  const resourceUrl = asString(raw.resource);
  if (!resourceUrl) return null;

  let url: URL;
  try {
    url = new URL(resourceUrl);
  } catch {
    return null;
  }

  const accepts = Array.isArray(raw.accepts) ? raw.accepts.filter(isRecord) : [];
  const accept = accepts[0];
  if (!accept) return null;

  const rawDescription = asString(accept.description);
  const description = cleanDescription(rawDescription);
  const host = url.host;
  const category = inferCategory(`${description} ${resourceUrl}`);
  const title = buildTitle(url, description);
  const operationName = buildOperationName(url);
  const network = asString(accept.network);

  const paymentAsset =
    (isRecord(accept.extra) ? asString(accept.extra.name) : null) ||
    (asString(accept.asset)?.includes("USDC") ? "USDC" : null);

  const providerName = extractProviderName(rawDescription, host);
  const searchText = [
    title,
    operationName,
    description,
    host,
    providerName,
    category,
    network,
    paymentAsset,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: `${resourceUrl}:${asString(accept.payTo) || "unknown"}`,
    title,
    operationName,
    description,
    category,
    categoryLabel: categoryLabels[category],
    network,
    networkLabel: network ? networkLabels[network] || toTitleCase(network.replace(/-/g, " ")) : "Unknown network",
    host,
    providerName,
    resourceUrl,
    method: asString(isRecord(accept.outputSchema) && isRecord(accept.outputSchema.input) ? accept.outputSchema.input.method : null) || "GET",
    scheme: asString(accept.scheme) || "exact",
    paymentAsset,
    payTo: asString(accept.payTo),
    maxAmountRequired: asString(accept.maxAmountRequired),
    priceLabel: formatUsdMicros(asString(accept.maxAmountRequired)),
    agentReady: agentReady(accept),
    liveTapeMentions: 0,
    searchText,
  };
}

function scoreService(item: AgenticMarketplaceService, query: string) {
  if (!query) {
    return item.liveTapeMentions * 10 + (item.agentReady ? 3 : 0);
  }

  const loweredQuery = query.toLowerCase();
  let score = item.liveTapeMentions * 10 + (item.agentReady ? 3 : 0);

  if (item.title.toLowerCase().includes(loweredQuery)) score += 18;
  if ((item.operationName || "").toLowerCase().includes(loweredQuery)) score += 12;
  if (item.description.toLowerCase().includes(loweredQuery)) score += 10;
  if (item.host.toLowerCase().includes(loweredQuery)) score += 8;
  if (item.providerName.toLowerCase().includes(loweredQuery)) score += 6;

  return score;
}

async function fetchBazaarPage(offset: number, limit: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), agenticMarketplaceConfig.upstreamTimeoutMs);

  try {
    const url = new URL(agenticMarketplaceConfig.upstreamBaseUrl);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bazaar request failed with ${response.status}`);
    }

    const payload = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.items) || !isRecord(payload.pagination)) {
      throw new Error("Bazaar payload shape changed");
    }

    return payload as {
      items: unknown[];
      pagination: {
        total?: number;
      };
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createStats(items: AgenticMarketplaceService[], dataset: BazaarDataset): AgenticMarketplaceStats {
  return {
    totalResources: dataset.totalResources,
    scannedResources: dataset.scannedResources,
    visibleResults: items.length,
    distinctNetworks: new Set(items.map((item) => item.networkLabel)).size,
    distinctCategories: new Set(items.map((item) => item.category)).size,
    liveTapeHits: items.filter((item) => item.liveTapeMentions > 0).length,
    sourceLabel: "Coinbase x402 Bazaar",
  };
}

async function fetchDataset(): Promise<BazaarDataset> {
  try {
    const pages = await Promise.all(
      Array.from({ length: agenticMarketplaceConfig.pageCount }, (_, index) =>
        fetchBazaarPage(index * agenticMarketplaceConfig.pageSize, agenticMarketplaceConfig.pageSize)
      )
    );

    const totalResources = pages[0]?.pagination?.total ?? 0;
    const rawItems = pages.flatMap((page) => page.items);
    const deduped = new Map<string, AgenticMarketplaceService>();

    for (const rawItem of rawItems) {
      const normalized = normalizeService(rawItem);
      if (normalized) {
        deduped.set(normalized.id, normalized);
      }
    }

    const liveFeed = await getLiveFeedSnapshot({ limit: 80 });
    const hostCounts = new Map<string, number>();
    for (const item of liveFeed.items) {
      const host = item.metadata.serviceHost;
      if (!host) continue;
      hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
    }

    const items = Array.from(deduped.values()).map((item) => ({
      ...item,
      liveTapeMentions: hostCounts.get(item.host) || 0,
    }));

    items.sort((left, right) => scoreService(right, "") - scoreService(left, ""));

    return {
      items,
      totalResources,
      scannedResources: items.length,
      status: "live",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Agentic marketplace fetch failed:", error);

    return {
      items: fallbackMarketplaceServices,
      totalResources: fallbackMarketplaceServices.length,
      scannedResources: fallbackMarketplaceServices.length,
      status: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }
}

async function getDataset() {
  const cache = getCache();

  if (
    cache.dataset &&
    Date.now() - cache.fetchedAtMs < agenticMarketplaceConfig.cacheTtlMs
  ) {
    return cache.dataset;
  }

  if (!cache.inFlight) {
    cache.inFlight = fetchDataset().finally(() => {
      cache.inFlight = null;
    });
  }

  const dataset = await cache.inFlight;
  cache.dataset = dataset;
  cache.fetchedAtMs = Date.now();
  return dataset;
}

function filterItems(items: AgenticMarketplaceService[], filters: AgenticMarketplaceFilters) {
  const query = filters.query.trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const filtered = items.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.network && filters.network !== "all" && item.network !== filters.network) return false;
    if (!tokens.length) return true;
    return tokens.every((token) => item.searchText.includes(token));
  });

  filtered.sort((left, right) => scoreService(right, query) - scoreService(left, query));

  return filtered.slice(0, filters.limit);
}

export async function getAgenticMarketplaceSnapshot(
  filters?: Partial<AgenticMarketplaceFilters>
): Promise<AgenticMarketplaceSnapshot> {
  const dataset = await getDataset();
  const resolvedFilters: AgenticMarketplaceFilters = {
    query: filters?.query?.trim() || "",
    category: filters?.category || "all",
    network: filters?.network || "all",
    limit: Math.min(Math.max(filters?.limit || agenticMarketplaceConfig.defaultLimit, 1), 40),
  };

  const items = filterItems(dataset.items, resolvedFilters);

  return {
    items,
    stats: createStats(items, dataset),
    filters: resolvedFilters,
    status: dataset.status,
    fetchedAt: dataset.fetchedAt,
  };
}
