import { readWalletBalances, type WalletAssetBalance } from "@barter/chains";
import { loadChainRpcUrls } from "@barter/config";

type WorkspaceWallet = {
  id: string;
  chainName: string;
  address: string;
};

type AllowlistEntry = {
  chainName: string;
  symbol: string;
  tokenAddress?: string | null;
  decimals?: number | null;
};

export async function hydrateWalletBalances(input: {
  wallets: WorkspaceWallet[];
  allowlist: AllowlistEntry[];
  config: Record<string, unknown>;
}) {
  const rpcUrls = loadChainRpcUrls(input.config);

  return Promise.all(
    input.wallets.map(async (wallet) => {
      try {
        const balances = await readWalletBalances({
          chainName: wallet.chainName,
          address: wallet.address,
          ...(rpcUrls[wallet.chainName as keyof typeof rpcUrls]
            ? { rpcUrl: rpcUrls[wallet.chainName as keyof typeof rpcUrls] }
            : {}),
          assets: input.allowlist
            .filter((entry) => entry.chainName === wallet.chainName)
            .map((entry) => ({
              symbol: entry.symbol,
              ...(entry.tokenAddress ? { tokenAddress: entry.tokenAddress } : {}),
              ...(typeof entry.decimals === "number" ? { decimals: entry.decimals } : { decimals: 18 })
            }))
        });

        return {
          walletId: wallet.id,
          balances,
          error: null as string | null
        };
      } catch (error) {
        return {
          walletId: wallet.id,
          balances: [] as WalletAssetBalance[],
          error: error instanceof Error ? error.message : "Unable to read wallet balance"
        };
      }
    })
  );
}
