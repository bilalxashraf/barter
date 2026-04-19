import crypto from "crypto";
import { head, list, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import type { SiteMetrics } from "./siteMetrics.types";
import { listUsers } from "./xUserStore";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_METRICS_FILE = path.join(DATA_DIR, "site-metrics.json");
const LOCAL_VISITOR_DIR = path.join(DATA_DIR, "visitors");
const LOCAL_WAITLIST_FILE = path.join(process.cwd(), "waitlist.txt");
const METRICS_BLOB_NAME = "metrics/site-summary.json";
const VISITOR_PREFIX = "metrics/visitors/";
const WAITLIST_PREFIX = "waitlist/";

const BOT_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "headless",
  "preview",
  "vercel",
  "curl",
  "wget",
  "pingdom",
  "slurp",
  "lighthouse",
  "monitor",
];

function defaultMetrics(waitlistCount = 0): SiteMetrics {
  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    waitlistCount,
    connectedXCount: 0,
    solanaWalletUsersCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureLocalDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(LOCAL_VISITOR_DIR, { recursive: true });
}

function normalizeMetrics(value: Partial<SiteMetrics> | null, waitlistCount = 0): SiteMetrics {
  if (!value) return defaultMetrics(waitlistCount);

  return {
    totalVisits: Number.isFinite(value.totalVisits) ? Number(value.totalVisits) : 0,
    uniqueVisitors: Number.isFinite(value.uniqueVisitors) ? Number(value.uniqueVisitors) : 0,
    waitlistCount: Number.isFinite(value.waitlistCount) ? Number(value.waitlistCount) : waitlistCount,
    connectedXCount: Number.isFinite(value.connectedXCount) ? Number(value.connectedXCount) : 0,
    solanaWalletUsersCount: Number.isFinite(value.solanaWalletUsersCount) ? Number(value.solanaWalletUsersCount) : 0,
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

async function readStoredMetrics(): Promise<SiteMetrics | null> {
  if (IS_VERCEL) {
    try {
      const existing = await head(METRICS_BLOB_NAME);
      const res = await fetch(existing.url, { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<SiteMetrics>;
      return normalizeMetrics(json);
    } catch {
      return null;
    }
  }

  try {
    await ensureLocalDataDir();
    const text = await fs.readFile(LOCAL_METRICS_FILE, "utf8");
    return normalizeMetrics(JSON.parse(text) as Partial<SiteMetrics>);
  } catch {
    return null;
  }
}

async function writeStoredMetrics(metrics: SiteMetrics): Promise<void> {
  if (IS_VERCEL) {
    await put(METRICS_BLOB_NAME, JSON.stringify(metrics), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await ensureLocalDataDir();
  await fs.writeFile(LOCAL_METRICS_FILE, JSON.stringify(metrics, null, 2), "utf8");
}

async function countBlobEntries(prefix: string): Promise<number> {
  let count = 0;
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await list({ prefix, cursor });
    count += result.blobs.length;
    cursor = result.cursor;
    hasMore = result.hasMore;
  }

  return count;
}

async function countWaitlistEntries(): Promise<number> {
  if (IS_VERCEL) {
    return countBlobEntries(WAITLIST_PREFIX);
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

async function hasSeenVisitor(visitorId: string): Promise<boolean> {
  const visitorPath = `${VISITOR_PREFIX}${visitorId}.json`;

  if (IS_VERCEL) {
    try {
      await head(visitorPath);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await ensureLocalDataDir();
    await fs.access(path.join(LOCAL_VISITOR_DIR, `${visitorId}.json`));
    return true;
  } catch {
    return false;
  }
}

async function markVisitorSeen(visitorId: string) {
  const visitorPath = `${VISITOR_PREFIX}${visitorId}.json`;
  const payload = JSON.stringify({ firstSeenAt: new Date().toISOString() });

  if (IS_VERCEL) {
    await put(visitorPath, payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await ensureLocalDataDir();
  await fs.writeFile(path.join(LOCAL_VISITOR_DIR, `${visitorId}.json`), payload, "utf8");
}

function isLikelyBot(userAgent: string | undefined): boolean {
  if (!userAgent) return true;
  const normalized = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

async function readUserMetrics() {
  try {
    const users = await listUsers();
    const connectedXCount = new Set(users.map((user) => user.xUserId).filter(Boolean)).size;
    const solanaWalletUsersCount = users.filter((user) => Boolean(user.solanaWalletAddress)).length;
    return { connectedXCount, solanaWalletUsersCount };
  } catch (error) {
    console.error("User metrics read error:", error);
    return { connectedXCount: 0, solanaWalletUsersCount: 0 };
  }
}

export async function getSiteMetrics(): Promise<SiteMetrics> {
  const existing = await readStoredMetrics();
  const waitlistCount = await countWaitlistEntries();
  const base = existing ? normalizeMetrics(existing, waitlistCount) : defaultMetrics(waitlistCount);
  const userMetrics = await readUserMetrics();
  const next: SiteMetrics = {
    ...base,
    waitlistCount,
    ...userMetrics,
  };

  if (
    !existing ||
    existing.waitlistCount !== next.waitlistCount ||
    existing.connectedXCount !== next.connectedXCount ||
    existing.solanaWalletUsersCount !== next.solanaWalletUsersCount
  ) {
    const refreshed: SiteMetrics = {
      ...next,
      updatedAt: new Date().toISOString(),
    };
    await writeStoredMetrics(refreshed);
    return refreshed;
  }

  return next;
}

export async function refreshWaitlistCount(): Promise<SiteMetrics> {
  const waitlistCount = await countWaitlistEntries();
  const current = await getSiteMetrics();
  const next: SiteMetrics = {
    ...current,
    waitlistCount,
    updatedAt: new Date().toISOString(),
  };
  await writeStoredMetrics(next);
  return next;
}

export async function recordVisit({
  userAgent,
  visitorId,
}: {
  userAgent?: string;
  visitorId?: string;
}) {
  const current = await getSiteMetrics();
  const resolvedVisitorId = visitorId || crypto.randomUUID();

  if (isLikelyBot(userAgent)) {
    return {
      metrics: current,
      visitorId: resolvedVisitorId,
      counted: false,
      isUniqueVisitor: false,
    };
  }

  const isUniqueVisitor = !(await hasSeenVisitor(resolvedVisitorId));
  if (isUniqueVisitor) {
    await markVisitorSeen(resolvedVisitorId);
  }

  const next: SiteMetrics = {
    ...current,
    totalVisits: current.totalVisits + 1,
    uniqueVisitors: current.uniqueVisitors + (isUniqueVisitor ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  await writeStoredMetrics(next);

  return {
    metrics: next,
    visitorId: resolvedVisitorId,
    counted: true,
    isUniqueVisitor,
  };
}
