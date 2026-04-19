import { createChainRegistry } from "@barter/chains";
import { loadChainRpcUrls, loadWorkerConfig } from "@barter/config";
import { paymentIntentDraftSchema, type PaymentIntentDraft } from "@barter/contracts";
import { createCustodyProvider } from "@barter/custody";
import {
  closeDatabase,
  createBarterRepository,
  createDatabase,
  createQueue,
  enqueueSocialEvent,
  ensureQueues,
  enqueueChannelReply,
  queueNames,
  type ProcessSocialEventJob,
  type SendChannelReplyJob
} from "@barter/db";
import {
  buildPaymentIntentPreview,
  buildReplyForExecution,
  buildReplyForRejectedPreview
} from "@barter/domain";
import { createLogger, serializeError } from "@barter/observability";
import { ConsoleXChannelAdapter } from "@barter/social";

import { buildPollingCronExpression, XApiChannelAdapter, XBotClient } from "./x-client";

const config = loadWorkerConfig();
const chainRpcUrls = loadChainRpcUrls();
const logger = createLogger("worker");
const chainRegistry = createChainRegistry();
const custodyProvider = createCustodyProvider({
  mode: config.WORKER_CUSTODY_MODE,
  encryptionKey: config.BARTER_ENCRYPTION_KEY,
  rpcUrls: chainRpcUrls
});
const { db, pool } = createDatabase(config.DATABASE_URL);
const repository = createBarterRepository(db, {
  encryptionKey: config.BARTER_ENCRYPTION_KEY
});
const xBotClient = new XBotClient({
  barterHandle: config.X_BARTER_HANDLE,
  resolveCredential: () =>
    repository.findOAuthCredentialByHandle(`@${config.X_BARTER_HANDLE}`),
  persistCredential: (credential) => repository.storeOAuthCredential(credential),
  ...(config.X_CLIENT_ID ? { clientId: config.X_CLIENT_ID } : {}),
  ...(config.X_CLIENT_SECRET ? { clientSecret: config.X_CLIENT_SECRET } : {})
});
const boss = createQueue({
  connectionString: config.DATABASE_URL,
  schema: config.JOB_QUEUE_SCHEMA
});
const channelAdapter = config.WORKER_REPLY_DRY_RUN
  ? new ConsoleXChannelAdapter({
      dryRun: true
    })
  : new XApiChannelAdapter(xBotClient);

async function main() {
  const agent = await repository.ensureBootstrapAgent({
    slug: config.X_BARTER_HANDLE
  });
  await repository.seedDefaultTokenAllowlist(agent.id);
  boss.on("error", (error) => {
    logger.error("queue-error", serializeError(error));
  });
  await boss.start();
  await ensureQueues(boss);

  if (config.X_POLLING_ENABLED) {
    await boss.schedule(
      queueNames.pollXEvents,
      buildPollingCronExpression(config.X_POLLING_INTERVAL_SECONDS),
      { source: "polling" },
      {
        singletonKey: queueNames.pollXEvents
      }
    );
  }

  await boss.work<ProcessSocialEventJob>(queueNames.processSocialEvent, async (jobs) => {
    const [job] = jobs;
    if (!job) {
      return;
    }

    await processSocialEvent(agent.id, job.data);
  });

  await boss.work<SendChannelReplyJob>(queueNames.sendChannelReply, async (jobs) => {
    const [job] = jobs;
    if (!job) {
      return;
    }

    await sendChannelReply(job.data);
  });

  await boss.work(queueNames.pollXEvents, async () => {
    await pollXEvents(agent.id);
  });

  const shutdown = async () => {
    await boss.stop();
    await closeDatabase(pool);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("worker-started", {
    queue: queueNames,
    mode: config.WORKER_CUSTODY_MODE,
    replyDryRun: config.WORKER_REPLY_DRY_RUN,
    pollingEnabled: config.X_POLLING_ENABLED
  });
}

async function pollXEvents(agentId: string) {
  const events = await xBotClient.pollMentions();

  if (!events.length) {
    logger.info("x-poll-empty", {
      handle: `@${config.X_BARTER_HANDLE}`
    });
    return;
  }

  let inserted = 0;

  for (const socialEvent of events) {
    const saved = await repository.insertSocialEvent({
      ...socialEvent,
      agentId
    });

    if (!saved.inserted) {
      continue;
    }

    inserted += 1;
    await repository.updateSocialEventStatus(saved.event.id, "queued");
    await repository.appendAuditEvent({
      entityType: "social_event",
      entityId: saved.event.id,
      eventType: "queued",
      payload: {
        externalEventId: saved.event.externalEventId,
        source: "polling"
      }
    });
    await enqueueSocialEvent(boss, {
      socialEventId: saved.event.id
    });
  }

  logger.info("x-poll-processed", {
    handle: `@${config.X_BARTER_HANDLE}`,
    fetched: events.length,
    inserted
  });
}

async function processSocialEvent(agentId: string, payload: ProcessSocialEventJob) {
  const socialEvent = await repository.findSocialEventById(payload.socialEventId);

  if (!socialEvent) {
    logger.warn("social-event-missing", payload);
    return;
  }

  const payerAccount = await repository.findAccountByHandle(socialEvent.authorHandle);
  const previewDependencies = {
    chainRegistry,
    targetHandle: `@${config.X_BARTER_HANDLE}`,
    mode: custodyProvider.mode,
    recipientResolver: async ({ handle, chainName }: { handle: string; chainName: string }) => {
      const destination = await repository.findDefaultPayoutDestinationByHandle({
        handle,
        chainName
      });

      if (!destination) {
        return null;
      }

      return {
        accountId: destination.accountId,
        address: destination.address,
        recipient: {
          kind: "address" as const,
          address: destination.address
        }
      };
    },
    tokenAllowlistResolver: async ({ chainName, symbol }: { chainName: string; symbol: string }) => {
      const entry = await repository.findTokenAllowlistEntry({
        chainName,
        symbol
      });

      if (!entry) {
        return null;
      }

      return {
        ...(entry.tokenAddress ? { tokenAddress: entry.tokenAddress } : {}),
        ...(typeof entry.decimals === "number" ? { decimals: entry.decimals } : {})
      };
    }
  };
  const basePreview = await buildPaymentIntentPreview(socialEvent.text, {
    ...previewDependencies,
    ...(payerAccount?.account.id ? { payerAccountId: payerAccount.account.id } : {})
  });

  let preview = basePreview.preview;
  let payerWalletId: string | undefined;

  if (payerAccount && preview.policyVerdict.allowed) {
    const wallet = await repository.findDefaultWallet(payerAccount.account.id, preview.chainName);
    payerWalletId = wallet?.id;

    if (!wallet) {
      preview = rejectPreview(preview, {
        code: "payer_wallet_missing",
        message: `${socialEvent.authorHandle} must set up a default wallet for ${preview.chainName} before paying.`
      });
    } else if (preview.executionPlan) {
      preview = paymentIntentDraftSchema.parse({
        ...preview,
        executionPlan: {
          ...preview.executionPlan,
          senderWalletId: wallet.id
        }
      });
    }
  }

  if (!payerAccount && preview.policyVerdict.allowed) {
    preview = rejectPreview(preview, {
      code: "payer_not_onboarded",
      message: `${socialEvent.authorHandle} must connect X and complete onboarding before paying.`
    });
  }

  const initialStatus = preview.policyVerdict.allowed ? "queued" : "policy_rejected";
  const primaryReason = preview.policyVerdict.reasons[0];
  const paymentIntent = await repository.createPaymentIntentFromPreview({
    preview,
    status: initialStatus,
    socialEventId: socialEvent.id,
    ...(primaryReason?.code ? { failureCode: primaryReason.code } : {}),
    ...(primaryReason?.message ? { failureReason: primaryReason.message } : {})
  });
  await repository.appendAuditEvent({
    entityType: "payment_intent",
    entityId: paymentIntent.id,
    eventType: "preview_created",
    payload: {
      socialEventId: socialEvent.id,
      allowed: preview.policyVerdict.allowed
    },
    ...(payerAccount?.account.id ? { actorAccountId: payerAccount.account.id } : {})
  });

  if (!preview.policyVerdict.allowed || !preview.executionPlan) {
    const reply = buildReplyForRejectedPreview(preview, socialEvent.externalEventId);
    await repository.updatePaymentIntent({
      paymentIntentId: paymentIntent.id,
      status: "reply_pending",
      replyState: "pending",
      replyPayload: reply,
      ...(primaryReason?.code ? { failureCode: primaryReason.code } : {}),
      ...(primaryReason?.message ? { failureReason: primaryReason.message } : {})
    });
    await repository.updateSocialEventStatus(socialEvent.id, "failed", primaryReason?.message);
    await enqueueChannelReply(boss, {
      paymentIntentId: paymentIntent.id,
      targetEventId: socialEvent.externalEventId
    });
    return;
  }

  try {
    const senderWallet = payerWalletId ? await repository.findWalletById(payerWalletId) : null;
    const executionResult = await custodyProvider.executePlan(preview.executionPlan, {
      ...(senderWallet
        ? {
            wallet: {
              id: senderWallet.id,
              chainFamily: senderWallet.chainFamily,
              chainName: senderWallet.chainName,
              address: senderWallet.address,
              custodyMode: senderWallet.custodyMode,
              provider: senderWallet.provider,
              ...(senderWallet.externalWalletId
                ? { externalWalletId: senderWallet.externalWalletId }
                : {}),
              metadata: senderWallet.metadata
            }
          }
        : {})
    });
    await repository.createPaymentExecution({
      paymentIntentId: paymentIntent.id,
      provider: preview.executionPlan.providerHint ?? custodyProvider.mode,
      status: executionResult.status,
      raw: executionResult.raw,
      completedAt: executionResult.completedAt ? new Date(executionResult.completedAt) : new Date(),
      ...(executionResult.txHash ? { txHash: executionResult.txHash } : {}),
      ...(executionResult.externalExecutionId
        ? { externalExecutionId: executionResult.externalExecutionId }
        : {}),
      ...(executionResult.explorerUrl ? { explorerUrl: executionResult.explorerUrl } : {})
    });
    const reply = buildReplyForExecution(
      preview,
      executionResult.txHash ?? "pending",
      socialEvent.externalEventId
    );

    await repository.updatePaymentIntent({
      paymentIntentId: paymentIntent.id,
      status: "reply_pending",
      replyState: "pending",
      replyPayload: reply,
      executionState: {
        status: executionResult.status,
        txHash: executionResult.txHash,
        provider: preview.executionPlan.providerHint ?? custodyProvider.mode,
        senderWalletId: payerWalletId
      }
    });
    await repository.updateSocialEventStatus(socialEvent.id, "processed");
    await repository.appendAuditEvent({
      entityType: "payment_intent",
      entityId: paymentIntent.id,
      eventType: "execution_confirmed",
      payload: executionResult.txHash ? { txHash: executionResult.txHash } : {},
      ...(payerAccount?.account.id ? { actorAccountId: payerAccount.account.id } : {})
    });
    await enqueueChannelReply(boss, {
      paymentIntentId: paymentIntent.id,
      targetEventId: socialEvent.externalEventId
    });
  } catch (error) {
    const errorPayload = serializeError(error);
    const failureMessage = readErrorMessage(errorPayload);
    const reply = {
      channel: "x" as const,
      targetEventId: socialEvent.externalEventId,
      text: `Payment failed: ${failureMessage}`,
      status: "pending" as const,
      metadata: {
        outcome: "failed"
      }
    };

    await repository.updatePaymentIntent({
      paymentIntentId: paymentIntent.id,
      status: "failed",
      replyState: "pending",
      replyPayload: reply,
      failureCode: "execution_failed",
      failureReason: failureMessage
    });
    await repository.updateSocialEventStatus(socialEvent.id, "failed", failureMessage);
    await repository.appendAuditEvent({
      entityType: "payment_intent",
      entityId: paymentIntent.id,
      eventType: "execution_failed",
      payload: errorPayload,
      ...(payerAccount?.account.id ? { actorAccountId: payerAccount.account.id } : {})
    });
    await enqueueChannelReply(boss, {
      paymentIntentId: paymentIntent.id,
      targetEventId: socialEvent.externalEventId
    });
  }
}

async function sendChannelReply(payload: SendChannelReplyJob) {
  const details = await repository.getPaymentIntentDetails(payload.paymentIntentId);

  if (!details?.intent.replyPayload) {
    logger.warn("reply-missing", payload);
    return;
  }

  const delivery = await channelAdapter.sendReply({
    ...details.intent.replyPayload,
    targetEventId: payload.targetEventId
  });

  await repository.updatePaymentIntent({
    paymentIntentId: payload.paymentIntentId,
    status: "replied",
    replyState: "sent",
    replyPayload: delivery.reply
  });
  await repository.appendAuditEvent({
    entityType: "payment_intent",
    entityId: payload.paymentIntentId,
    eventType: "reply_sent",
    payload: {
      externalReplyId: delivery.externalReplyId,
      deliveredAt: delivery.deliveredAt
    }
  });
}

function rejectPreview(preview: PaymentIntentDraft, reason: { code: string; message: string }): PaymentIntentDraft {
  return paymentIntentDraftSchema.parse({
    ...preview,
    policyVerdict: {
      allowed: false,
      reasons: [reason]
    },
    executionPlan: undefined,
    replyPayload: undefined
  });
}

function readErrorMessage(payload: Record<string, unknown>): string {
  return typeof payload.message === "string" ? payload.message : "Unknown worker failure";
}

main().catch((error) => {
  logger.error("worker-startup-failed", serializeError(error));
  process.exitCode = 1;
});
