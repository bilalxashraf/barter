import { randomUUID } from "node:crypto";

import { listChainDescriptors, listSupportedAssetsForChain } from "@barter/chains";
import {
  channelReplySchema,
  paymentIntentSchema,
  type ChannelReply,
  type NormalizedSocialEvent,
  type PaymentIntentDraft,
  type PaymentPreviewResponse,
  payoutDestinationUpsertRequestSchema,
  socialCommandSchema,
  tokenAllowlistEntrySchema,
  type WalletProvisionResult,
  walletProvisionResultSchema
} from "@barter/contracts";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import type { Database } from "./client";
import { createSessionToken, decryptSecret, encryptSecret, hashSessionToken } from "./crypto";
import {
  accounts,
  agents,
  auditEvents,
  authSessions,
  channelAccounts,
  oauthCredentials,
  paymentExecutions,
  paymentIntents,
  payoutDestinations,
  socialEvents,
  tokenAllowlists,
  walletAccounts,
  type SocialEventIngestionStatus,
  timestampNow
} from "./schema";

export type RepositoryOptions = {
  encryptionKey?: string;
};

export type SessionActor = {
  sessionId: string;
  sessionToken: string;
  accountId: string;
  handle?: string;
  displayName: string;
  expiresAt: string;
};

export type AccountWorkspace = {
  account: {
    id: string;
    displayName: string;
    primaryHandle?: string | null;
    profileImageUrl?: string | null;
    onboardingStatus: string;
  };
  channelAccounts: Array<{
    id: string;
    channel: "x";
    externalUserId: string;
    handle: string;
    isPrimary: boolean;
  }>;
  wallets: Array<{
    id: string;
    chainFamily: string;
    chainName: string;
    address: string;
    provider: string;
    custodyMode: string;
    isDefault: boolean;
  }>;
  payoutDestinations: Array<{
    id: string;
    chainFamily: string;
    chainName: string;
    address: string;
    label?: string | null;
    isDefault: boolean;
  }>;
  allowlist: Array<{
    id: string;
    chainFamily: string;
    chainName: string;
    symbol: string;
    tokenAddress?: string | null;
    decimals?: number | null;
  }>;
};

export function createBarterRepository(db: Database, options: RepositoryOptions = {}) {
  return {
    async ensureBootstrapAgent(input?: { slug?: string; displayName?: string }) {
      const slug = (input?.slug ?? "barterpayments").trim().toLowerCase();
      const displayName = input?.displayName ?? "BarterPayments";

      const existing = await db.query.agents.findFirst({
        where: eq(agents.slug, slug)
      });

      if (existing) {
        return existing;
      }

      const inserted = await db
        .insert(agents)
        .values({
          slug,
          displayName,
          defaultChannel: "x",
          status: "active",
          metadata: {
            bootstrap: true
          }
        })
        .returning();

      return inserted[0]!;
    },

    async seedDefaultTokenAllowlist(agentId?: string) {
      const descriptors = listChainDescriptors();

      for (const descriptor of descriptors) {
        if (!descriptor.live && descriptor.family !== "svm") {
          continue;
        }

        for (const asset of listSupportedAssetsForChain(descriptor.name)) {
          await db
            .insert(tokenAllowlists)
            .values({
              agentId,
              chainFamily: descriptor.family,
              chainName: descriptor.name,
              symbol: asset.symbol,
              tokenAddress: asset.tokenAddress,
              decimals: asset.decimals,
              isEnabled: true,
              metadata: {
                seeded: true
              }
            })
            .onConflictDoUpdate({
              target: [tokenAllowlists.chainName, tokenAllowlists.symbol],
              set: {
                chainFamily: descriptor.family,
                tokenAddress: asset.tokenAddress,
                decimals: asset.decimals,
                isEnabled: true,
                updatedAt: timestampNow()
              }
            });
        }
      }
    },

    async findTokenAllowlistEntry(input: { chainName: string; symbol: string }) {
      const chainName = input.chainName.trim().toLowerCase();
      const symbol = input.symbol.trim().toUpperCase();

      const row = await db.query.tokenAllowlists.findFirst({
        where: and(
          eq(tokenAllowlists.chainName, chainName),
          eq(tokenAllowlists.symbol, symbol),
          eq(tokenAllowlists.isEnabled, true)
        )
      });

      if (!row) {
        return null;
      }

      return tokenAllowlistEntrySchema.parse({
        chainFamily: row.chainFamily,
        chainName: row.chainName,
        symbol: row.symbol,
        tokenAddress: row.tokenAddress ?? undefined,
        decimals: row.decimals ?? undefined,
        isEnabled: row.isEnabled
      });
    },

    async listTokenAllowlist() {
      return db.query.tokenAllowlists.findMany({
        where: eq(tokenAllowlists.isEnabled, true),
        orderBy: [tokenAllowlists.chainName, tokenAllowlists.symbol]
      });
    },

    async upsertXAccount(input: {
      externalUserId: string;
      handle: string;
      displayName: string;
      profileImageUrl?: string;
      rawProfile?: Record<string, unknown>;
    }) {
      const normalizedHandle = normalizeHandle(input.handle);
      const existingChannel = await db.query.channelAccounts.findFirst({
        where: or(
          eq(channelAccounts.externalUserId, input.externalUserId),
          eq(channelAccounts.handle, normalizedHandle)
        )
      });

      const accountId = existingChannel?.accountId ?? randomUUID();
      const metadata = input.rawProfile ?? {};

      if (existingChannel) {
        await db
          .update(accounts)
          .set({
            displayName: input.displayName,
            primaryHandle: normalizedHandle,
            profileImageUrl: input.profileImageUrl,
            updatedAt: timestampNow()
          })
          .where(eq(accounts.id, accountId));
      } else {
        await db.insert(accounts).values({
          id: accountId,
          displayName: input.displayName,
          primaryHandle: normalizedHandle,
          profileImageUrl: input.profileImageUrl,
          onboardingStatus: "active",
          metadata: {
            bootstrap: true
          }
        });
      }

      await db
        .insert(channelAccounts)
        .values({
          accountId,
          channel: "x",
          externalUserId: input.externalUserId,
          handle: normalizedHandle,
          isPrimary: true,
          rawProfile: metadata,
          verifiedAt: timestampNow()
        })
        .onConflictDoUpdate({
          target: [channelAccounts.channel, channelAccounts.externalUserId],
          set: {
            accountId,
            handle: normalizedHandle,
            isPrimary: true,
            rawProfile: metadata,
            verifiedAt: timestampNow(),
            updatedAt: timestampNow()
          }
        });

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId)
      });
      const channelAccount = await db.query.channelAccounts.findFirst({
        where: and(eq(channelAccounts.accountId, accountId), eq(channelAccounts.channel, "x"))
      });

      return {
        account: account!,
        channelAccount: channelAccount!
      };
    },

    async createDevelopmentSession(input?: { handle?: string; displayName?: string }) {
      const handle = normalizeHandle(input?.handle ?? "@builder");
      const externalUserId = `dev_${handle.slice(1)}`;
      const account = await this.upsertXAccount({
        externalUserId,
        handle,
        displayName: input?.displayName ?? handle.slice(1),
        rawProfile: {
          localDevelopment: true
        }
      });

      return this.createAuthSession({
        accountId: account.account.id,
        userAgent: "local-dev"
      });
    },

    async storeOAuthCredential(input: {
      accountId: string;
      externalUserId: string;
      accessToken: string;
      refreshToken?: string;
      tokenType?: string;
      scopes?: string[];
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    }) {
      const encryptionKey = options.encryptionKey;
      if (!encryptionKey) {
        throw new Error("An encryption key is required to persist OAuth credentials");
      }

      const accessTokenEncrypted = encryptSecret(input.accessToken, encryptionKey);
      const refreshTokenEncrypted = input.refreshToken
        ? encryptSecret(input.refreshToken, encryptionKey)
        : null;

      await db
        .insert(oauthCredentials)
        .values({
          accountId: input.accountId,
          channel: "x",
          externalUserId: input.externalUserId,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenType: input.tokenType ?? "bearer",
          scopes: input.scopes ?? [],
          expiresAt: input.expiresAt,
          metadata: input.metadata ?? {}
        })
        .onConflictDoUpdate({
          target: [oauthCredentials.channel, oauthCredentials.externalUserId],
          set: {
            accountId: input.accountId,
            accessTokenEncrypted,
            refreshTokenEncrypted,
            tokenType: input.tokenType ?? "bearer",
            scopes: input.scopes ?? [],
            expiresAt: input.expiresAt,
            metadata: input.metadata ?? {},
            updatedAt: timestampNow()
          }
        });
    },

    async findOAuthCredentialByHandle(handle: string) {
      const encryptionKey = options.encryptionKey;
      if (!encryptionKey) {
        throw new Error("An encryption key is required to load OAuth credentials");
      }

      const normalizedHandle = normalizeHandle(handle);
      const row = await db
        .select({
          accountId: oauthCredentials.accountId,
          externalUserId: oauthCredentials.externalUserId,
          channel: oauthCredentials.channel,
          accessTokenEncrypted: oauthCredentials.accessTokenEncrypted,
          refreshTokenEncrypted: oauthCredentials.refreshTokenEncrypted,
          tokenType: oauthCredentials.tokenType,
          scopes: oauthCredentials.scopes,
          expiresAt: oauthCredentials.expiresAt,
          metadata: oauthCredentials.metadata,
          handle: channelAccounts.handle
        })
        .from(channelAccounts)
        .innerJoin(oauthCredentials, eq(oauthCredentials.accountId, channelAccounts.accountId))
        .where(
          and(eq(channelAccounts.handle, normalizedHandle), eq(oauthCredentials.channel, "x"))
        )
        .limit(1);

      const credential = row[0];
      if (!credential) {
        return null;
      }

      return {
        accountId: credential.accountId,
        externalUserId: credential.externalUserId,
        channel: credential.channel,
        handle: credential.handle,
        accessToken: decryptSecret(credential.accessTokenEncrypted, encryptionKey),
        tokenType: credential.tokenType,
        scopes: credential.scopes,
        ...(credential.refreshTokenEncrypted
          ? {
              refreshToken: decryptSecret(credential.refreshTokenEncrypted, encryptionKey)
            }
          : {}),
        ...(credential.expiresAt ? { expiresAt: credential.expiresAt.toISOString() } : {}),
        metadata: credential.metadata
      };
    },

    async createAuthSession(input: {
      accountId: string;
      ttlHours?: number;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    }): Promise<SessionActor> {
      const sessionToken = createSessionToken();
      const sessionTokenHash = hashSessionToken(sessionToken);
      const ttlHours = input.ttlHours ?? 24 * 14;
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      const inserted = await db
        .insert(authSessions)
        .values({
          accountId: input.accountId,
          sessionTokenHash,
          userAgent: input.userAgent,
          expiresAt,
          metadata: input.metadata ?? {}
        })
        .returning();

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, input.accountId)
      });
      const channel = await db.query.channelAccounts.findFirst({
        where: and(eq(channelAccounts.accountId, input.accountId), eq(channelAccounts.channel, "x"))
      });

      const sessionActor = {
        sessionId: inserted[0]!.id,
        sessionToken,
        accountId: input.accountId,
        displayName: account?.displayName ?? "unknown",
        expiresAt: expiresAt.toISOString()
      };

      return channel?.handle
        ? {
            ...sessionActor,
            handle: channel.handle
          }
        : sessionActor;
    },

    async getAuthSession(sessionToken: string): Promise<SessionActor | null> {
      const sessionTokenHash = hashSessionToken(sessionToken);
      const row = await db.query.authSessions.findFirst({
        where: and(
          eq(authSessions.sessionTokenHash, sessionTokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date())
        )
      });

      if (!row) {
        return null;
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, row.accountId)
      });
      const channel = await db.query.channelAccounts.findFirst({
        where: and(eq(channelAccounts.accountId, row.accountId), eq(channelAccounts.channel, "x"))
      });

      if (!account) {
        return null;
      }

      const sessionActor = {
        sessionId: row.id,
        sessionToken,
        accountId: row.accountId,
        displayName: account.displayName,
        expiresAt: row.expiresAt.toISOString()
      };

      return channel?.handle
        ? {
            ...sessionActor,
            handle: channel.handle
          }
        : sessionActor;
    },

    async revokeAuthSession(sessionToken: string) {
      const sessionTokenHash = hashSessionToken(sessionToken);
      await db
        .update(authSessions)
        .set({
          revokedAt: timestampNow(),
          updatedAt: timestampNow()
        })
        .where(eq(authSessions.sessionTokenHash, sessionTokenHash));
    },

    async getAccountWorkspace(accountId: string): Promise<AccountWorkspace | null> {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId)
      });

      if (!account) {
        return null;
      }

      const [channels, wallets, payouts, allowlist] = await Promise.all([
        db.query.channelAccounts.findMany({
          where: eq(channelAccounts.accountId, accountId),
          orderBy: [desc(channelAccounts.isPrimary), channelAccounts.handle]
        }),
        db.query.walletAccounts.findMany({
          where: eq(walletAccounts.accountId, accountId),
          orderBy: [walletAccounts.chainName, desc(walletAccounts.isDefault)]
        }),
        db.query.payoutDestinations.findMany({
          where: eq(payoutDestinations.accountId, accountId),
          orderBy: [payoutDestinations.chainName, desc(payoutDestinations.isDefault)]
        }),
        db.query.tokenAllowlists.findMany({
          where: eq(tokenAllowlists.isEnabled, true),
          orderBy: [tokenAllowlists.chainName, tokenAllowlists.symbol]
        })
      ]);

      return {
        account: {
          id: account.id,
          displayName: account.displayName,
          primaryHandle: account.primaryHandle,
          profileImageUrl: account.profileImageUrl,
          onboardingStatus: account.onboardingStatus
        },
        channelAccounts: channels.map((channel) => ({
          id: channel.id,
          channel: channel.channel,
          externalUserId: channel.externalUserId,
          handle: channel.handle,
          isPrimary: channel.isPrimary
        })),
        wallets: wallets.map((wallet) => ({
          id: wallet.id,
          chainFamily: wallet.chainFamily,
          chainName: wallet.chainName,
          address: wallet.address,
          provider: wallet.provider,
          custodyMode: wallet.custodyMode,
          isDefault: wallet.isDefault
        })),
        payoutDestinations: payouts.map((destination) => ({
          id: destination.id,
          chainFamily: destination.chainFamily,
          chainName: destination.chainName,
          address: destination.address,
          label: destination.label,
          isDefault: destination.isDefault
        })),
        allowlist: allowlist.map((entry) => ({
          id: entry.id,
          chainFamily: entry.chainFamily,
          chainName: entry.chainName,
          symbol: entry.symbol,
          tokenAddress: entry.tokenAddress,
          decimals: entry.decimals
        }))
      };
    },

    async findAccountByHandle(handle: string) {
      const normalizedHandle = normalizeHandle(handle);
      const channel = await db.query.channelAccounts.findFirst({
        where: eq(channelAccounts.handle, normalizedHandle)
      });

      if (!channel) {
        return null;
      }

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, channel.accountId)
      });

      if (!account) {
        return null;
      }

      return {
        account,
        channel
      };
    },

    async upsertPayoutDestination(input: {
      accountId: string;
      chainFamily: string;
      chainName: string;
      address: string;
      label?: string;
      makeDefault?: boolean;
    }) {
      const parsed = payoutDestinationUpsertRequestSchema.parse({
        chainFamily: input.chainFamily,
        chainName: input.chainName,
        address: input.address,
        label: input.label,
        makeDefault: input.makeDefault ?? true
      });

      if (parsed.makeDefault) {
        await db
          .update(payoutDestinations)
          .set({
            isDefault: false,
            updatedAt: timestampNow()
          })
          .where(
            and(
              eq(payoutDestinations.accountId, input.accountId),
              eq(payoutDestinations.chainName, parsed.chainName)
            )
          );
      }

      const inserted = await db
        .insert(payoutDestinations)
        .values({
          accountId: input.accountId,
          chainFamily: parsed.chainFamily ?? "other",
          chainName: parsed.chainName,
          address: parsed.address,
          label: parsed.label,
          isDefault: parsed.makeDefault ?? true
        })
        .onConflictDoUpdate({
          target: [
            payoutDestinations.accountId,
            payoutDestinations.chainName,
            payoutDestinations.address
          ],
          set: {
            chainFamily: parsed.chainFamily ?? "other",
            label: parsed.label,
            isDefault: parsed.makeDefault ?? true,
            updatedAt: timestampNow()
          }
        })
        .returning();

      return inserted[0]!;
    },

    async createOrAttachWalletAccount(input: {
      accountId: string;
      agentId: string;
      chainFamily: string;
      chainName: string;
      wallet: WalletProvisionResult;
      makeDefault?: boolean;
    }) {
      const wallet = walletProvisionResultSchema.parse(input.wallet);

      if (input.makeDefault ?? true) {
        await db
          .update(walletAccounts)
          .set({
            isDefault: false,
            updatedAt: timestampNow()
          })
          .where(
            and(
              eq(walletAccounts.accountId, input.accountId),
              eq(walletAccounts.chainName, input.chainName)
            )
          );
      }

      const inserted = await db
        .insert(walletAccounts)
        .values({
          accountId: input.accountId,
          agentId: input.agentId,
          chainFamily: wallet.chainFamily,
          chainName: wallet.chainName,
          address: wallet.address,
          custodyMode: wallet.custodyMode,
          provider: wallet.provider,
          externalWalletId: wallet.externalWalletId,
          isDefault: input.makeDefault ?? true,
          metadata: wallet.metadata
        })
        .onConflictDoUpdate({
          target: [walletAccounts.accountId, walletAccounts.chainName, walletAccounts.address],
          set: {
            agentId: input.agentId,
            chainFamily: wallet.chainFamily,
            custodyMode: wallet.custodyMode,
            provider: wallet.provider,
            externalWalletId: wallet.externalWalletId,
            isDefault: input.makeDefault ?? true,
            metadata: wallet.metadata,
            updatedAt: timestampNow()
          }
        })
        .returning();

      return inserted[0]!;
    },

    async findWalletById(walletId: string) {
      return db.query.walletAccounts.findFirst({
        where: eq(walletAccounts.id, walletId)
      });
    },

    async findDefaultWallet(accountId: string, chainName: string) {
      return (
        (await db.query.walletAccounts.findFirst({
          where: and(
            eq(walletAccounts.accountId, accountId),
            eq(walletAccounts.chainName, chainName),
            eq(walletAccounts.isDefault, true)
          )
        })) ??
        (await db.query.walletAccounts.findFirst({
          where: and(eq(walletAccounts.accountId, accountId), eq(walletAccounts.chainName, chainName)),
          orderBy: [desc(walletAccounts.createdAt)]
        }))
      );
    },

    async findDefaultPayoutDestinationByHandle(input: { handle: string; chainName: string }) {
      const normalizedHandle = normalizeHandle(input.handle);
      const row = await db
        .select({
          accountId: accounts.id,
          address: payoutDestinations.address,
          chainFamily: payoutDestinations.chainFamily
        })
        .from(channelAccounts)
        .innerJoin(accounts, eq(accounts.id, channelAccounts.accountId))
        .innerJoin(
          payoutDestinations,
          and(
            eq(payoutDestinations.accountId, accounts.id),
            eq(payoutDestinations.chainName, input.chainName),
            eq(payoutDestinations.isDefault, true)
          )
        )
        .where(eq(channelAccounts.handle, normalizedHandle))
        .limit(1);

      return row[0] ?? null;
    },

    async insertSocialEvent(input: NormalizedSocialEvent & { agentId: string }) {
      const accountRecord = await this.findAccountByHandle(input.authorHandle);

      const existing = await db.query.socialEvents.findFirst({
        where: and(
          eq(socialEvents.channel, input.channel),
          eq(socialEvents.externalEventId, input.externalEventId)
        )
      });

      if (existing) {
        return {
          inserted: false,
          event: existing
        };
      }

      const inserted = await db
        .insert(socialEvents)
        .values({
          agentId: input.agentId,
          accountId: accountRecord?.account.id,
          channelAccountId: accountRecord?.channel.id,
          externalEventId: input.externalEventId,
          externalConversationId: input.externalConversationId,
          channel: input.channel,
          source: input.source,
          authorHandle: normalizeHandle(input.authorHandle),
          authorExternalId: input.authorExternalId,
          text: input.text,
          rawPayload: input.rawPayload,
          ingestionStatus: "received"
        })
        .returning();

      return {
        inserted: true,
        event: inserted[0]!
      };
    },

    async updateSocialEventStatus(
      socialEventId: string,
      ingestionStatus: SocialEventIngestionStatus,
      lastError?: string
    ) {
      await db
        .update(socialEvents)
        .set({
          ingestionStatus,
          lastError,
          updatedAt: timestampNow()
        })
        .where(eq(socialEvents.id, socialEventId));
    },

    async findSocialEventById(socialEventId: string) {
      return db.query.socialEvents.findFirst({
        where: eq(socialEvents.id, socialEventId)
      });
    },

    async createPaymentIntentFromPreview(input: {
      socialEventId?: string;
      preview: PaymentIntentDraft;
      status: "queued" | "policy_rejected" | "failed" | "previewed" | "executed" | "reply_pending";
      failureCode?: string;
      failureReason?: string;
    }) {
      const inserted = await db
        .insert(paymentIntents)
        .values({
          socialEventId: input.socialEventId,
          payerAccountId: input.preview.payerAccountId,
          recipientAccountId: input.preview.recipientAccountId,
          requestedRecipientHandle: input.preview.requestedRecipientHandle,
          requestedRecipientAddress: input.preview.requestedRecipientAddress,
          command: input.preview.command
            ? socialCommandSchema.parse(input.preview.command)
            : undefined,
          chainFamily: input.preview.chainFamily,
          chainName: input.preview.chainName,
          assetSymbol: input.preview.assetSymbol,
          amountInput: input.preview.amountInput,
          amountAtomic: input.preview.amountAtomic,
          policyVerdict: input.preview.policyVerdict,
          executionPlan: input.preview.executionPlan,
          replyPayload: input.preview.replyPayload
            ? channelReplySchema.parse(input.preview.replyPayload)
            : undefined,
          executionState: undefined,
          replyState: input.preview.replyPayload?.status,
          status: input.status,
          failureCode: input.failureCode,
          failureReason: input.failureReason
        })
        .returning();

      return inserted[0]!;
    },

    async updatePaymentIntent(input: {
      paymentIntentId: string;
      status?: string;
      replyState?: string;
      replyPayload?: ChannelReply;
      executionState?: Record<string, unknown>;
      failureCode?: string;
      failureReason?: string;
    }) {
      await db
        .update(paymentIntents)
        .set({
          status: input.status as any,
          replyState: input.replyState as any,
          replyPayload: input.replyPayload,
          executionState: input.executionState,
          failureCode: input.failureCode,
          failureReason: input.failureReason,
          updatedAt: timestampNow()
        })
        .where(eq(paymentIntents.id, input.paymentIntentId));
    },

    async getPaymentIntentDetails(paymentIntentId: string) {
      const [intentRow, executions, audits] = await Promise.all([
        db.query.paymentIntents.findFirst({
          where: eq(paymentIntents.id, paymentIntentId)
        }),
        db.query.paymentExecutions.findMany({
          where: eq(paymentExecutions.paymentIntentId, paymentIntentId),
          orderBy: [desc(paymentExecutions.createdAt)]
        }),
        db.query.auditEvents.findMany({
          where: and(eq(auditEvents.entityType, "payment_intent"), eq(auditEvents.entityId, paymentIntentId)),
          orderBy: [desc(auditEvents.createdAt)]
        })
      ]);

      if (!intentRow) {
        return null;
      }

      const intent = paymentIntentSchema.parse({
        id: intentRow.id,
        socialEventId: intentRow.socialEventId ?? undefined,
        payerAccountId: intentRow.payerAccountId ?? undefined,
        recipientAccountId: intentRow.recipientAccountId ?? undefined,
        requestedRecipientHandle: intentRow.requestedRecipientHandle ?? undefined,
        requestedRecipientAddress: intentRow.requestedRecipientAddress ?? undefined,
        command: intentRow.command ?? undefined,
        chainFamily: intentRow.chainFamily,
        chainName: intentRow.chainName,
        assetSymbol: intentRow.assetSymbol,
        amountInput: intentRow.amountInput,
        amountAtomic: intentRow.amountAtomic ?? undefined,
        policyVerdict: intentRow.policyVerdict,
        executionPlan: intentRow.executionPlan ?? undefined,
        replyPayload: intentRow.replyPayload ?? undefined,
        executionState: intentRow.executionState
          ? {
              status:
                typeof intentRow.executionState.status === "string"
                  ? intentRow.executionState.status
                  : undefined,
              txHash:
                typeof intentRow.executionState.txHash === "string"
                  ? intentRow.executionState.txHash
                  : undefined,
              provider:
                typeof intentRow.executionState.provider === "string"
                  ? intentRow.executionState.provider
                  : undefined
            }
          : undefined,
        replyState: intentRow.replyState ?? undefined,
        status: intentRow.status,
        createdAt: intentRow.createdAt.toISOString(),
        updatedAt: intentRow.updatedAt.toISOString()
      });

      return {
        intent,
        executions: executions.map((execution) => ({
          id: execution.id,
          status: execution.status,
          provider: execution.provider,
          txHash: execution.txHash,
          externalExecutionId: execution.externalExecutionId,
          explorerUrl: execution.explorerUrl,
          raw: execution.raw,
          completedAt: execution.completedAt?.toISOString(),
          createdAt: execution.createdAt.toISOString(),
          updatedAt: execution.updatedAt.toISOString()
        })),
        auditEvents: audits.map((audit) => ({
          id: audit.id,
          entityType: audit.entityType,
          entityId: audit.entityId,
          eventType: audit.eventType,
          actorAccountId: audit.actorAccountId,
          payload: audit.payload,
          createdAt: audit.createdAt.toISOString()
        }))
      };
    },

    async createPaymentExecution(input: {
      paymentIntentId: string;
      provider: string;
      status: "pending" | "submitted" | "confirmed" | "failed";
      txHash?: string;
      externalExecutionId?: string;
      explorerUrl?: string;
      raw?: Record<string, unknown>;
      completedAt?: Date;
    }) {
      const inserted = await db
        .insert(paymentExecutions)
        .values({
          paymentIntentId: input.paymentIntentId,
          provider: input.provider,
          status: input.status,
          txHash: input.txHash,
          externalExecutionId: input.externalExecutionId,
          explorerUrl: input.explorerUrl,
          raw: input.raw ?? {},
          completedAt: input.completedAt
        })
        .returning();

      return inserted[0]!;
    },

    async appendAuditEvent(input: {
      entityType: string;
      entityId: string;
      eventType: string;
      actorAccountId?: string;
      payload?: Record<string, unknown>;
    }) {
      await db.insert(auditEvents).values({
        entityType: input.entityType,
        entityId: input.entityId,
        eventType: input.eventType,
        actorAccountId: input.actorAccountId,
        payload: input.payload ?? {}
      });
    }
  };
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim().replace(/^@+/, "").toLowerCase();
  return `@${trimmed}`;
}
