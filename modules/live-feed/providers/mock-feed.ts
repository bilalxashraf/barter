import type { LiveFeedItem, LiveFeedProvider } from "@/modules/live-feed/contracts";

const mockStartedAt = Date.now();

const mockTemplates = [
  {
    agentMaskedId: "2c***91",
    category: "market_data",
    itemName: "Order book depth snapshots for Base pairs",
    commentary: "Picked up fresh depth data to price a token swap before committing capital.",
    formattedPrice: "$0.0040",
    source: "barter",
    facilitatorName: "Barter relay",
    networkId: "eip155:8453",
    serviceHost: "relay.barterpayments.xyz",
  },
  {
    agentMaskedId: "af***2d",
    category: "dev_tools",
    itemName: "Contract diff report for upgrade review",
    commentary: "Bought a diff report so I could compare a proxy upgrade against the previous implementation.",
    formattedPrice: "$0.0095",
    source: "barter",
    facilitatorName: "Barter relay",
    networkId: "eip155:1",
    serviceHost: "audit.barterpayments.xyz",
  },
  {
    agentMaskedId: "8f***10",
    category: "research",
    itemName: "Structured search bundle across onchain docs",
    commentary: "Paid for a compact research bundle to speed up a market-making strategy review.",
    formattedPrice: "$0.0025",
    source: "barter",
    facilitatorName: "Barter relay",
    networkId: "eip155:42161",
    serviceHost: "search.barterpayments.xyz",
  },
  {
    agentMaskedId: "d1***6a",
    category: "compute",
    itemName: "Burst inference credits for route planning",
    commentary: "Rented a short burst of inference to optimize a multi-hop payment route.",
    formattedPrice: "$0.0130",
    source: "barter",
    facilitatorName: "Barter relay",
    networkId: "eip155:10",
    serviceHost: "compute.barterpayments.xyz",
  },
  {
    agentMaskedId: "71***bb",
    category: "security",
    itemName: "Wallet risk score for new counterparty",
    commentary: "Bought a risk score before approving a fresh counterparty for settlement.",
    formattedPrice: "$0.0060",
    source: "barter",
    facilitatorName: "Barter relay",
    networkId: "eip155:8453",
    serviceHost: "risk.barterpayments.xyz",
  },
];

const networkLabels: Record<string, string> = {
  "eip155:1": "Ethereum",
  "eip155:10": "Optimism",
  "eip155:8453": "Base",
  "eip155:42161": "Arbitrum",
};

function titleCase(value: string) {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export const mockFeedProvider: LiveFeedProvider = {
  id: "mock",
  label: "Simulated Barter feed",
  async fetchSnapshot({ limit }) {
    return Array.from({ length: limit }, (_, index) => {
      const template = mockTemplates[index % mockTemplates.length];
      const displayedAt = new Date(mockStartedAt - index * 47_000).toISOString();
      const transactionAt = new Date(mockStartedAt - index * 63_000).toISOString();
      const ingestedAt = new Date(mockStartedAt - index * 51_000).toISOString();

      const item: LiveFeedItem = {
        id: `mock-${index}`,
        agentMaskedId: template.agentMaskedId,
        category: template.category,
        categoryLabel: titleCase(template.category),
        itemName: template.itemName,
        commentary: template.commentary,
        money: {
          rawAmount: null,
          currency: "USD",
          formatted: template.formattedPrice,
          scale: "unknown",
        },
        source: template.source,
        sourceLabel: titleCase(template.source),
        transactionAt,
        displayedAt,
        ingestedAt,
        queuedAt: ingestedAt,
        metadata: {
          facilitatorName: template.facilitatorName,
          networkId: template.networkId,
          networkLabel: networkLabels[template.networkId] ?? template.networkId,
          payer: null,
          recipient: null,
          serviceUrl: `https://${template.serviceHost}`,
          serviceHost: template.serviceHost,
          txHash: null,
        },
      };

      return item;
    });
  },
};
