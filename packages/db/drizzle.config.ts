import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnvFile } from "node:process";

import { defineConfig } from "drizzle-kit";

loadWorkspaceEnvFiles();

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? ""
  },
  verbose: true,
  strict: true
});

function loadWorkspaceEnvFiles() {
  const envDirectory = findEnvDirectory(process.cwd());

  if (!envDirectory) {
    return;
  }

  for (const filename of [".env", ".env.local"]) {
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
