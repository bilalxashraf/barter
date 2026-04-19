import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type DatabaseSchema = typeof schema;

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10
  });

  const db = drizzle(pool, {
    schema
  });

  return {
    db,
    pool
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

export async function closeDatabase(pool: Pool): Promise<void> {
  await pool.end();
}
