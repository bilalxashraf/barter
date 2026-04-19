CREATE TYPE "public"."chain_family" AS ENUM('evm', 'svm', 'other');--> statement-breakpoint
CREATE TYPE "public"."channel_reply_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."custody_mode" AS ENUM('custodial', 'non_custodial', 'mock');--> statement-breakpoint
CREATE TYPE "public"."payment_execution_status" AS ENUM('pending', 'submitted', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('previewed', 'queued', 'policy_rejected', 'executing', 'executed', 'reply_pending', 'replied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."social_channel" AS ENUM('x');--> statement-breakpoint
CREATE TYPE "public"."social_event_ingestion_status" AS ENUM('received', 'queued', 'processed', 'duplicate', 'failed');--> statement-breakpoint
CREATE TYPE "public"."social_source" AS ENUM('webhook', 'polling', 'manual');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"primary_handle" text,
	"profile_image_url" text,
	"onboarding_status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"default_channel" "social_channel" DEFAULT 'x' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_account_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"channel" "social_channel" NOT NULL,
	"external_user_id" text NOT NULL,
	"handle" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"raw_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"channel" "social_channel" NOT NULL,
	"external_user_id" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"token_type" text DEFAULT 'bearer' NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" "payment_execution_status" DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"external_execution_id" text,
	"explorer_url" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"social_event_id" uuid,
	"payer_account_id" uuid,
	"recipient_account_id" uuid,
	"requested_recipient_handle" text,
	"requested_recipient_address" text,
	"command" jsonb,
	"chain_family" "chain_family" NOT NULL,
	"chain_name" text NOT NULL,
	"asset_symbol" text NOT NULL,
	"amount_input" text NOT NULL,
	"amount_atomic" text,
	"policy_verdict" jsonb NOT NULL,
	"execution_plan" jsonb,
	"reply_payload" jsonb,
	"execution_state" jsonb,
	"reply_state" "channel_reply_status",
	"status" "payment_intent_status" DEFAULT 'previewed' NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"chain_family" "chain_family" NOT NULL,
	"chain_name" text NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"account_id" uuid,
	"channel_account_id" uuid,
	"external_event_id" text NOT NULL,
	"external_conversation_id" text,
	"channel" "social_channel" NOT NULL,
	"source" "social_source" NOT NULL,
	"author_handle" text NOT NULL,
	"author_external_id" text,
	"text" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"ingestion_status" "social_event_ingestion_status" DEFAULT 'received' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_allowlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"chain_family" "chain_family" NOT NULL,
	"chain_name" text NOT NULL,
	"symbol" text NOT NULL,
	"token_address" text,
	"decimals" integer,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"chain_family" "chain_family" NOT NULL,
	"chain_name" text NOT NULL,
	"address" text NOT NULL,
	"custody_mode" "custody_mode" NOT NULL,
	"provider" text NOT NULL,
	"external_wallet_id" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_policies" ADD CONSTRAINT "agent_policies_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_account_id_accounts_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_accounts" ADD CONSTRAINT "channel_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_credentials" ADD CONSTRAINT "oauth_credentials_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_executions" ADD CONSTRAINT "payment_executions_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_social_event_id_social_events_id_fk" FOREIGN KEY ("social_event_id") REFERENCES "public"."social_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payer_account_id_accounts_id_fk" FOREIGN KEY ("payer_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_recipient_account_id_accounts_id_fk" FOREIGN KEY ("recipient_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_destinations" ADD CONSTRAINT "payout_destinations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_events" ADD CONSTRAINT "social_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_events" ADD CONSTRAINT "social_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_events" ADD CONSTRAINT "social_events_channel_account_id_channel_accounts_id_fk" FOREIGN KEY ("channel_account_id") REFERENCES "public"."channel_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_allowlists" ADD CONSTRAINT "token_allowlists_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_primary_handle_idx" ON "accounts" USING btree ("primary_handle");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_policies_agent_code_idx" ON "agent_policies" USING btree ("agent_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_idx" ON "auth_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_account_idx" ON "auth_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_accounts_external_user_idx" ON "channel_accounts" USING btree ("channel","external_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_accounts_handle_idx" ON "channel_accounts" USING btree ("channel","handle");--> statement-breakpoint
CREATE INDEX "channel_accounts_account_idx" ON "channel_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_credentials_external_user_idx" ON "oauth_credentials" USING btree ("channel","external_user_id");--> statement-breakpoint
CREATE INDEX "oauth_credentials_account_idx" ON "oauth_credentials" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "payment_executions_payment_intent_idx" ON "payment_executions" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_executions_external_execution_idx" ON "payment_executions" USING btree ("external_execution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_intents_social_event_idx" ON "payment_intents" USING btree ("social_event_id");--> statement-breakpoint
CREATE INDEX "payment_intents_payer_idx" ON "payment_intents" USING btree ("payer_account_id");--> statement-breakpoint
CREATE INDEX "payment_intents_recipient_idx" ON "payment_intents" USING btree ("recipient_account_id");--> statement-breakpoint
CREATE INDEX "payout_destinations_account_chain_default_idx" ON "payout_destinations" USING btree ("account_id","chain_name","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_destinations_account_address_idx" ON "payout_destinations" USING btree ("account_id","chain_name","address");--> statement-breakpoint
CREATE UNIQUE INDEX "social_events_external_event_idx" ON "social_events" USING btree ("channel","external_event_id");--> statement-breakpoint
CREATE INDEX "social_events_author_idx" ON "social_events" USING btree ("author_handle");--> statement-breakpoint
CREATE UNIQUE INDEX "token_allowlists_chain_symbol_idx" ON "token_allowlists" USING btree ("chain_name","symbol");--> statement-breakpoint
CREATE INDEX "token_allowlists_agent_idx" ON "token_allowlists" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "wallet_accounts_account_chain_default_idx" ON "wallet_accounts" USING btree ("account_id","chain_name","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_accounts_account_address_idx" ON "wallet_accounts" USING btree ("account_id","chain_name","address");