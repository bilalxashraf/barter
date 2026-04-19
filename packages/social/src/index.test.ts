import { describe, expect, it } from "vitest";

import {
  buildHelpReply,
  computeXWebhookResponseToken,
  extractXEvents,
  parseCanonicalCommand
} from "./index";

describe("parseCanonicalCommand", () => {
  it("parses canonical handle-based commands", () => {
    const command = parseCanonicalCommand("@barterpayments pay 5 usdc to @Alice on base");

    expect(command).not.toBeNull();
    expect(command?.amountInput).toBe("5");
    expect(command?.tokenSymbol).toBe("USDC");
    expect(command?.recipient.kind).toBe("handle");
  });

  it("rejects non-canonical text", () => {
    expect(parseCanonicalCommand("swap 5 usdc")).toBeNull();
  });
});

describe("extractXEvents", () => {
  it("normalizes manual ingestion payloads", () => {
    const events = extractXEvents({
      source: "manual",
      events: [
        {
          id: "evt_1",
          text: "@barterpayments pay 5 USDC to @alice on base",
          authorHandle: "@Bob"
        }
      ]
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.authorHandle).toBe("@bob");
  });
});

describe("x webhook helpers", () => {
  it("creates a response token and help text", () => {
    const token = computeXWebhookResponseToken("challenge", "secret");

    expect(token.startsWith("sha256=")).toBe(true);
    expect(buildHelpReply()).toContain("@barterpayments pay");
  });
});
