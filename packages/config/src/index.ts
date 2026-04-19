import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

import { z } from "zod";

loadWorkspaceEnvFiles();

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

const sharedEnvBaseSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url().optional(),
  CHAIN_RPC_URL_BASE: z.string().url().optional(),
  CHAIN_RPC_URL_ARBITRUM: z.string().url().optional(),
  CHAIN_RPC_URL_OPTIMISM: z.string().url().optional(),
  CHAIN_RPC_URL_ETHEREUM: z.string().url().optional(),
  BARTER_ENCRYPTION_KEY: z.string().min(1),
  BARTER_SESSION_COOKIE_NAME: z.string().min(1).default("barter_session"),
  BARTER_BASE_URL: z.string().url().default("http://localhost:3000")
});

const apiEnvSchema = sharedEnvBaseSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(4001),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_LOG_LEVEL: z.string().min(1).default("info"),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  API_CUSTODY_MODE: z.enum(["mock", "custodial", "non_custodial"]).default("mock"),
  JOB_QUEUE_SCHEMA: z.string().min(1).default("public"),
  X_WEBHOOK_MODE: z.enum(["webhook", "polling"]).default("webhook"),
  X_WEBHOOK_SECRET: z.string().optional(),
  X_POLLING_ENABLED: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => parseBoolean(value, true)),
  X_POLLING_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
  X_APP_BEARER_TOKEN: z.string().optional(),
  X_BARTER_HANDLE: z.string().min(1).default("barterpayments"),
  X_REPLY_DRY_RUN: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => parseBoolean(value, true))
});

const webEnvSchema = sharedEnvBaseSchema.extend({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4001"),
  NEXT_PUBLIC_BARTER_HANDLE: z.string().min(1).default("barterpayments"),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  WEB_CUSTODY_MODE: z.enum(["mock", "custodial", "non_custodial"]).default("mock")
});

const workerEnvSchema = sharedEnvBaseSchema.extend({
  JOB_QUEUE_SCHEMA: z.string().min(1).default("public"),
  WORKER_LOG_LEVEL: z.string().min(1).default("info"),
  WORKER_REPLY_DRY_RUN: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => parseBoolean(value, true)),
  WORKER_CUSTODY_MODE: z.enum(["mock", "custodial", "non_custodial"]).default("mock"),
  X_POLLING_ENABLED: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => parseBoolean(value, true)),
  X_POLLING_INTERVAL_SECONDS: z.coerce.number().int().positive().default(300),
  X_BARTER_HANDLE: z.string().min(1).default("barterpayments")
});

type SharedEnvBase = z.output<typeof sharedEnvBaseSchema>;
type ApiEnvBase = z.output<typeof apiEnvSchema>;
type WebEnvBase = z.output<typeof webEnvSchema>;
type WorkerEnvBase = z.output<typeof workerEnvSchema>;

export type SharedEnv = SharedEnvBase & { DATABASE_URL: string };
export type ApiEnv = ApiEnvBase & { DATABASE_URL: string };
export type WebEnv = WebEnvBase & { DATABASE_URL: string };
export type WorkerEnv = WorkerEnvBase & { DATABASE_URL: string };

export function loadSharedConfig(env: NodeJS.ProcessEnv = process.env): SharedEnv {
  return resolveDatabaseUrl(sharedEnvBaseSchema.parse(env));
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  return resolveDatabaseUrl(apiEnvSchema.parse(env));
}

export function loadWebConfig(env: NodeJS.ProcessEnv = process.env): WebEnv {
  return resolveDatabaseUrl(webEnvSchema.parse(env));
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return resolveDatabaseUrl(workerEnvSchema.parse(env));
}

export function getSessionCookieName(env: NodeJS.ProcessEnv = process.env): string {
  return env.BARTER_SESSION_COOKIE_NAME?.trim() || "barter_session";
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return nodeEnvSchema.parse(env.NODE_ENV) === "production";
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

export function loadChainRpcUrls(
  env: Record<string, unknown> = process.env
): Partial<Record<"base" | "arbitrum" | "optimism" | "ethereum", string>> {
  const parsed = sharedEnvBaseSchema.parse(env);

  return {
    ...(parsed.CHAIN_RPC_URL_BASE ? { base: parsed.CHAIN_RPC_URL_BASE } : {}),
    ...(parsed.CHAIN_RPC_URL_ARBITRUM ? { arbitrum: parsed.CHAIN_RPC_URL_ARBITRUM } : {}),
    ...(parsed.CHAIN_RPC_URL_OPTIMISM ? { optimism: parsed.CHAIN_RPC_URL_OPTIMISM } : {}),
    ...(parsed.CHAIN_RPC_URL_ETHEREUM ? { ethereum: parsed.CHAIN_RPC_URL_ETHEREUM } : {})
  };
}

function resolveDatabaseUrl<
  TEnv extends { DATABASE_URL?: string | undefined; SUPABASE_DATABASE_URL?: string | undefined }
>(
  env: TEnv
): TEnv & { DATABASE_URL: string } {
  const databaseUrl = env.DATABASE_URL?.trim() || env.SUPABASE_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL is required");
  }

  return {
    ...env,
    DATABASE_URL: databaseUrl
  } as TEnv & { DATABASE_URL: string };
}

function loadWorkspaceEnvFiles() {
  const envDirectory = findEnvDirectory(process.cwd());

  if (!envDirectory) {
    return;
  }

  const candidateFiles = [".env", ".env.local"];

  for (const filename of candidateFiles) {
    const filepath = join(envDirectory, filename);
    if (!existsSync(filepath)) {
      continue;
    }

    loadEnvFile(filepath);
  }
}

function findEnvDirectory(startDir: string): string | null {
  let currentDir = startDir;

  while (true) {
    const hasEnvFile = existsSync(join(currentDir, ".env")) || existsSync(join(currentDir, ".env.local"));
    if (hasEnvFile) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}
