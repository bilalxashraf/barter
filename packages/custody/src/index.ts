import crypto from "node:crypto";

import {
  createPublicClientForChain,
  getExplorerTxUrl,
  getViemChain,
  resolveRpcUrlForChain
} from "@barter/chains";
import {
  custodyWalletContextSchema,
  type CustodyWalletContext,
  type CustodyMode,
  type CustodyProvider,
  executionResultSchema,
  type ExecutionPlan,
  type ExecutionResult,
  type WalletProvisionRequest,
  type WalletProvisionResult,
  walletProvisionResultSchema
} from "@barter/contracts";
import { createWalletClient, erc20Abi, getAddress, http, parseUnits, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

type CustodyProviderFactoryOptions = {
  mode: CustodyMode;
  encryptionKey?: string;
  rpcUrls?: Partial<Record<string, string>>;
};

export class MockCustodyProvider implements CustodyProvider {
  readonly mode = "mock" as const;

  async provisionWallet(input: WalletProvisionRequest) {
    if (input.requestedAddress?.trim()) {
      return walletProvisionResultSchema.parse({
        address: input.requestedAddress.trim(),
        chainFamily: input.chainFamily,
        chainName: input.chainName,
        custodyMode: "non_custodial",
        provider: "mock-attached",
        externalWalletId: `attached_${input.accountId}`,
        metadata: {
          attached: true
        }
      });
    }

    const material = `${input.accountId}:${input.agentId}:${input.chainFamily}:${input.chainName}`;
    const hash = crypto.createHash("sha256").update(material).digest("hex");
    const address =
      input.chainFamily === "evm"
        ? `0x${hash.slice(0, 40)}`
        : `${input.chainName}_${hash.slice(0, 32)}`;

    return walletProvisionResultSchema.parse({
      address,
      chainFamily: input.chainFamily,
      chainName: input.chainName,
      custodyMode: "mock",
      provider: "mock-custody",
      externalWalletId: `wallet_${hash.slice(0, 16)}`,
      metadata: {
        deterministic: true
      }
    });
  }

  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const digest = crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");

    return executionResultSchema.parse({
      status: "confirmed",
      txHash: `0x${digest.slice(0, 64)}`,
      externalExecutionId: `mock_exec_${digest.slice(0, 12)}`,
      raw: {
        simulated: true
      },
      completedAt: new Date().toISOString()
    });
  }
}

export class SelfCustodyEvmProvider implements CustodyProvider {
  readonly mode = "custodial" as const;

  constructor(
    private readonly options: {
      encryptionKey: string;
      rpcUrls?: Partial<Record<string, string>>;
    }
  ) {}

  async provisionWallet(input: WalletProvisionRequest) {
    if (input.requestedAddress?.trim()) {
      return walletProvisionResultSchema.parse({
        address: input.requestedAddress.trim(),
        chainFamily: input.chainFamily,
        chainName: input.chainName,
        custodyMode: "non_custodial",
        provider: "external-attached",
        externalWalletId: `attached_${input.accountId}_${input.chainName}`,
        metadata: {
          attached: true
        }
      });
    }

    if (input.chainFamily !== "evm") {
      throw new Error(`Custodial wallet provisioning is only enabled for EVM chains, received ${input.chainName}`);
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    return walletProvisionResultSchema.parse({
      address: account.address,
      chainFamily: input.chainFamily,
      chainName: input.chainName,
      custodyMode: "custodial",
      provider: "self-custody-evm",
      externalWalletId: account.address.toLowerCase(),
      metadata: {
        addressSource: "generated",
        encryptedPrivateKey: encryptSecret(privateKey, this.options.encryptionKey)
      }
    });
  }

  async executePlan(
    plan: ExecutionPlan,
    context?: {
      wallet?: CustodyWalletContext;
    }
  ): Promise<ExecutionResult> {
    if (plan.chainFamily !== "evm") {
      throw new Error(`Custodial execution is only enabled for EVM chains, received ${plan.chainName}`);
    }

    const wallet = context?.wallet ? custodyWalletContextSchema.parse(context.wallet) : null;
    if (!wallet) {
      throw new Error("Wallet context is required for custodial execution");
    }

    if (wallet.custodyMode !== "custodial") {
      throw new Error("Only system-managed wallets can execute payments in custodial mode");
    }

    if (!plan.senderWalletId || plan.senderWalletId !== wallet.id) {
      throw new Error("Execution plan sender wallet does not match the resolved custody wallet");
    }

    const encryptedPrivateKey = readEncryptedPrivateKey(wallet.metadata);
    const privateKey = decryptSecret(encryptedPrivateKey, this.options.encryptionKey) as Hex;
    const account = privateKeyToAccount(privateKey);
    const normalizedWalletAddress = getAddress(wallet.address);

    if (account.address !== normalizedWalletAddress) {
      throw new Error("Decrypted signer does not match the stored wallet address");
    }

    if (plan.recipient.kind !== "address") {
      throw new Error("Execution requires a concrete recipient address");
    }

    const chain = getViemChain(plan.chainName);
    if (!chain) {
      throw new Error(`No EVM runtime is available for ${plan.chainName}`);
    }

    const rpcUrl = resolveRpcUrlForChain(plan.chainName, this.options.rpcUrls?.[plan.chainName]);
    if (!rpcUrl) {
      throw new Error(`No RPC URL is configured for ${plan.chainName}`);
    }

    const publicClient = createPublicClientForChain({
      chainName: plan.chainName,
      rpcUrl
    });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });

    const recipientAddress = getAddress(plan.recipient.address);
    const amountAtomic = resolveAmountAtomic(plan);

    let txHash: Hex;
    if (plan.asset.tokenAddress) {
      txHash = await walletClient.writeContract({
        address: getAddress(plan.asset.tokenAddress),
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, amountAtomic]
      });
    } else {
      txHash = await walletClient.sendTransaction({
        to: recipientAddress,
        value: amountAtomic
      });
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    const status = receipt.status === "success" ? "confirmed" : "failed";
    const explorerUrl = getExplorerTxUrl(plan.chainName, txHash);

    return executionResultSchema.parse({
      status,
      txHash,
      externalExecutionId: txHash,
      ...(explorerUrl ? { explorerUrl } : {}),
      raw: {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        transactionIndex: receipt.transactionIndex
      },
      completedAt: new Date().toISOString()
    });
  }
}

export class DisabledNonCustodialProvider implements CustodyProvider {
  readonly mode = "non_custodial" as const;

  async provisionWallet(_input: WalletProvisionRequest): Promise<WalletProvisionResult> {
    throw new Error("Non-custodial provisioning is not enabled in the bootstrap");
  }

  async executePlan(_plan: ExecutionPlan): Promise<ExecutionResult> {
    throw new Error("Non-custodial execution is not enabled in the bootstrap");
  }
}

export function createCustodyProvider(
  input: CustodyMode | CustodyProviderFactoryOptions
): CustodyProvider {
  const options = typeof input === "string" ? { mode: input } : input;

  if (options.mode === "mock") {
    return new MockCustodyProvider();
  }

  if (options.mode === "non_custodial") {
    return new DisabledNonCustodialProvider();
  }

  if (!options.encryptionKey?.trim()) {
    throw new Error("encryptionKey is required for custodial wallet mode");
  }

  return new SelfCustodyEvmProvider({
    encryptionKey: options.encryptionKey,
    ...(options.rpcUrls ? { rpcUrls: options.rpcUrls } : {})
  });
}

function resolveAmountAtomic(plan: ExecutionPlan): bigint {
  if (plan.amountAtomic?.trim()) {
    return BigInt(plan.amountAtomic);
  }

  const decimals = plan.asset.decimals;
  if (typeof decimals !== "number") {
    throw new Error(`Asset decimals are required to execute ${plan.asset.symbol} on ${plan.chainName}`);
  }

  return parseUnits(plan.amountInput, decimals);
}

function readEncryptedPrivateKey(metadata: Record<string, unknown>): string {
  const encryptedPrivateKey = metadata.encryptedPrivateKey;
  if (typeof encryptedPrivateKey !== "string" || !encryptedPrivateKey.trim()) {
    throw new Error("Wallet metadata is missing encrypted signer material");
  }

  return encryptedPrivateKey;
}

function deriveKey(rawKey: string): Buffer {
  const trimmed = rawKey.trim();

  if (/^[a-f0-9]{64}$/iu.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  return crypto.createHash("sha256").update(trimmed).digest();
}

function encryptSecret(plaintext: string, rawKey: string): string {
  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSecret(ciphertext: string, rawKey: string): string {
  const [ivPart, authTagPart, payloadPart] = ciphertext.split(".");

  if (!ivPart || !authTagPart || !payloadPart) {
    throw new Error("Malformed encrypted secret");
  }

  const key = deriveKey(rawKey);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));

  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, "base64url")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}
