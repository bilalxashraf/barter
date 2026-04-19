import { promises as fs } from "fs";
import path from "path";
import { cloudListKeys, cloudReadText, cloudWriteText, getCloudStoreKind } from "./cloudStore";

const CLOUD_STORE = getCloudStoreKind();
const LOCAL_FILE = path.join(process.cwd(), "waitlist.txt");
const LEGACY_WAITLIST_KEY = "waitlist.txt";
const WAITLIST_PREFIX = "waitlist/";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function keyForEmail(email: string) {
  return `${WAITLIST_PREFIX}${normalizeEmail(email)}.txt`;
}

async function readLegacyEmails(): Promise<string[]> {
  if (CLOUD_STORE) {
    try {
      const text = await cloudReadText(LEGACY_WAITLIST_KEY);
      if (!text) return [];
      return text
        .split("\n")
        .map((line) => normalizeEmail(line.split("\t")[0] || ""))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  try {
    const text = await fs.readFile(LOCAL_FILE, "utf8");
    return text
      .split("\n")
      .map((line) => normalizeEmail(line.split("\t")[0] || ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readObjectEmails(): Promise<string[]> {
  if (!CLOUD_STORE) return [];

  try {
    const keys = await cloudListKeys(WAITLIST_PREFIX);
    return keys
      .map((key) => key.slice(WAITLIST_PREFIX.length))
      .filter(Boolean)
      .map((key) => key.replace(/\.txt$/i, ""))
      .map(normalizeEmail)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function listWaitlistEmails(): Promise<string[]> {
  const emails = new Set<string>();

  for (const email of await readLegacyEmails()) {
    emails.add(email);
  }

  for (const email of await readObjectEmails()) {
    emails.add(email);
  }

  return [...emails];
}

export async function countWaitlistEmails(): Promise<number> {
  return (await listWaitlistEmails()).length;
}

export async function waitlistHasEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const existing = await listWaitlistEmails();
  return existing.includes(normalized);
}

export async function saveWaitlistEmail(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const timestamp = new Date().toISOString();

  if (CLOUD_STORE) {
    await cloudWriteText(keyForEmail(normalized), timestamp);
    return;
  }

  await fs.appendFile(LOCAL_FILE, `${normalized}\t${timestamp}\n`, "utf8");
}
