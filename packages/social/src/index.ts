import crypto from "node:crypto";

import {
  type ChannelAdapter,
  channelReplySchema,
  type EventSource,
  socialCommandSchema,
  type ChannelReply,
  type NormalizedSocialEvent,
  normalizedSocialEventSchema,
  type PolicyReason,
  socialChannelSchema,
  socialSourceSchema,
  type SocialCommand,
  xEventsIngressRequestSchema
} from "@barter/contracts";

const HANDLE_PATTERN = /^[a-z0-9_]{1,15}$/i;

export function normalizeXHandle(handle: string): string {
  return handle.trim().replace(/^@+/, "").toLowerCase();
}

export function parseCanonicalCommand(
  text: string,
  targetHandle = "@barterpayments"
): SocialCommand | null {
  const normalizedTarget = normalizeXHandle(targetHandle);
  const expression = new RegExp(
    `^\\s*@?${escapeForRegex(normalizedTarget)}\\b[\\s,:-]*pay\\s+([0-9]+(?:\\.[0-9]+)?)\\s+([a-z0-9$._-]+)\\s+to\\s+(@[a-z0-9_]{1,15}|0x[a-f0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\\s+on\\s+([a-z0-9-]+)\\s*$`,
    "i"
  );

  const match = text.match(expression);
  if (!match) {
    return null;
  }

  const [, amountInput, tokenSymbol, recipientRaw, chainName] = match;
  if (!amountInput || !tokenSymbol || !recipientRaw || !chainName) {
    return null;
  }
  const recipient = recipientRaw.startsWith("@")
    ? { kind: "handle" as const, handle: `@${normalizeXHandle(recipientRaw)}` }
    : { kind: "address" as const, address: recipientRaw };

  return socialCommandSchema.parse({
    action: "pay",
    rawText: text,
    normalizedText: text.trim().replace(/\s+/g, " "),
    targetHandle: `@${normalizedTarget}`,
    amountInput,
    tokenSymbol: tokenSymbol.toUpperCase(),
    recipient,
    chainName: chainName.toLowerCase()
  });
}

export function buildHelpReply(targetHandle = "@barterpayments"): string {
  return `Use: ${targetHandle} pay <amount> <token> to <@handle|address> on <chain>`;
}

export function extractXEvents(payload: unknown): NormalizedSocialEvent[] {
  const parsed = xEventsIngressRequestSchema.parse(payload);

  if (parsed.events?.length) {
    return parsed.events.map((event) =>
      normalizedSocialEventSchema.parse({
        externalEventId: event.id,
        externalConversationId: event.conversationId,
        channel: socialChannelSchema.parse("x"),
        source: parsed.source ?? socialSourceSchema.parse("manual"),
        authorHandle: `@${normalizeXHandle(event.authorHandle)}`,
        authorExternalId: event.authorExternalId,
        text: event.text,
        rawPayload: event
      })
    );
  }

  if (isObject(payload) && Array.isArray(payload.data)) {
    return payload.data.map((event) =>
      normalizedSocialEventSchema.parse({
        externalEventId: String(event.id),
        externalConversationId: readOptionalString(event.conversation_id),
        channel: "x",
        source: "webhook",
        authorHandle: `@${normalizeXHandle(readString(event.author_handle, "unknown"))}`,
        authorExternalId: readOptionalString(event.author_id),
        text: readString(event.text),
        rawPayload: isObject(event) ? event : {}
      })
    );
  }

  if (isObject(payload) && Array.isArray(payload.tweet_create_events)) {
    return payload.tweet_create_events.map((event) =>
      normalizedSocialEventSchema.parse({
        externalEventId: readString(event.id_str, readString(event.id)),
        externalConversationId: readOptionalString(event.in_reply_to_status_id_str),
        channel: "x",
        source: "webhook",
        authorHandle: `@${normalizeXHandle(readString(event.user?.screen_name, "unknown"))}`,
        authorExternalId: readOptionalString(event.user?.id_str),
        text: readString(event.full_text, readString(event.text)),
        rawPayload: isObject(event) ? event : {}
      })
    );
  }

  return [];
}

export function computeXWebhookResponseToken(crcToken: string, consumerSecret: string): string {
  const digest = crypto
    .createHmac("sha256", consumerSecret)
    .update(crcToken)
    .digest("base64");

  return `sha256=${digest}`;
}

export function verifyXWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  consumerSecret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expected = `sha256=${crypto.createHmac("sha256", consumerSecret).update(payload).digest("base64")}`;

  return timingSafeCompare(expected, signatureHeader);
}

export function reasonToReply(reason: PolicyReason, targetHandle = "@barterpayments"): string {
  switch (reason.code) {
    case "syntax_invalid":
      return buildHelpReply(targetHandle);
    case "recipient_not_found":
      return reason.message;
    case "token_not_allowed":
    case "unsupported_chain":
    case "invalid_address":
      return reason.message;
    default:
      return `Request rejected: ${reason.message}`;
  }
}

export class ConsoleXChannelAdapter implements ChannelAdapter {
  readonly channel = "x" as const;

  constructor(
    private readonly options: {
      dryRun?: boolean;
      send?: (reply: ChannelReply) => Promise<{ externalReplyId: string; deliveredAt: string }>;
    } = {}
  ) {}

  async sendReply(reply: ChannelReply) {
    const parsed = channelReplySchema.parse(reply);

    if (this.options.send) {
      const delivery = await this.options.send(parsed);
      return {
        externalReplyId: delivery.externalReplyId,
        deliveredAt: delivery.deliveredAt,
        reply: parsed
      };
    }

    const externalReplyId = `reply_${crypto.createHash("sha256").update(parsed.text).digest("hex").slice(0, 16)}`;
    const deliveredAt = new Date().toISOString();

    console.log(
      JSON.stringify({
        channel: "x",
        dryRun: this.options.dryRun ?? true,
        externalReplyId,
        deliveredAt,
        reply: parsed
      })
    );

    return {
      externalReplyId,
      deliveredAt,
      reply: parsed
    };
  }
}

export class XEventSource implements EventSource {
  readonly name = "x";

  constructor(readonly mode: "webhook" | "polling" = "webhook") {}

  async normalizeEvents(payload: unknown): Promise<NormalizedSocialEvent[]> {
    return extractXEvents(payload);
  }
}

export function createXEventSource(mode: "webhook" | "polling" = "webhook"): XEventSource {
  return new XEventSource(mode);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function timingSafeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return undefined;
}

function readString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}
