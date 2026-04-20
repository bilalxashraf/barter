export type AgenticMarketplaceStatus = "live" | "degraded" | "fallback";

export type AgenticMarketplaceCategory =
  | "all"
  | "data"
  | "search"
  | "social"
  | "media"
  | "inference"
  | "infrastructure"
  | "trading"
  | "other";

export type AgenticMarketplaceService = {
  id: string;
  title: string;
  operationName: string | null;
  description: string;
  category: Exclude<AgenticMarketplaceCategory, "all">;
  categoryLabel: string;
  network: string | null;
  networkLabel: string;
  host: string;
  providerName: string;
  resourceUrl: string;
  method: string;
  scheme: string;
  paymentAsset: string | null;
  payTo: string | null;
  maxAmountRequired: string | null;
  priceLabel: string;
  agentReady: boolean;
  liveTapeMentions: number;
  searchText: string;
};

export type AgenticMarketplaceStats = {
  totalResources: number;
  scannedResources: number;
  visibleResults: number;
  distinctNetworks: number;
  distinctCategories: number;
  liveTapeHits: number;
  sourceLabel: string;
};

export type AgenticMarketplaceFilters = {
  query: string;
  category: AgenticMarketplaceCategory;
  network: string;
  limit: number;
};

export type AgenticMarketplaceSnapshot = {
  items: AgenticMarketplaceService[];
  stats: AgenticMarketplaceStats;
  filters: AgenticMarketplaceFilters;
  status: AgenticMarketplaceStatus;
  fetchedAt: string;
};
