export type LiveFeedStatus = "live" | "stale" | "fallback";

export type LiveFeedMoneyScale = "usd-micros" | "decimal" | "unknown";

export type LiveFeedMoney = {
  rawAmount: number | null;
  currency: string;
  formatted: string;
  scale: LiveFeedMoneyScale;
};

export type LiveFeedMetadata = {
  facilitatorName: string | null;
  networkId: string | null;
  networkLabel: string | null;
  payer: string | null;
  recipient: string | null;
  serviceUrl: string | null;
  serviceHost: string | null;
  txHash: string | null;
};

export type LiveFeedItem = {
  id: string;
  agentMaskedId: string;
  category: string;
  categoryLabel: string;
  itemName: string;
  commentary: string;
  money: LiveFeedMoney;
  source: string;
  sourceLabel: string;
  transactionAt: string;
  displayedAt: string;
  ingestedAt: string;
  queuedAt: string | null;
  metadata: LiveFeedMetadata;
};

export type LiveFeedStats = {
  visibleItems: number;
  categories: number;
  newestTransactionAt: string | null;
  refreshCadenceMs: number;
  providerLabel: string;
  totalItems24h: number;
};

export type LiveFeedSnapshot = {
  items: LiveFeedItem[];
  stats: LiveFeedStats;
  status: LiveFeedStatus;
  fetchedAt: string;
};

export type LiveFeedProvider = {
  id: string;
  label: string;
  fetchSnapshot(options: { limit: number }): Promise<LiveFeedItem[]>;
};

export type LiveFeedSnapshotEvent = {
  type: "snapshot";
  snapshot: LiveFeedSnapshot;
  viewerCount: number;
};

export type LiveFeedAppendEvent = {
  type: "append";
  items: LiveFeedItem[];
  stats: LiveFeedStats;
  status: LiveFeedStatus;
  fetchedAt: string;
  viewerCount: number;
};

export type LiveFeedPulseEvent = {
  type: "pulse";
  stats: LiveFeedStats;
  status: LiveFeedStatus;
  fetchedAt: string;
  viewerCount: number;
};

export type LiveFeedPresenceEvent = {
  type: "presence";
  viewerCount: number;
};

export type LiveFeedStreamEvent =
  | LiveFeedSnapshotEvent
  | LiveFeedAppendEvent
  | LiveFeedPulseEvent
  | LiveFeedPresenceEvent;
