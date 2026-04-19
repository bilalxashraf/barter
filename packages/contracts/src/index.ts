import { z } from "zod";

export const chainFamilyValues = ["evm", "svm", "other"] as const;
export const custodyModeValues = ["custodial", "non_custodial", "mock"] as const;
export const socialChannelValues = ["x"] as const;
export const socialSourceValues = ["webhook", "polling", "manual"] as const;
export const paymentIntentStatusValues = [
  "previewed",
  "queued",
  "policy_rejected",
  "executing",
  "executed",
  "reply_pending",
  "replied",
  "failed"
] as const;
export const paymentExecutionStatusValues = ["pending", "submitted", "confirmed", "failed"] as const;
export const channelReplyStatusValues = ["pending", "sent", "failed"] as const;

export const chainFamilySchema = z.enum(chainFamilyValues);
export const custodyModeSchema = z.enum(custodyModeValues);
export const socialChannelSchema = z.enum(socialChannelValues);
export const socialSourceSchema = z.enum(socialSourceValues);
export const paymentIntentStatusSchema = z.enum(paymentIntentStatusValues);
export const paymentExecutionStatusSchema = z.enum(paymentExecutionStatusValues);
export const channelReplyStatusSchema = z.enum(channelReplyStatusValues);

export type ChainFamily = z.infer<typeof chainFamilySchema>;
export type CustodyMode = z.infer<typeof custodyModeSchema>;
export type SocialChannel = z.infer<typeof socialChannelSchema>;
export type SocialSource = z.infer<typeof socialSourceSchema>;
export type PaymentIntentStatus = z.infer<typeof paymentIntentStatusSchema>;
export type PaymentExecutionStatus = z.infer<typeof paymentExecutionStatusSchema>;
export type ChannelReplyStatus = z.infer<typeof channelReplyStatusSchema>;

export const chainDescriptorSchema = z.object({
  family: chainFamilySchema,
  name: z.string().min(1),
  nativeAssetSymbol: z.string().min(1),
  live: z.boolean()
});

export type ChainDescriptor = z.infer<typeof chainDescriptorSchema>;

export const handleRecipientSchema = z.object({
  kind: z.literal("handle"),
  handle: z.string().regex(/^@[a-z0-9_]{1,15}$/i)
});

export const addressRecipientSchema = z.object({
  kind: z.literal("address"),
  address: z.string().min(1)
});

export const socialRecipientSchema = z.discriminatedUnion("kind", [
  handleRecipientSchema,
  addressRecipientSchema
]);

export type SocialRecipient = z.infer<typeof socialRecipientSchema>;

export const socialCommandSchema = z.object({
  action: z.literal("pay"),
  rawText: z.string().min(1),
  normalizedText: z.string().min(1),
  targetHandle: z.string().regex(/^@[a-z0-9_]{1,15}$/i),
  amountInput: z.string().min(1),
  tokenSymbol: z.string().min(1),
  recipient: socialRecipientSchema,
  chainName: z.string().min(1)
});

export type SocialCommand = z.infer<typeof socialCommandSchema>;

export const normalizedSocialEventSchema = z.object({
  externalEventId: z.string().min(1),
  externalConversationId: z.string().min(1).optional(),
  channel: socialChannelSchema,
  source: socialSourceSchema,
  authorHandle: z.string().min(1),
  authorExternalId: z.string().min(1).optional(),
  text: z.string().min(1),
  rawPayload: z.record(z.string(), z.unknown())
});

export type NormalizedSocialEvent = z.infer<typeof normalizedSocialEventSchema>;

export const policyReasonSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
});

export const policyVerdictSchema = z.object({
  allowed: z.boolean(),
  reasons: z.array(policyReasonSchema).default([])
});

export type PolicyReason = z.infer<typeof policyReasonSchema>;
export type PolicyVerdict = z.infer<typeof policyVerdictSchema>;

export const executionAssetSchema = z.object({
  symbol: z.string().min(1),
  tokenAddress: z.string().min(1).optional(),
  decimals: z.number().int().positive().optional()
});

export const executionPlanSchema = z.object({
  capability: z.literal("transfer"),
  mode: custodyModeSchema,
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  amountInput: z.string().min(1),
  amountAtomic: z.string().min(1).optional(),
  asset: executionAssetSchema,
  senderAccountId: z.string().uuid().optional(),
  senderWalletId: z.string().uuid().optional(),
  recipient: socialRecipientSchema,
  providerHint: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

export const executionResultSchema = z.object({
  status: paymentExecutionStatusSchema,
  txHash: z.string().min(1).optional(),
  externalExecutionId: z.string().min(1).optional(),
  explorerUrl: z.string().url().optional(),
  raw: z.record(z.string(), z.unknown()).default({}),
  completedAt: z.string().datetime().optional()
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;

export const channelReplySchema = z.object({
  channel: socialChannelSchema,
  targetEventId: z.string().min(1),
  targetHandle: z.string().regex(/^@[a-z0-9_]{1,15}$/i).optional(),
  text: z.string().min(1),
  status: channelReplyStatusSchema.default("pending"),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type ChannelReply = z.infer<typeof channelReplySchema>;

export const paymentExecutionSnapshotSchema = z.object({
  status: paymentExecutionStatusSchema,
  txHash: z.string().optional(),
  provider: z.string().optional()
});

export const paymentIntentDraftSchema = z.object({
  socialEventId: z.string().uuid().optional(),
  payerAccountId: z.string().uuid().optional(),
  recipientAccountId: z.string().uuid().optional(),
  requestedRecipientHandle: z.string().optional(),
  requestedRecipientAddress: z.string().optional(),
  command: socialCommandSchema.optional(),
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  assetSymbol: z.string().min(1),
  amountInput: z.string().min(1),
  amountAtomic: z.string().optional(),
  policyVerdict: policyVerdictSchema,
  executionPlan: executionPlanSchema.optional(),
  replyPayload: channelReplySchema.optional()
});

export const paymentIntentSchema = paymentIntentDraftSchema.extend({
  id: z.string().uuid(),
  status: paymentIntentStatusSchema,
  executionState: paymentExecutionSnapshotSchema.optional(),
  replyState: channelReplyStatusSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type PaymentIntentDraft = z.infer<typeof paymentIntentDraftSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;

export const tokenAllowlistEntrySchema = z.object({
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  symbol: z.string().min(1),
  tokenAddress: z.string().optional(),
  decimals: z.number().int().positive().optional(),
  isEnabled: z.boolean().default(true)
});

export type TokenAllowlistEntry = z.infer<typeof tokenAllowlistEntrySchema>;

export const walletProvisionRequestSchema = z.object({
  accountId: z.string().uuid(),
  agentId: z.string().uuid(),
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  requestedAddress: z.string().optional()
});

export const walletProvisionResultSchema = z.object({
  address: z.string().min(1),
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  custodyMode: custodyModeSchema,
  provider: z.string().min(1),
  externalWalletId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type WalletProvisionRequest = z.infer<typeof walletProvisionRequestSchema>;
export type WalletProvisionResult = z.infer<typeof walletProvisionResultSchema>;

export const paymentPreviewRequestSchema = z.object({
  text: z.string().min(1),
  actorHandle: z.string().optional(),
  targetHandle: z.string().regex(/^@[a-z0-9_]{1,15}$/i).optional()
});

export const paymentPreviewResponseSchema = z.object({
  preview: paymentIntentDraftSchema,
  helpText: z.string().optional()
});

export type PaymentPreviewRequest = z.infer<typeof paymentPreviewRequestSchema>;
export type PaymentPreviewResponse = z.infer<typeof paymentPreviewResponseSchema>;

export const payoutDestinationUpsertRequestSchema = z.object({
  chainFamily: chainFamilySchema.optional(),
  chainName: z.string().min(1),
  address: z.string().min(1),
  label: z.string().min(1).optional(),
  makeDefault: z.boolean().default(true)
});

export const walletUpsertRequestSchema = z.object({
  chainFamily: chainFamilySchema.optional(),
  chainName: z.string().min(1),
  address: z.string().min(1).optional(),
  makeDefault: z.boolean().default(true)
});

export type PayoutDestinationUpsertRequest = z.infer<typeof payoutDestinationUpsertRequestSchema>;
export type WalletUpsertRequest = z.infer<typeof walletUpsertRequestSchema>;

export const manualXEventSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  authorHandle: z.string().min(1),
  authorExternalId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional()
});

export const xEventsIngressRequestSchema = z
  .object({
    source: socialSourceSchema.default("manual"),
    events: z.array(manualXEventSchema).optional()
  })
  .passthrough();

export type XEventsIngressRequest = z.infer<typeof xEventsIngressRequestSchema>;

export type AddressValidationResult = {
  ok: boolean;
  normalizedAddress?: string;
  reason?: string;
};

export type BuildTransferPlanInput = {
  mode: CustodyMode;
  senderAccountId?: string;
  senderWalletId?: string;
  assetSymbol: string;
  tokenAddress?: string;
  decimals?: number;
  amountInput: string;
  recipient: SocialRecipient;
  metadata?: Record<string, unknown>;
};

export interface ChainDriver {
  readonly descriptor: ChainDescriptor;
  validateAddress(address: string): AddressValidationResult;
  buildTransferPlan(input: BuildTransferPlanInput): ExecutionPlan;
}

export const custodyWalletContextSchema = z.object({
  id: z.string().uuid(),
  chainFamily: chainFamilySchema,
  chainName: z.string().min(1),
  address: z.string().min(1),
  custodyMode: custodyModeSchema,
  provider: z.string().min(1),
  externalWalletId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type CustodyWalletContext = z.infer<typeof custodyWalletContextSchema>;

export interface CustodyProvider {
  readonly mode: CustodyMode;
  provisionWallet(input: WalletProvisionRequest): Promise<WalletProvisionResult>;
  executePlan(
    plan: ExecutionPlan,
    context?: {
      wallet?: CustodyWalletContext;
    }
  ): Promise<ExecutionResult>;
}

export interface ChannelAdapter {
  readonly channel: SocialChannel;
  sendReply(reply: ChannelReply): Promise<{
    externalReplyId: string;
    deliveredAt: string;
    reply: ChannelReply;
  }>;
}

export interface EventSource {
  readonly name: string;
  readonly mode: "webhook" | "polling";
  normalizeEvents(payload: unknown): Promise<NormalizedSocialEvent[]>;
}

export interface CapabilityHandler<TInput = unknown> {
  readonly capability: string;
  buildPlan(input: TInput): Promise<ExecutionPlan>;
}
