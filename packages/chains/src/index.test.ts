import { describe, expect, it } from "vitest";

import { createChainRegistry, getSupportedAsset } from "./index";

describe("createChainRegistry", () => {
  it("normalizes EVM addresses", () => {
    const registry = createChainRegistry();
    const result = registry.validateAddress("base", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e");

    expect(result.ok).toBe(true);
    expect(result.normalizedAddress).toBe("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
  });

  it("rejects invalid EVM addresses", () => {
    const registry = createChainRegistry();
    const result = registry.validateAddress("base", "alice");

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Invalid EVM address");
  });

  it("supports stub validation for SVM", () => {
    const registry = createChainRegistry();
    const result = registry.validateAddress("solana", "So11111111111111111111111111111111111111112");

    expect(result.ok).toBe(true);
  });

  it("exposes executable asset metadata for base USDC", () => {
    const asset = getSupportedAsset("base", "USDC");

    expect(asset?.decimals).toBe(6);
    expect(asset?.tokenAddress?.startsWith("0x")).toBe(true);
  });
});
