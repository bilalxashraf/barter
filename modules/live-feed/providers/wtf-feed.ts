import type { LiveFeedItem, LiveFeedMoney, LiveFeedProvider } from "@/modules/live-feed/contracts";
import { liveFeedConfig } from "@/modules/live-feed/config";

type JsonRecord = Record<string, unknown>;

const networkLabels: Record<string, string> = {
  "eip155:1": "Ethereum",
  "eip155:10": "Optimism",
  "eip155:8453": "Base",
  "eip155:42161": "Arbitrum",
  "solana:mainnet": "Solana",
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function titleCase(value: string | null, fallback = "Unknown") {
  if (!value) return fallback;

  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function asIsoDate(value: unknown, fallback: string) {
  const raw = asString(value);
  if (!raw) return fallback;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function formatMoney(rawAmount: number | null, currency: string | null): LiveFeedMoney {
  const resolvedCurrency = (currency || "USD").toUpperCase();

  if (rawAmount === null) {
    return {
      rawAmount: null,
      currency: resolvedCurrency,
      formatted: "Price on request",
      scale: "unknown",
    };
  }

  if (resolvedCurrency === "USD") {
    const dollars = rawAmount / 1_000_000;
    const minimumFractionDigits = dollars < 1 ? 4 : 2;
    return {
      rawAmount,
      currency: resolvedCurrency,
      formatted: `$${dollars.toLocaleString("en-US", {
        minimumFractionDigits,
        maximumFractionDigits: 4,
      })}`,
      scale: "usd-micros",
    };
  }

  return {
    rawAmount,
    currency: resolvedCurrency,
    formatted: `${rawAmount.toLocaleString("en-US")} ${resolvedCurrency}`,
    scale: "decimal",
  };
}

function safeHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function normalizeFeedItem(raw: unknown): LiveFeedItem | null {
  if (!isRecord(raw)) return null;

  const metadata = isRecord(raw.metadata) ? raw.metadata : {};
  const now = new Date().toISOString();
  const txHash = asString(metadata.tx_hash);
  const logIndex = asNumber(metadata.log_index);
  const itemName = asString(raw.item_name) || asString(metadata.service_description) || "Unknown service";
  const serviceUrl = asString(metadata.service_url);
  const currency = asString(raw.currency);
  const rawPrice = asNumber(raw.price);

  const id =
    asString(raw.id) ||
    [txHash, logIndex ?? "", itemName].filter(Boolean).join(":") ||
    globalThis.crypto.randomUUID();

  return {
    id,
    agentMaskedId: asString(raw.agent_masked_id) || "ag***nt",
    category: asString(raw.category) || "uncategorized",
    categoryLabel: titleCase(asString(raw.category), "Uncategorized"),
    itemName,
    commentary:
      asString(raw.commentary) ||
      `Bought ${itemName} to finish a payment-driven agent task.`,
    money: formatMoney(rawPrice, currency),
    source: asString(raw.source) || "x402",
    sourceLabel: titleCase(asString(raw.source), "x402"),
    transactionAt: asIsoDate(raw.transaction_at ?? metadata.block_timestamp, now),
    displayedAt: asIsoDate(raw.displayed_at, now),
    ingestedAt: asIsoDate(raw.ingested_at, now),
    queuedAt: asString(raw.queued_at),
    metadata: {
      facilitatorName: asString(metadata.facilitator_name),
      networkId: asString(metadata.network),
      networkLabel: networkLabels[asString(metadata.network) || ""] || asString(metadata.network),
      payer: asString(metadata.payer),
      recipient: asString(metadata.recipient),
      serviceUrl,
      serviceHost: safeHost(serviceUrl),
      txHash,
    },
  };
}

export const wtfFeedProvider: LiveFeedProvider = {
  id: "wtf",
  label: "Public x402 feed",
  async fetchSnapshot({ limit }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), liveFeedConfig.upstreamTimeoutMs);

    try {
      const url = new URL("/v1/api/feeds", liveFeedConfig.upstreamBaseUrl);
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Upstream feed request failed with ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error("Upstream feed returned a non-array payload");
      }

      const deduped = new Map<string, LiveFeedItem>();
      for (const entry of payload) {
        const normalized = normalizeFeedItem(entry);
        if (normalized) {
          deduped.set(normalized.id, normalized);
        }
      }

      return Array.from(deduped.values()).sort(
        (left, right) => Date.parse(right.displayedAt) - Date.parse(left.displayedAt)
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
