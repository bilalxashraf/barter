import type { NormalizedSocialEvent, TokenAllowlistEntry } from "@barter/contracts";

export function buildNormalizedSocialEvent(overrides: Partial<NormalizedSocialEvent> = {}): NormalizedSocialEvent {
  return {
    externalEventId: "evt_123",
    channel: "x",
    source: "manual",
    authorHandle: "@tester",
    text: "@barterpayments pay 5 USDC to @alice on base",
    rawPayload: {},
    ...overrides
  };
}

export function buildAllowlistEntry(overrides: Partial<TokenAllowlistEntry> = {}): TokenAllowlistEntry {
  return {
    chainFamily: "evm",
    chainName: "base",
    symbol: "USDC",
    tokenAddress: "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    isEnabled: true,
    ...overrides
  };
}

