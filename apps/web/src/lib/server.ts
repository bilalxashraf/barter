import { loadWebConfig } from "@barter/config";
import { createBarterRepository, createDatabase } from "@barter/db";
import { createLogger } from "@barter/observability";

const globalForWeb = globalThis as typeof globalThis & {
  __barterWebRuntime?: ReturnType<typeof buildRuntime>;
};

function buildRuntime() {
  const config = loadWebConfig();
  const database = createDatabase(config.DATABASE_URL);

  return {
    config,
    logger: createLogger("web"),
    database,
    repository: createBarterRepository(database.db, {
      encryptionKey: config.BARTER_ENCRYPTION_KEY
    })
  };
}

export function getWebRuntime() {
  if (!globalForWeb.__barterWebRuntime) {
    globalForWeb.__barterWebRuntime = buildRuntime();
  }

  return globalForWeb.__barterWebRuntime;
}
