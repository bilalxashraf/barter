import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import {
  chainFamilyValues,
  channelReplyStatusValues,
  custodyModeValues,
  paymentExecutionStatusValues,
  paymentIntentStatusValues,
  socialChannelValues,
  socialSourceValues,
  type ChannelReply,
  type ExecutionPlan,
  type PolicyVerdict,
  type SocialCommand
} from "@barter/contracts";

export const socialEventIngestionStatusValues = [
  "received",
  "queued",
  "processed",
  "duplicate",
  "failed"
] as const;

export type SocialEventIngestionStatus = (typeof socialEventIngestionStatusValues)[number];

const emptyJsonObject = sql`'{}'::jsonb`;
const now = () => new Date();

export const socialChannelEnum = pgEnum("social_channel", socialChannelValues);
export const socialSourceEnum = pgEnum("social_source", socialSourceValues);
export const chainFamilyEnum = pgEnum("chain_family", chainFamilyValues);
export const custodyModeEnum = pgEnum("custody_mode", custodyModeValues);
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", paymentIntentStatusValues);
export const paymentExecutionStatusEnum = pgEnum(
  "payment_execution_status",
  paymentExecutionStatusValues
);
export const channelReplyStatusEnum = pgEnum("channel_reply_status", channelReplyStatusValues);
export const socialEventIngestionStatusEnum = pgEnum(
  "social_event_ingestion_status",
  socialEventIngestionStatusValues
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    primaryHandle: text("primary_handle"),
    profileImageUrl: text("profile_image_url"),
    onboardingStatus: text("onboarding_status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    primaryHandleIdx: uniqueIndex("accounts_primary_handle_idx").on(table.primaryHandle)
  })
);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    defaultChannel: socialChannelEnum("default_channel").notNull().default("x"),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    slugIdx: uniqueIndex("agents_slug_idx").on(table.slug)
  })
);

export const channelAccounts = pgTable(
  "channel_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    channel: socialChannelEnum("channel").notNull(),
    externalUserId: text("external_user_id").notNull(),
    handle: text("handle").notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    rawProfile: jsonb("raw_profile").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    externalUserIdx: uniqueIndex("channel_accounts_external_user_idx").on(
      table.channel,
      table.externalUserId
    ),
    handleIdx: uniqueIndex("channel_accounts_handle_idx").on(table.channel, table.handle),
    accountIdx: index("channel_accounts_account_idx").on(table.accountId)
  })
);

export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    chainFamily: chainFamilyEnum("chain_family").notNull(),
    chainName: text("chain_name").notNull(),
    address: text("address").notNull(),
    custodyMode: custodyModeEnum("custody_mode").notNull(),
    provider: text("provider").notNull(),
    externalWalletId: text("external_wallet_id"),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountChainDefaultIdx: index("wallet_accounts_account_chain_default_idx").on(
      table.accountId,
      table.chainName,
      table.isDefault
    ),
    accountAddressIdx: uniqueIndex("wallet_accounts_account_address_idx").on(
      table.accountId,
      table.chainName,
      table.address
    )
  })
);

export const payoutDestinations = pgTable(
  "payout_destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    chainFamily: chainFamilyEnum("chain_family").notNull(),
    chainName: text("chain_name").notNull(),
    address: text("address").notNull(),
    label: text("label"),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountChainDefaultIdx: index("payout_destinations_account_chain_default_idx").on(
      table.accountId,
      table.chainName,
      table.isDefault
    ),
    accountAddressIdx: uniqueIndex("payout_destinations_account_address_idx").on(
      table.accountId,
      table.chainName,
      table.address
    )
  })
);

export const agentPolicies = pgTable(
  "agent_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    active: boolean("active").notNull().default(true),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    agentCodeIdx: uniqueIndex("agent_policies_agent_code_idx").on(table.agentId, table.code)
  })
);

export const tokenAllowlists = pgTable(
  "token_allowlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    chainFamily: chainFamilyEnum("chain_family").notNull(),
    chainName: text("chain_name").notNull(),
    symbol: text("symbol").notNull(),
    tokenAddress: text("token_address"),
    decimals: integer("decimals"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenIdx: uniqueIndex("token_allowlists_chain_symbol_idx").on(table.chainName, table.symbol),
    tokenAgentIdx: index("token_allowlists_agent_idx").on(table.agentId)
  })
);

export const socialEvents = pgTable(
  "social_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    channelAccountId: uuid("channel_account_id").references(() => channelAccounts.id, {
      onDelete: "set null"
    }),
    externalEventId: text("external_event_id").notNull(),
    externalConversationId: text("external_conversation_id"),
    channel: socialChannelEnum("channel").notNull(),
    source: socialSourceEnum("source").notNull(),
    authorHandle: text("author_handle").notNull(),
    authorExternalId: text("author_external_id"),
    text: text("text").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    ingestionStatus: socialEventIngestionStatusEnum("ingestion_status").notNull().default("received"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    externalEventIdx: uniqueIndex("social_events_external_event_idx").on(
      table.channel,
      table.externalEventId
    ),
    authorIdx: index("social_events_author_idx").on(table.authorHandle)
  })
);

export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    socialEventId: uuid("social_event_id").references(() => socialEvents.id, { onDelete: "set null" }),
    payerAccountId: uuid("payer_account_id").references(() => accounts.id, { onDelete: "set null" }),
    recipientAccountId: uuid("recipient_account_id").references(() => accounts.id, {
      onDelete: "set null"
    }),
    requestedRecipientHandle: text("requested_recipient_handle"),
    requestedRecipientAddress: text("requested_recipient_address"),
    command: jsonb("command").$type<SocialCommand>(),
    chainFamily: chainFamilyEnum("chain_family").notNull(),
    chainName: text("chain_name").notNull(),
    assetSymbol: text("asset_symbol").notNull(),
    amountInput: text("amount_input").notNull(),
    amountAtomic: text("amount_atomic"),
    policyVerdict: jsonb("policy_verdict").$type<PolicyVerdict>().notNull(),
    executionPlan: jsonb("execution_plan").$type<ExecutionPlan>(),
    replyPayload: jsonb("reply_payload").$type<ChannelReply>(),
    executionState: jsonb("execution_state").$type<Record<string, unknown>>(),
    replyState: channelReplyStatusEnum("reply_state"),
    status: paymentIntentStatusEnum("status").notNull().default("previewed"),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    socialEventIdx: uniqueIndex("payment_intents_social_event_idx").on(table.socialEventId),
    payerIdx: index("payment_intents_payer_idx").on(table.payerAccountId),
    recipientIdx: index("payment_intents_recipient_idx").on(table.recipientAccountId)
  })
);

export const paymentExecutions = pgTable(
  "payment_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: paymentExecutionStatusEnum("status").notNull().default("pending"),
    txHash: text("tx_hash"),
    externalExecutionId: text("external_execution_id"),
    explorerUrl: text("explorer_url"),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    paymentIntentIdx: index("payment_executions_payment_intent_idx").on(table.paymentIntentId),
    externalExecutionIdx: uniqueIndex("payment_executions_external_execution_idx").on(
      table.externalExecutionId
    )
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    actorAccountId: uuid("actor_account_id").references(() => accounts.id, { onDelete: "set null" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    entityIdx: index("audit_events_entity_idx").on(table.entityType, table.entityId)
  })
);

export const oauthCredentials = pgTable(
  "oauth_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    channel: socialChannelEnum("channel").notNull(),
    externalUserId: text("external_user_id").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenType: text("token_type").notNull().default("bearer"),
    scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    externalUserIdx: uniqueIndex("oauth_credentials_external_user_idx").on(
      table.channel,
      table.externalUserId
    ),
    accountIdx: index("oauth_credentials_account_idx").on(table.accountId)
  })
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(emptyJsonObject),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("auth_sessions_token_hash_idx").on(table.sessionTokenHash),
    accountIdx: index("auth_sessions_account_idx").on(table.accountId)
  })
);

export const timestampNow = now;
