import { createChainRegistry } from "@barter/chains";
import { loadApiConfig, loadChainRpcUrls } from "@barter/config";
import {
  paymentPreviewRequestSchema,
  payoutDestinationUpsertRequestSchema,
  walletUpsertRequestSchema
} from "@barter/contracts";
import { createCustodyProvider } from "@barter/custody";
import {
  closeDatabase,
  createBarterRepository,
  createDatabase,
  createQueue,
  ensureQueues,
  enqueueSocialEvent,
  queueNames
} from "@barter/db";
import { createLogger, serializeError } from "@barter/observability";
import {
  computeXWebhookResponseToken,
  createXEventSource,
  verifyXWebhookSignature
} from "@barter/social";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyRawBody from "fastify-raw-body";

const config = loadApiConfig();
const chainRpcUrls = loadChainRpcUrls();
const logger = createLogger("api");
const chainRegistry = createChainRegistry();
const custodyProvider = createCustodyProvider({
  mode: config.API_CUSTODY_MODE,
  encryptionKey: config.BARTER_ENCRYPTION_KEY,
  rpcUrls: chainRpcUrls
});
const eventSource = createXEventSource(config.X_WEBHOOK_MODE);
const { db, pool } = createDatabase(config.DATABASE_URL);
const repository = createBarterRepository(db, {
  encryptionKey: config.BARTER_ENCRYPTION_KEY
});
const boss = createQueue({
  connectionString: config.DATABASE_URL,
  schema: config.JOB_QUEUE_SCHEMA
});

type RawBodyRequest = FastifyRequest & {
  rawBody?: Buffer | string;
};

async function buildServer() {
  const app = Fastify({
    logger: false
  });

  await app.register(cors, {
    origin: config.API_CORS_ORIGIN,
    credentials: true
  });
  await app.register(cookie);
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: true,
    encoding: false,
    runFirst: true
  });

  app.get("/health", async () => ({
    status: "ok",
    queue: queueNames,
    mode: config.X_WEBHOOK_MODE
  }));

  app.get("/api/x/events", async (request, reply) => {
    const crcToken = typeof request.query === "object" ? (request.query as Record<string, unknown>).crc_token : null;
    if (typeof crcToken !== "string" || !crcToken.trim()) {
      return reply.code(400).send({
        error: "Missing crc_token"
      });
    }

    if (!config.X_WEBHOOK_SECRET) {
      return reply.code(500).send({
        error: "X_WEBHOOK_SECRET is not configured"
      });
    }

    return reply.send({
      response_token: computeXWebhookResponseToken(crcToken, config.X_WEBHOOK_SECRET)
    });
  });

  app.post("/api/x/events", async (request: RawBodyRequest, reply) => {
    try {
      if (config.X_WEBHOOK_MODE === "webhook" && config.X_WEBHOOK_SECRET) {
        const signature = request.headers["x-twitter-webhooks-signature"];
        const rawBody = request.rawBody;

        if (!rawBody || !verifyXWebhookSignature(rawBody, asHeaderValue(signature), config.X_WEBHOOK_SECRET)) {
          return reply.code(401).send({
            error: "Invalid webhook signature"
          });
        }
      }

      const payload = request.body;
      const normalizedEvents = await eventSource.normalizeEvents(payload);
      const agent = await repository.ensureBootstrapAgent({
        slug: config.X_BARTER_HANDLE
      });
      await repository.seedDefaultTokenAllowlist(agent.id);

      let inserted = 0;

      for (const socialEvent of normalizedEvents) {
        const saved = await repository.insertSocialEvent({
          ...socialEvent,
          agentId: agent.id
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
            externalEventId: saved.event.externalEventId
          }
        });
        await enqueueSocialEvent(boss, {
          socialEventId: saved.event.id
        });
      }

      return reply.code(202).send({
        accepted: inserted,
        total: normalizedEvents.length
      });
    } catch (error) {
      logger.error("x-events-ingress-failed", serializeError(error));
      return reply.code(500).send({
        error: "Unable to accept events"
      });
    }
  });

  app.post("/api/payment-intents/preview", async (request, reply) => {
    try {
      const payload = paymentPreviewRequestSchema.parse(request.body);
      const session = await readSessionFromRequest(request);
      const previewDependencies = {
        chainRegistry,
        targetHandle: payload.targetHandle ?? `@${config.X_BARTER_HANDLE}`,
        mode: config.API_CUSTODY_MODE,
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

      const preview = await import("@barter/domain").then(({ buildPaymentIntentPreview }) =>
        buildPaymentIntentPreview(payload.text, {
          ...previewDependencies,
          ...(session?.accountId ? { payerAccountId: session.accountId } : {})
        })
      );

      return reply.send(preview);
    } catch (error) {
      logger.error("preview-failed", serializeError(error));
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  app.get("/api/payment-intents/:paymentIntentId", async (request, reply) => {
    const paymentIntentId = String((request.params as Record<string, unknown>).paymentIntentId ?? "");
    const details = await repository.getPaymentIntentDetails(paymentIntentId);

    if (!details) {
      return reply.code(404).send({
        error: "Payment intent not found"
      });
    }

    return reply.send(details);
  });

  app.post("/api/me/payout-destinations", async (request, reply) => {
    const session = await readRequiredSession(request, reply);
    if (!session) {
      return reply;
    }

    try {
      const payload = payoutDestinationUpsertRequestSchema.parse(request.body);
      const driver = chainRegistry.getOrThrow(payload.chainName);
      const addressValidation = driver.validateAddress(payload.address);
      if (!addressValidation.ok || !addressValidation.normalizedAddress) {
        return reply.code(400).send({
          error: addressValidation.reason ?? "Invalid address"
        });
      }

      const destination = await repository.upsertPayoutDestination({
        accountId: session.accountId,
        chainFamily: payload.chainFamily ?? driver.descriptor.family,
        chainName: payload.chainName,
        address: addressValidation.normalizedAddress,
        ...(payload.label ? { label: payload.label } : {}),
        makeDefault: payload.makeDefault
      });

      return reply.code(201).send({
        destination
      });
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  app.post("/api/me/wallets", async (request, reply) => {
    const session = await readRequiredSession(request, reply);
    if (!session) {
      return reply;
    }

    try {
      const payload = walletUpsertRequestSchema.parse(request.body);
      const driver = chainRegistry.getOrThrow(payload.chainName);
      const requestedAddress = payload.address?.trim()
        ? driver.validateAddress(payload.address)
        : null;

      if (requestedAddress && (!requestedAddress.ok || !requestedAddress.normalizedAddress)) {
        return reply.code(400).send({
          error: requestedAddress.reason ?? "Invalid address"
        });
      }

      const agent = await repository.ensureBootstrapAgent({
        slug: config.X_BARTER_HANDLE
      });
      const wallet = await custodyProvider.provisionWallet({
        accountId: session.accountId,
        agentId: agent.id,
        chainFamily: payload.chainFamily ?? driver.descriptor.family,
        chainName: payload.chainName,
        ...(requestedAddress?.normalizedAddress
          ? { requestedAddress: requestedAddress.normalizedAddress }
          : {})
      });
      const savedWallet = await repository.createOrAttachWalletAccount({
        accountId: session.accountId,
        agentId: agent.id,
        chainFamily: payload.chainFamily ?? driver.descriptor.family,
        chainName: payload.chainName,
        wallet,
        makeDefault: payload.makeDefault
      });

      return reply.code(201).send({
        wallet: savedWallet
      });
    } catch (error) {
      return reply.code(400).send({
        error: error instanceof Error ? error.message : "Invalid request"
      });
    }
  });

  app.addHook("onClose", async () => {
    await boss.stop();
    await closeDatabase(pool);
  });

  return app;
}

async function readSessionFromRequest(request: FastifyRequest) {
  const cookieName = config.BARTER_SESSION_COOKIE_NAME;
  const sessionToken = request.cookies[cookieName];
  if (!sessionToken) {
    return null;
  }

  return repository.getAuthSession(sessionToken);
}

async function readRequiredSession(request: FastifyRequest, reply: FastifyReply) {
  const session = await readSessionFromRequest(request);
  if (!session) {
    await reply.code(401).send({
      error: "Authentication required"
    });
    return null;
  }

  return session;
}

function asHeaderValue(header: string | string[] | undefined): string | undefined {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

async function main() {
  const app = await buildServer();
  boss.on("error", (error) => {
    logger.error("queue-error", serializeError(error));
  });
  await repository.ensureBootstrapAgent({
    slug: config.X_BARTER_HANDLE
  }).then((agent) => repository.seedDefaultTokenAllowlist(agent.id));
  await boss.start();
  await ensureQueues(boss);
  await app.listen({
    host: config.API_HOST,
    port: config.API_PORT
  });

  logger.info("api-listening", {
    host: config.API_HOST,
    port: config.API_PORT
  });
}

main().catch((error) => {
  logger.error("api-startup-failed", serializeError(error));
  process.exitCode = 1;
});
