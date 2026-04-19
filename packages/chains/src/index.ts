import {
  createPublicClient,
  erc20Abi,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Chain,
  type PublicClient
} from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";

import {
  type AddressValidationResult,
  type BuildTransferPlanInput,
  type ChainDescriptor,
  chainDescriptorSchema,
  chainFamilySchema,
  type ChainDriver,
  executionPlanSchema
} from "@barter/contracts";

type SupportedAsset = {
  symbol: string;
  decimals: number;
  tokenAddress?: string;
};

type ChainCatalogEntry = {
  descriptor: ChainDescriptor;
  viemChain?: Chain;
  assets: SupportedAsset[];
};

export type WalletAssetBalance = {
  symbol: string;
  decimals: number;
  amountAtomic: string;
  amountFormatted: string;
  tokenAddress?: string;
};

const chainCatalog = [
  {
    descriptor: { family: "evm", name: "base", nativeAssetSymbol: "ETH", live: true },
    viemChain: base,
    assets: [
      { symbol: "ETH", decimals: 18 },
      { symbol: "USDC", decimals: 6, tokenAddress: "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913" }
    ]
  },
  {
    descriptor: { family: "evm", name: "arbitrum", nativeAssetSymbol: "ETH", live: true },
    viemChain: arbitrum,
    assets: [
      { symbol: "ETH", decimals: 18 },
      { symbol: "USDC", decimals: 6, tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" }
    ]
  },
  {
    descriptor: { family: "evm", name: "optimism", nativeAssetSymbol: "ETH", live: true },
    viemChain: optimism,
    assets: [
      { symbol: "ETH", decimals: 18 },
      { symbol: "USDC", decimals: 6, tokenAddress: "0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85" }
    ]
  },
  {
    descriptor: { family: "evm", name: "ethereum", nativeAssetSymbol: "ETH", live: true },
    viemChain: mainnet,
    assets: [
      { symbol: "ETH", decimals: 18 },
      { symbol: "USDC", decimals: 6, tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }
    ]
  },
  {
    descriptor: { family: "svm", name: "solana", nativeAssetSymbol: "SOL", live: false },
    assets: [
      { symbol: "SOL", decimals: 9 },
      { symbol: "USDC", decimals: 6 }
    ]
  },
  {
    descriptor: { family: "other", name: "tempo", nativeAssetSymbol: "USDC", live: false },
    assets: [{ symbol: "USDC", decimals: 6 }]
  }
] as const satisfies ReadonlyArray<ChainCatalogEntry>;

const publicClientCache = new Map<string, PublicClient>();

export type ChainRegistry = ReturnType<typeof createChainRegistry>;

class EvmChainDriver implements ChainDriver {
  readonly descriptor: ChainDescriptor;

  constructor(descriptor: ChainDescriptor) {
    this.descriptor = chainDescriptorSchema.parse(descriptor);
  }

  validateAddress(address: string): AddressValidationResult {
    if (!isAddress(address)) {
      return {
        ok: false,
        reason: `Invalid EVM address for ${this.descriptor.name}`
      };
    }

    return {
      ok: true,
      normalizedAddress: getAddress(address)
    };
  }

  buildTransferPlan(input: BuildTransferPlanInput) {
    const amountAtomic =
      typeof input.decimals === "number"
        ? parseUnits(input.amountInput, input.decimals).toString()
        : undefined;

    return executionPlanSchema.parse({
      capability: "transfer",
      mode: input.mode,
      chainFamily: this.descriptor.family,
      chainName: this.descriptor.name,
      amountInput: input.amountInput,
      ...(amountAtomic ? { amountAtomic } : {}),
      asset: {
        symbol: input.assetSymbol,
        tokenAddress: input.tokenAddress,
        decimals: input.decimals
      },
      senderAccountId: input.senderAccountId,
      senderWalletId: input.senderWalletId,
      recipient: input.recipient,
      providerHint: this.descriptor.family,
      metadata: input.metadata ?? {}
    });
  }
}

class SvmStubDriver implements ChainDriver {
  readonly descriptor: ChainDescriptor;

  constructor(descriptor: ChainDescriptor) {
    this.descriptor = chainDescriptorSchema.parse(descriptor);
  }

  validateAddress(address: string): AddressValidationResult {
    const base58Like = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Like.test(address)) {
      return {
        ok: false,
        reason: `Invalid SVM address for ${this.descriptor.name}`
      };
    }

    return {
      ok: true,
      normalizedAddress: address
    };
  }

  buildTransferPlan(input: BuildTransferPlanInput) {
    const amountAtomic =
      typeof input.decimals === "number"
        ? parseUnits(input.amountInput, input.decimals).toString()
        : undefined;

    return executionPlanSchema.parse({
      capability: "transfer",
      mode: input.mode,
      chainFamily: this.descriptor.family,
      chainName: this.descriptor.name,
      amountInput: input.amountInput,
      ...(amountAtomic ? { amountAtomic } : {}),
      asset: {
        symbol: input.assetSymbol,
        tokenAddress: input.tokenAddress,
        decimals: input.decimals
      },
      senderAccountId: input.senderAccountId,
      senderWalletId: input.senderWalletId,
      recipient: input.recipient,
      providerHint: "svm-stub",
      metadata: {
        ...input.metadata,
        liveExecution: false
      }
    });
  }
}

class OtherStubDriver implements ChainDriver {
  readonly descriptor: ChainDescriptor;

  constructor(descriptor: ChainDescriptor) {
    this.descriptor = chainDescriptorSchema.parse(descriptor);
  }

  validateAddress(address: string): AddressValidationResult {
    if (!address.trim()) {
      return {
        ok: false,
        reason: `Address is required for ${this.descriptor.name}`
      };
    }

    return {
      ok: true,
      normalizedAddress: address.trim()
    };
  }

  buildTransferPlan(input: BuildTransferPlanInput) {
    const amountAtomic =
      typeof input.decimals === "number"
        ? parseUnits(input.amountInput, input.decimals).toString()
        : undefined;

    return executionPlanSchema.parse({
      capability: "transfer",
      mode: input.mode,
      chainFamily: this.descriptor.family,
      chainName: this.descriptor.name,
      amountInput: input.amountInput,
      ...(amountAtomic ? { amountAtomic } : {}),
      asset: {
        symbol: input.assetSymbol,
        tokenAddress: input.tokenAddress,
        decimals: input.decimals
      },
      senderAccountId: input.senderAccountId,
      senderWalletId: input.senderWalletId,
      recipient: input.recipient,
      providerHint: "generic-stub",
      metadata: {
        ...input.metadata,
        liveExecution: false
      }
    });
  }
}

export function createChainRegistry() {
  const drivers = new Map<string, ChainDriver>();

  for (const entry of chainCatalog) {
    const parsed = chainDescriptorSchema.parse(entry.descriptor);

    if (parsed.family === "evm") {
      drivers.set(parsed.name, new EvmChainDriver(parsed));
      continue;
    }

    if (parsed.family === "svm") {
      drivers.set(parsed.name, new SvmStubDriver(parsed));
      continue;
    }

    drivers.set(parsed.name, new OtherStubDriver(parsed));
  }

  const list = () => [...drivers.values()].map((driver) => driver.descriptor);

  return {
    list,
    get(chainName: string) {
      const normalized = chainName.trim().toLowerCase();
      return drivers.get(normalized);
    },
    getOrThrow(chainName: string) {
      const driver = this.get(chainName);
      if (!driver) {
        throw new Error(`Unsupported chain "${chainName}"`);
      }
      return driver;
    },
    getFamily(chainName: string) {
      const driver = this.getOrThrow(chainName);
      return chainFamilySchema.parse(driver.descriptor.family);
    },
    supports(chainName: string) {
      return Boolean(this.get(chainName));
    },
    validateAddress(chainName: string, address: string) {
      return this.getOrThrow(chainName).validateAddress(address);
    }
  };
}

export function listChainDescriptors(): ChainDescriptor[] {
  return chainCatalog.map((entry) => chainDescriptorSchema.parse(entry.descriptor));
}

export function listSupportedAssetsForChain(chainName: string): SupportedAsset[] {
  return getChainCatalogEntry(chainName).assets.map((asset) => ({ ...asset }));
}

export function getSupportedAsset(chainName: string, symbol: string): SupportedAsset | null {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return (
    listSupportedAssetsForChain(chainName).find((asset) => asset.symbol === normalizedSymbol) ?? null
  );
}

export function getExplorerTxUrl(chainName: string, txHash: string): string | undefined {
  const chain = getViemChain(chainName);
  const explorerUrl = chain?.blockExplorers?.default?.url;

  if (!explorerUrl) {
    return undefined;
  }

  return `${explorerUrl}/tx/${txHash}`;
}

export function getViemChain(chainName: string): Chain | undefined {
  return getChainCatalogEntry(chainName).viemChain;
}

export function createPublicClientForChain(input: {
  chainName: string;
  rpcUrl?: string;
}): PublicClient {
  const { chainName, rpcUrl } = input;
  const chain = getViemChain(chainName);

  if (!chain) {
    throw new Error(`No EVM runtime is available for ${chainName}`);
  }

  const resolvedRpcUrl = resolveRpcUrlForChain(chainName, rpcUrl);
  if (!resolvedRpcUrl) {
    throw new Error(`No RPC URL is configured for ${chainName}`);
  }

  const cacheKey = `${chain.id}:${resolvedRpcUrl}`;
  const cached = publicClientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const client = createPublicClient({
    chain,
    transport: http(resolvedRpcUrl)
  });
  publicClientCache.set(cacheKey, client);
  return client;
}

export function resolveRpcUrlForChain(chainName: string, rpcUrl?: string): string | undefined {
  const chain = getViemChain(chainName);
  if (!chain) {
    return undefined;
  }

  return rpcUrl?.trim() || chain.rpcUrls.default.http[0];
}

export async function readWalletBalances(input: {
  chainName: string;
  address: string;
  rpcUrl?: string;
  assets?: SupportedAsset[];
}): Promise<WalletAssetBalance[]> {
  const address = getAddress(input.address);
  const assets = input.assets?.length ? input.assets : listSupportedAssetsForChain(input.chainName);
  const client = createPublicClientForChain({
    chainName: input.chainName,
    ...(input.rpcUrl ? { rpcUrl: input.rpcUrl } : {})
  });

  const balances = await Promise.all(
    assets.map(async (asset) => {
      if (asset.tokenAddress) {
        const amountAtomic = await client.readContract({
          address: getAddress(asset.tokenAddress),
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address]
        });

        return {
          symbol: asset.symbol,
          decimals: asset.decimals,
          amountAtomic: amountAtomic.toString(),
          amountFormatted: formatBalance(amountAtomic, asset.decimals),
          tokenAddress: asset.tokenAddress
        } satisfies WalletAssetBalance;
      }

      const amountAtomic = await client.getBalance({
        address
      });

      return {
        symbol: asset.symbol,
        decimals: asset.decimals,
        amountAtomic: amountAtomic.toString(),
        amountFormatted: formatBalance(amountAtomic, asset.decimals)
      } satisfies WalletAssetBalance;
    })
  );

  return balances;
}

export function formatBalance(amount: bigint, decimals: number): string {
  const formatted = formatUnits(amount, decimals);
  const normalized = formatted.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");

  return normalized || "0";
}

function getChainCatalogEntry(chainName: string): ChainCatalogEntry {
  const normalized = chainName.trim().toLowerCase();
  const entry = chainCatalog.find((candidate) => candidate.descriptor.name === normalized);

  if (!entry) {
    throw new Error(`Unsupported chain "${chainName}"`);
  }

  return entry;
}
