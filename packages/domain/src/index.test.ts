import { createChainRegistry } from "@barter/chains";
import { describe, expect, it } from "vitest";

import { buildPaymentIntentPreview } from "./index";

describe("buildPaymentIntentPreview", () => {
  const chainRegistry = createChainRegistry();

  it("builds an allowed preview for handle recipients", async () => {
    const result = await buildPaymentIntentPreview("@barterpayments pay 5 USDC to @alice on base", {
      chainRegistry,
      recipientResolver: async () => ({
        accountId: "9b5aaf77-8cb8-4c5d-97a5-22f7adfda2b4",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        recipient: {
          kind: "address",
          address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      }),
      tokenAllowlistResolver: async () => ({
        tokenAddress: "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913",
        decimals: 6
      })
    });

    expect(result.preview.policyVerdict.allowed).toBe(true);
    expect(result.preview.executionPlan?.chainName).toBe("base");
  });

  it("rejects unsupported tokens", async () => {
    const result = await buildPaymentIntentPreview("@barterpayments pay 5 DEGEN to @alice on base", {
      chainRegistry,
      recipientResolver: async () => ({
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        recipient: {
          kind: "address",
          address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      }),
      tokenAllowlistResolver: async () => null
    });

    expect(result.preview.policyVerdict.allowed).toBe(false);
    expect(result.preview.policyVerdict.reasons[0]?.code).toBe("token_not_allowed");
  });

  it("returns help text for invalid grammar", async () => {
    const result = await buildPaymentIntentPreview("swap it", {
      chainRegistry,
      recipientResolver: async () => null,
      tokenAllowlistResolver: async () => null
    });

    expect(result.preview.policyVerdict.allowed).toBe(false);
    expect(result.helpText).toContain("@barterpayments pay");
  });
});
