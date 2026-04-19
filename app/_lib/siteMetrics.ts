import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { cloudObjectExists, cloudReadText, cloudWriteText, getCloudStoreKind } from "./cloudStore";
import type { SiteMetrics } from "./siteMetrics.types";
import { countWaitlistEmails } from "./waitlistStore";
import { listUsers } from "./xUserStore";

const CLOUD_STORE = getCloudStoreKind();
const DATA_DIR = path.join(process.cwd(), ".data");
const LOCAL_METRICS_FILE = path.join(DATA_DIR, "site-metrics.json");
const LOCAL_VISITOR_DIR = path.join(DATA_DIR, "visitors");
const METRICS_BLOB_NAME = "metrics/site-summary.json";
const VISITOR_PREFIX = "metrics/visitors/";

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
  if (CLOUD_STORE) {
    try {
      const text = await cloudReadText(METRICS_BLOB_NAME);
      if (!text) return null;
      const json = JSON.parse(text) as Partial<SiteMetrics>;
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
  if (CLOUD_STORE) {
    await cloudWriteText(METRICS_BLOB_NAME, JSON.stringify(metrics), {
      contentType: "application/json",
    });
    return;
  }

  await ensureLocalDataDir();
  await fs.writeFile(LOCAL_METRICS_FILE, JSON.stringify(metrics, null, 2), "utf8");
}

async function hasSeenVisitor(visitorId: string): Promise<boolean> {
  const visitorPath = `${VISITOR_PREFIX}${visitorId}.json`;

  if (CLOUD_STORE) {
    try {
      return await cloudObjectExists(visitorPath);
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

  if (CLOUD_STORE) {
    await cloudWriteText(visitorPath, payload, {
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
  const waitlistCount = await countWaitlistEmails();
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
    try {
      await writeStoredMetrics(refreshed);
    } catch (error) {
      console.error("Metrics refresh write error:", error);
    }
    return refreshed;
  }

  return next;
}

export async function refreshWaitlistCount(): Promise<SiteMetrics> {
  const waitlistCount = await countWaitlistEmails();
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
    try {
      await markVisitorSeen(resolvedVisitorId);
    } catch (error) {
      console.error("Visitor tracking write error:", error);
    }
  }

  const next: SiteMetrics = {
    ...current,
    totalVisits: current.totalVisits + 1,
    uniqueVisitors: current.uniqueVisitors + (isUniqueVisitor ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeStoredMetrics(next);
  } catch (error) {
    console.error("Metrics visit write error:", error);
  }

  return {
    metrics: next,
    visitorId: resolvedVisitorId,
    counted: true,
    isUniqueVisitor,
  };
}
