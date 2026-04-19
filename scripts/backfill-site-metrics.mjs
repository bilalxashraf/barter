import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Storage } from "@google-cloud/storage";
import { head, list, put } from "@vercel/blob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const METRICS_BLOB_NAME = "metrics/site-summary.json";
const WAITLIST_PREFIX = "waitlist/";
const X_USERS_KEY = "x-users.json";
const LOCAL_DATA_DIR = path.join(projectRoot, ".data");
const LOCAL_METRICS_FILE = path.join(LOCAL_DATA_DIR, "site-metrics.json");
const LOCAL_WAITLIST_FILE = path.join(projectRoot, "waitlist.txt");

function loadEnvFile(filename) {
  return fs.readFile(path.join(projectRoot, filename), "utf8").then((text) => {
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  }).catch(() => {});
}

async function loadEnv() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");
  await loadEnvFile(".env.production");
  await loadEnvFile(".env.production.local");
}

function getCloudStoreKind() {
  if (process.env.GCS_BUCKET_NAME) return "gcs";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return null;
}

function getStorageClient() {
  const projectId = process.env.GCP_PROJECT_ID || undefined;
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentialsJson) {
    try {
      return new Storage({ projectId, credentials: JSON.parse(credentialsJson) });
    } catch (error) {
      console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", error);
    }
  }

  return new Storage({ projectId });
}

async function readCloudText(key) {
  const kind = getCloudStoreKind();
  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) return null;

    const file = getStorageClient().bucket(bucketName).file(key);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [contents] = await file.download();
    return contents.toString("utf8");
  }

  if (kind === "blob") {
    try {
      const existing = await head(key);
      const res = await fetch(existing.url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  return null;
}

async function writeCloudText(key, value, contentType = "application/json") {
  const kind = getCloudStoreKind();

  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) throw new Error("Missing GCS_BUCKET_NAME");
    const file = getStorageClient().bucket(bucketName).file(key);
    await file.save(value, {
      contentType,
      metadata: { cacheControl: "no-cache" },
    });
    return;
  }

  if (kind === "blob") {
    await put(key, value, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
    return;
  }

  throw new Error("No cloud store configured");
}

async function countCloudPrefix(prefix) {
  const kind = getCloudStoreKind();

  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) return 0;
    const [files] = await getStorageClient().bucket(bucketName).getFiles({ prefix });
    return files.length;
  }

  if (kind === "blob") {
    let count = 0;
    let cursor;
    let hasMore = true;

    while (hasMore) {
      const result = await list({ prefix, cursor });
      count += result.blobs.length;
      cursor = result.cursor;
      hasMore = result.hasMore;
    }

    return count;
  }

  return 0;
}

async function readLocalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function readExistingMetrics() {
  const kind = getCloudStoreKind();

  if (kind) {
    const text = await readCloudText(METRICS_BLOB_NAME);
    return text ? JSON.parse(text) : null;
  }

  return readLocalJson(LOCAL_METRICS_FILE);
}

async function readUsers() {
  const kind = getCloudStoreKind();

  if (kind === "blob") {
    return [];
  }

  if (kind === "gcs") {
    const text = await readCloudText(X_USERS_KEY);
    return text ? JSON.parse(text) : [];
  }

  return (await readLocalJson(path.join(LOCAL_DATA_DIR, X_USERS_KEY))) || [];
}

async function countWaitlistEntries() {
  const kind = getCloudStoreKind();

  if (kind) {
    return countCloudPrefix(WAITLIST_PREFIX);
  }

  try {
    const text = await fs.readFile(LOCAL_WAITLIST_FILE, "utf8");
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

async function writeMetrics(metrics) {
  const serialized = JSON.stringify(metrics, null, 2);
  const kind = getCloudStoreKind();

  if (kind) {
    await writeCloudText(METRICS_BLOB_NAME, serialized);
    return;
  }

  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(LOCAL_METRICS_FILE, serialized, "utf8");
}

function normalizeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

async function main() {
  await loadEnv();

  const existing = (await readExistingMetrics()) || {};
  const waitlistCount = await countWaitlistEntries();
  const users = await readUsers();

  const connectedXCount = new Set(users.map((user) => user.xUserId).filter(Boolean)).size;
  const solanaWalletUsersCount = users.filter((user) => Boolean(user.solanaWalletAddress)).length;

  const next = {
    totalVisits: normalizeNumber(existing.totalVisits),
    uniqueVisitors: normalizeNumber(existing.uniqueVisitors),
    waitlistCount,
    connectedXCount,
    solanaWalletUsersCount,
    updatedAt: new Date().toISOString(),
  };

  await writeMetrics(next);

  console.log(JSON.stringify({
    store: getCloudStoreKind() || "local",
    totalVisits: next.totalVisits,
    uniqueVisitors: next.uniqueVisitors,
    waitlistCount: next.waitlistCount,
    connectedXCount: next.connectedXCount,
    solanaWalletUsersCount: next.solanaWalletUsersCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
