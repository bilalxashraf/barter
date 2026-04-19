import { getMarketplaceApiBaseUrl } from '../api/marketplace/_lib';

type PricingModel = 'fixed' | 'quote' | 'subscription' | 'usage';
type SupportedChain = 'solana' | 'base';

type MarketplaceAgentProfile = {
  agentId: string;
  displayName: string;
  settlementChain: string;
  settlementWalletNo: number;
  settlementAddress: string;
  headline?: string;
  bio?: string;
  supportedChains: string[];
  acceptedTokens: string[];
  capabilityTags: string[];
  pricingModel?: PricingModel;
  public: boolean;
  active: boolean;
  metadata?: Record<string, unknown>;
};

type MarketplaceAgentRecord = {
  profile: MarketplaceAgentProfile;
  services?: unknown[];
};

type SyncMarketplaceAgentInput = {
  agentId: string;
  apiKey: string;
  username: string;
  chain: SupportedChain;
  walletNo: number;
};

type SyncMarketplaceAgentResult = {
  state: 'created' | 'updated' | 'exists';
  profile: MarketplaceAgentProfile;
};

function toErrorMessage(fallback: string, payload: any, status: number) {
  return payload?.error?.message || payload?.message || `${fallback} (${status})`;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: {
        message: text,
      },
    };
  }
}

async function getMarketplaceAgent(agentId: string): Promise<MarketplaceAgentRecord | null> {
  const response = await fetch(
    `${getMarketplaceApiBaseUrl()}/marketplace/agents/${encodeURIComponent(agentId)}`,
    {
      cache: 'no-store',
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(toErrorMessage('Failed to load marketplace agent', payload, response.status));
  }

  return (await readJson(response)) as MarketplaceAgentRecord;
}

function uniqueLower(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function uniqueUpper(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))];
}

function defaultAcceptedTokens(chain: SupportedChain) {
  return chain === 'solana' ? ['USDC', 'SOL'] : ['USDC', 'ETH'];
}

function buildRegistrationPayload(
  input: SyncMarketplaceAgentInput,
  existing: MarketplaceAgentProfile | null
) {
  return {
    agentId: input.agentId,
    displayName: existing?.displayName || `@${input.username}`,
    chain: input.chain,
    walletNo: input.walletNo,
    headline: existing?.headline || 'Barter account connected via X',
    bio: existing?.bio || `Connected via Barter as @${input.username}.`,
    supportedChains: uniqueLower([...(existing?.supportedChains || []), input.chain]),
    acceptedTokens: uniqueUpper([
      ...(existing?.acceptedTokens || []),
      ...defaultAcceptedTokens(input.chain),
    ]),
    capabilityTags: uniqueLower([
      ...(existing?.capabilityTags || []),
      'barter',
      'payments',
      'automation',
    ]),
    pricingModel: existing?.pricingModel || 'quote',
    public: existing?.public ?? true,
    active: true,
    metadata: {
      ...(existing?.metadata || {}),
      source: 'barter',
      xUsername: input.username,
    },
  };
}

export async function upsertMarketplaceAgentProfile(
  input: SyncMarketplaceAgentInput
): Promise<SyncMarketplaceAgentResult> {
  const existingRecord = await getMarketplaceAgent(input.agentId);
  const existingProfile = existingRecord?.profile || null;
  const payload = buildRegistrationPayload(input, existingProfile);

  const response = await fetch(`${getMarketplaceApiBaseUrl()}/marketplace/agents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': input.apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(toErrorMessage('Failed to register marketplace agent', data, response.status));
  }

  return {
    state: existingProfile ? 'updated' : 'created',
    profile: data.profile as MarketplaceAgentProfile,
  };
}

export async function ensureMarketplaceAgentProfile(
  input: SyncMarketplaceAgentInput
): Promise<SyncMarketplaceAgentResult> {
  const existingRecord = await getMarketplaceAgent(input.agentId);
  if (existingRecord?.profile) {
    return {
      state: 'exists',
      profile: existingRecord.profile,
    };
  }

  return upsertMarketplaceAgentProfile(input);
}
