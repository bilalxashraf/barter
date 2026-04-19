export type AgentKeyResponse = { agentId: string; apiKey: string };
export type WalletResponse = { wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number } };
export type WalletListResponse = { wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] };

export type SolanaWalletResponse = { wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number } };
export type SolanaWalletListResponse = { wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] };
export type SolanaBalanceResponse = { wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }; balance: { sol: number; lamports: number } };
export type TempoWalletResponse = { wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number } };
export type TempoWalletListResponse = { wallets: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }[] };
export type TempoBalanceResponse = { wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number }; balance: { wei: string; eth: string } };
export type TempoTokenBalanceResponse = {
  wallet: { agentId: string; walletNo: number; address: string; networkId: string; createdAt: number };
  token: { symbol: string; tokenAddress: string; balance: string; rawBalance: string; decimals: number };
};

export type TokenHolding = {
  symbol: string;
  address: string;
  balance: string;
  priceUsd: string | null;
  valueUsd: string | null;
};

export type WalletBalanceResponse = {
  address: string;
  holdings: TokenHolding[];
  totalUsd: string;
};

function getBaseUrl() {
  // Use NEXT_PUBLIC_ prefix for client-side access
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_AGENT_API_BASE_URL || 'https://api.ignotusai.xyz';
  }
  // Server-side
  return process.env.AGENT_API_BASE_URL || 'https://api.ignotusai.xyz';
}

export async function createAgentKey(agentId: string): Promise<AgentKeyResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/keys/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create agent key (${res.status})`);
  }

  return res.json();
}

export async function createAgentWallet(agentId: string, apiKey: string, networkId = 'base', walletNo?: number):
Promise<WalletResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ agentId, networkId, ...(typeof walletNo === 'number' ? { walletNo } : {}) })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create wallet (${res.status})`);
  }

  return res.json();
}

export async function listAgentWallets(agentId: string, apiKey: string): Promise<WalletListResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/${agentId}/list`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to list wallets (${res.status})`);
  }

  return res.json();
}

export async function getWalletBalance(
  chain: string,
  address: string,
  apiKey: string,
  minUsd = 0.01
): Promise<WalletBalanceResponse> {
  const res = await fetch(`${getBaseUrl()}/wallet/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      chain,
      address,
      minUsd,
      includeUnknown: false
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to fetch wallet balance (${res.status})`);
  }

  return res.json();
}

// ===== Solana Wallet Functions =====

export async function createSolanaWallet(agentId: string, apiKey: string, walletNo?: number): Promise<SolanaWalletResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/solana/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ agentId, ...(typeof walletNo === 'number' ? { walletNo } : {}) })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create Solana wallet (${res.status})`);
  }

  return res.json();
}

export async function listSolanaWallets(agentId: string, apiKey: string): Promise<SolanaWalletListResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/solana/${agentId}/list`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to list Solana wallets (${res.status})`);
  }

  return res.json();
}

export async function getSolanaBalance(agentId: string, apiKey: string, walletNo?: number): Promise<SolanaBalanceResponse> {
  const url = `${getBaseUrl()}/agent/wallets/solana/${agentId}/balance${walletNo ? `?walletNo=${walletNo}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to fetch Solana balance (${res.status})`);
  }

  return res.json();
}

export type SolanaTokenBalancesResponse = {
  address: string;
  totalUsd: string;
  holdings: Array<{
    symbol: string;
    mint: string;
    balance: string;
    decimals: number;
    uiAmount: number;
    priceUsd: string | null;
    valueUsd: string | null;
    logo: string | null;
  }>;
};

export async function getSolanaTokenBalances(agentId: string, apiKey: string, walletNo?: number): Promise<SolanaTokenBalancesResponse> {
  const url = `${getBaseUrl()}/agent/wallets/solana/${agentId}/tokens${walletNo ? `?walletNo=${walletNo}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to fetch Solana token balances (${res.status})`);
  }

  return res.json();
}

// ===== Tempo Wallet Functions =====

export async function createTempoWallet(agentId: string, apiKey: string, walletNo?: number): Promise<TempoWalletResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/tempo/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ agentId, ...(typeof walletNo === 'number' ? { walletNo } : {}) })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create Tempo wallet (${res.status})`);
  }

  return res.json();
}

export async function listTempoWallets(agentId: string, apiKey: string): Promise<TempoWalletListResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/wallets/tempo/${agentId}/list`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to list Tempo wallets (${res.status})`);
  }

  return res.json();
}

export async function getTempoBalance(agentId: string, apiKey: string, walletNo?: number): Promise<TempoBalanceResponse> {
  const url = `${getBaseUrl()}/agent/wallets/tempo/${agentId}/balance${walletNo ? `?walletNo=${walletNo}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to fetch Tempo balance (${res.status})`);
  }

  return res.json();
}

export async function getTempoTokenBalance(
  agentId: string,
  apiKey: string,
  params?: { walletNo?: number; tokenAddress?: string; decimals?: number; symbol?: string }
): Promise<TempoTokenBalanceResponse> {
  const url = new URL(`${getBaseUrl()}/agent/wallets/tempo/${agentId}/tokens`);
  if (typeof params?.walletNo === 'number') url.searchParams.set('walletNo', String(params.walletNo));
  if (params?.tokenAddress) url.searchParams.set('tokenAddress', params.tokenAddress);
  if (typeof params?.decimals === 'number') url.searchParams.set('decimals', String(params.decimals));
  if (params?.symbol) url.searchParams.set('symbol', params.symbol);

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to fetch Tempo token balance (${res.status})`);
  }

  return res.json();
}

// ===== Payment Link Functions =====

export type PaymentLink = {
  linkId: string;
  agentId: string;
  type: 'one-time' | 'recurring';
  chain: string;
  token: string;
  amount: string;
  description?: string;
  recipientWalletNo?: number;
  status: 'active' | 'paid' | 'expired' | 'cancelled';
  expiresAt?: number;
  createdAt: number;
  paidAt?: number;
  txHash?: string;
  payer?: string;
  metadata?: Record<string, any>;
};

export type CreatePaymentLinkParams = {
  agentId: string;
  chain: string;
  token: string;
  amount: string;
  description?: string;
  recipientWalletNo?: number;
  expiresIn?: number;
  notifyEmail?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
};

export type PaymentLinkResponse = {
  linkId: string;
  url: string;
  qrCode: string;
  expiresAt?: number;
  status: string;
  recipientAddress: string;
};

export type PaymentLinkDetailsResponse = {
  link: PaymentLink;
  recipientAddress: string;
  tokenAddress: string;
  decimals: number;
};

export type PaymentLinksListResponse = {
  links: PaymentLink[];
  count: number;
};

export async function createPaymentLink(params: CreatePaymentLinkParams, apiKey: string): Promise<PaymentLinkResponse> {
  const res = await fetch(`${getBaseUrl()}/payments/links/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create payment link (${res.status})`);
  }

  return res.json();
}

export async function getPaymentLinkDetails(linkId: string): Promise<PaymentLinkDetailsResponse> {
  // This endpoint is public - no API key required
  const res = await fetch(`${getBaseUrl()}/payments/links/${linkId}/details`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to get payment link details (${res.status})`);
  }

  return res.json();
}

export async function listPaymentLinks(
  agentId: string,
  apiKey: string,
  status?: 'active' | 'paid' | 'expired' | 'cancelled'
): Promise<PaymentLinksListResponse> {
  const url = new URL(`${getBaseUrl()}/payments/links`);
  url.searchParams.set('agentId', agentId);
  if (status) url.searchParams.set('status', status);

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to list payment links (${res.status})`);
  }

  return res.json();
}

export async function cancelPaymentLink(linkId: string, agentId: string, apiKey: string): Promise<{ success: boolean }> {
  const res = await fetch(`${getBaseUrl()}/payments/links/${linkId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ agentId })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to cancel payment link (${res.status})`);
  }

  return { success: true };
}

// ===== Barter Payments Cards Functions =====

export type CardProfile = {
  profileId: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  termsAcceptedAt?: number;
  status: 'active' | 'pending_requirements';
  availableBalanceCents: number;
  currency: 'usd';
  stripeCustomerId?: string;
  stripeIssuingCardholderId?: string;
  createdAt: number;
  updatedAt: number;
};

export type CardFunding = {
  fundingId: string;
  profileId: string;
  agentId: string;
  amountCents: number;
  amountUsd: string;
  currency: 'usd';
  status: 'pending' | 'completed' | 'expired' | 'failed';
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  checkoutUrl?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type VirtualCard = {
  cardId: string;
  profileId: string;
  agentId: string;
  provider: 'stripe_issuing';
  providerCardId?: string;
  amountCents: number;
  amountUsd: string;
  availableCents: number;
  currency: 'usd';
  purpose: string;
  merchantName?: string;
  status: 'active' | 'closed' | 'expired' | 'failed';
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  fundedAt?: number;
  closedAt?: number;
  failureReason?: string;
};

export type CardsConfig = {
  enabled: boolean;
  issuingEnabled: boolean;
  provider: string;
  minTopUpUsd: number;
  maxTopUpUsd: number;
  maxCardAmountUsd: number;
  defaultExpiryDays: number;
};

export type CardOverviewResponse = {
  profile: CardProfile | null;
  paymentMethodStatus: {
    hasPaymentMethod: boolean;
    count: number;
  };
  fundingTransactions: CardFunding[];
  cards: VirtualCard[];
  balanceCents: number;
  balanceUsd: string;
};

export async function getCardsConfig(): Promise<{ cards: CardsConfig }> {
  const res = await fetch(`${getBaseUrl()}/cards/config`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to load cards config (${res.status})`);
  }

  return res.json();
}

export async function getCardsOverview(agentId: string, apiKey: string): Promise<CardOverviewResponse> {
  const res = await fetch(`${getBaseUrl()}/cards/profiles/${encodeURIComponent(agentId)}/overview`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to load cards overview (${res.status})`);
  }

  return res.json();
}

export async function createCardProfile(
  params: {
    agentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    dateOfBirth: string;
    termsAccepted: boolean;
    billingAddress: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  },
  apiKey: string
): Promise<{ profile: CardProfile }> {
  const res = await fetch(`${getBaseUrl()}/cards/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create card profile (${res.status})`);
  }

  return res.json();
}

export async function setupCardsPaymentMethod(
  agentId: string,
  apiKey: string,
  params?: { successUrl?: string; cancelUrl?: string }
): Promise<{ url: string; expiresAt?: string | null }> {
  const res = await fetch(`${getBaseUrl()}/cards/profiles/${encodeURIComponent(agentId)}/payment-method/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(params || {})
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to setup cards payment method (${res.status})`);
  }

  return res.json();
}

export async function createFundingSession(
  params: {
    agentId: string;
    amountUsd: string;
    successUrl?: string;
    cancelUrl?: string;
  },
  apiKey: string
): Promise<{ funding: CardFunding }> {
  const res = await fetch(`${getBaseUrl()}/cards/profiles/${encodeURIComponent(params.agentId)}/funding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      amountUsd: params.amountUsd,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create funding session (${res.status})`);
  }

  return res.json();
}

export async function syncFundingSession(agentId: string, fundingId: string, apiKey: string): Promise<{ funding: CardFunding }> {
  const res = await fetch(`${getBaseUrl()}/cards/profiles/${encodeURIComponent(agentId)}/funding/${encodeURIComponent(fundingId)}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to sync funding session (${res.status})`);
  }

  return res.json();
}

export async function createVirtualCard(
  params: {
    agentId: string;
    amountUsd: string;
    purpose: string;
    merchantName?: string;
    expiresInDays?: number;
  },
  apiKey: string
): Promise<{ card: VirtualCard }> {
  const res = await fetch(`${getBaseUrl()}/cards/virtual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to create virtual card (${res.status})`);
  }

  return res.json();
}

export async function closeVirtualCard(cardId: string, agentId: string, apiKey: string): Promise<{ card: VirtualCard }> {
  const res = await fetch(`${getBaseUrl()}/cards/virtual/${encodeURIComponent(cardId)}/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ agentId })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Failed to close virtual card (${res.status})`);
  }

  return res.json();
}

// ===== Agent Execute Functions =====

export type AgentExecuteResponse = {
  message?: string;
  txHash?: string;
  transactionHash?: string;
  signature?: string;
  quote?: {
    txHash?: string;
  };
  toolResults?: Array<{
    result?: {
      txHash?: string;
      transactionHash?: string;
      signature?: string;
    };
  }>;
  [key: string]: any;
};

export async function executeAgentCommand(
  agentId: string,
  apiKey: string,
  prompt: string,
  walletNo?: number,
  chain: 'solana' | 'evm' = 'solana'
): Promise<AgentExecuteResponse> {
  const endpoint = chain === 'solana' ? '/agent/execute/solana' : '/agent/execute';
  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      agentId,
      prompt,
      ...(typeof walletNo === 'number' ? { walletNo } : {})
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Execution failed (${res.status})`);
  }

  return res.json();
}

export type MppFetchResponse = {
  wallet: {
    agentId: string;
    walletNo: number;
    address: string;
    networkId: string;
  };
  response: {
    status: number;
    ok: boolean;
    url: string;
    headers: Record<string, string>;
    contentType: string | null;
    bodyText: string;
    bodyJson?: any;
  };
  payment: {
    protocol: 'mpp';
    network: 'tempo';
    testnet: boolean;
  };
};

export async function fetchWithAgentMpp(
  agentId: string,
  apiKey: string,
  params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    walletNo?: number;
    timeoutMs?: number;
  }
): Promise<MppFetchResponse> {
  const res = await fetch(`${getBaseUrl()}/agent/mpp/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      agentId,
      ...params
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `MPP fetch failed (${res.status})`);
  }

  return res.json();
}
