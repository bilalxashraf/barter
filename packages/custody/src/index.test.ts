import { describe, expect, it } from "vitest";

import { createCustodyProvider } from "./index";

describe("custody providers", () => {
  it("provisions deterministic wallets", async () => {
    const provider = createCustodyProvider("mock");

    const wallet = await provider.provisionWallet({
      accountId: "7e981711-18d1-4c0a-9d27-1497ba35f8f5",
      agentId: "df334b40-f354-455d-b6c5-5d406dd365cc",
      chainFamily: "evm",
      chainName: "base"
    });

    expect(wallet.address.startsWith("0x")).toBe(true);
    expect(wallet.custodyMode).toBe("mock");
  });

  it("returns a deterministic mock transaction hash", async () => {
    const provider = createCustodyProvider("mock");
    const result = await provider.executePlan({
      capability: "transfer",
      mode: "mock",
      chainFamily: "evm",
      chainName: "base",
      amountInput: "5",
      asset: {
        symbol: "USDC"
      },
      recipient: {
        kind: "handle",
        handle: "@alice"
      },
      metadata: {}
    });

    expect(result.status).toBe("confirmed");
    expect(result.txHash?.startsWith("0x")).toBe(true);
  });

  it("provisions a real custodial EVM wallet with encrypted signer material", async () => {
    const provider = createCustodyProvider({
      mode: "custodial",
      encryptionKey: "test-encryption-key"
    });

    const wallet = await provider.provisionWallet({
      accountId: "7e981711-18d1-4c0a-9d27-1497ba35f8f5",
      agentId: "df334b40-f354-455d-b6c5-5d406dd365cc",
      chainFamily: "evm",
      chainName: "base"
    });

    expect(wallet.address.startsWith("0x")).toBe(true);
    expect(wallet.custodyMode).toBe("custodial");
    expect(typeof wallet.metadata.encryptedPrivateKey).toBe("string");
  });
});
