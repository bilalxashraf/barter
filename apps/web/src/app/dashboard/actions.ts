"use server";

import { createChainRegistry } from "@barter/chains";
import { loadChainRpcUrls } from "@barter/config";
import type { ChainDriver } from "@barter/contracts";
import { createCustodyProvider } from "@barter/custody";
import { revalidatePath } from "next/cache";

import { ensureWebBootstrap } from "@/lib/bootstrap";
import { requireCurrentSession } from "@/lib/session";
import { getWebRuntime } from "@/lib/server";

const chainRegistry = createChainRegistry();

export async function createWalletAction(formData: FormData) {
  await ensureWebBootstrap();
  const runtime = getWebRuntime();
  const session = await requireCurrentSession();
  const chainName = readRequiredField(formData, "chainName").toLowerCase();
  const address = readOptionalField(formData, "address");
  const makeDefault = readBooleanField(formData, "makeDefault", true);
  const driver = chainRegistry.getOrThrow(chainName);
  const normalizedAddress = address ? validateAddress(driver, address) : undefined;
  const agent = await runtime.repository.ensureBootstrapAgent({
    slug: runtime.config.NEXT_PUBLIC_BARTER_HANDLE
  });
  const custodyProvider = createCustodyProvider({
    mode: runtime.config.WEB_CUSTODY_MODE,
    encryptionKey: runtime.config.BARTER_ENCRYPTION_KEY,
    rpcUrls: loadChainRpcUrls(runtime.config)
  });
  const wallet = await custodyProvider.provisionWallet({
    accountId: session.accountId,
    agentId: agent.id,
    chainFamily: driver.descriptor.family,
    chainName,
    ...(normalizedAddress ? { requestedAddress: normalizedAddress } : {})
  });

  await runtime.repository.createOrAttachWalletAccount({
    accountId: session.accountId,
    agentId: agent.id,
    chainFamily: driver.descriptor.family,
    chainName,
    wallet,
    makeDefault
  });

  revalidatePath("/dashboard");
}

export async function createPayoutDestinationAction(formData: FormData) {
  await ensureWebBootstrap();
  const runtime = getWebRuntime();
  const session = await requireCurrentSession();
  const chainName = readRequiredField(formData, "chainName").toLowerCase();
  const address = readRequiredField(formData, "address");
  const label = readOptionalField(formData, "label");
  const makeDefault = readBooleanField(formData, "makeDefault", true);
  const driver = chainRegistry.getOrThrow(chainName);
  const normalizedAddress = validateAddress(driver, address);

  await runtime.repository.upsertPayoutDestination({
    accountId: session.accountId,
    chainFamily: driver.descriptor.family,
    chainName,
    address: normalizedAddress,
    ...(label ? { label } : {}),
    makeDefault
  });

  revalidatePath("/dashboard");
}

function readRequiredField(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

function readBooleanField(formData: FormData, key: string, fallback: boolean): boolean {
  const value = formData.get(key);
  if (value === null) {
    return fallback;
  }

  return value === "on" || value === "true";
}

function validateAddress(driver: ChainDriver, address: string): string {
  const validation = driver.validateAddress(address);

  if (!validation.ok || !validation.normalizedAddress) {
    throw new Error(validation.reason ?? "Invalid address");
  }

  return validation.normalizedAddress;
}
