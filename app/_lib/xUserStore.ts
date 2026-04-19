import fs from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';

export type XUserRecord = {
  xUserId: string;
  xUsername: string;
  agentId: string;
  apiKey?: string;
  walletAddress?: string;
  walletNo?: number;
  solanaWalletAddress?: string;
  solanaWalletNo?: number;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'x-users.json';

function getBucketName() {
  return process.env.GCS_BUCKET_NAME || '';
}

function getProjectId() {
  return process.env.GCP_PROJECT_ID || undefined;
}

function getStorageClient() {
  const projectId = getProjectId();
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  // If running on Vercel with JSON credentials in env var
  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      return new Storage({ projectId, credentials });
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
      // Fall back to default
    }
  }

  // Otherwise use default (ADC for local dev with gcloud auth)
  return new Storage({ projectId });
}

async function readFromGcs(): Promise<string | null> {
  const bucketName = getBucketName();
  if (!bucketName) return null;

  const storage = getStorageClient();
  const file = storage.bucket(bucketName).file(STORAGE_KEY);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [contents] = await file.download();
  return contents.toString('utf8');
}

async function writeToGcs(data: string): Promise<void> {
  const bucketName = getBucketName();
  if (!bucketName) return;

  const storage = getStorageClient();
  const file = storage.bucket(bucketName).file(STORAGE_KEY);
  await file.save(data, {
    contentType: 'application/json',
    metadata: { cacheControl: 'no-cache' }
  });
}

async function readFromFile(): Promise<string | null> {
  const dataDir = path.join(process.cwd(), '.data');
  const filePath = path.join(dataDir, STORAGE_KEY);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeToFile(data: string): Promise<void> {
  const dataDir = path.join(process.cwd(), '.data');
  const filePath = path.join(dataDir, STORAGE_KEY);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, data, 'utf8');
}

async function readAll(): Promise<XUserRecord[]> {
  const gcsData = await readFromGcs();
  const raw = gcsData ?? (await readFromFile());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as XUserRecord[];
  } catch {
    return [];
  }
}

async function writeAll(records: XUserRecord[]) {
  const data = JSON.stringify(records, null, 2);
  const bucketName = getBucketName();
  if (bucketName) {
    await writeToGcs(data);
  } else {
    await writeToFile(data);
  }
}

export async function getUserByXId(xUserId: string): Promise<XUserRecord | null> {
  const users = await readAll();
  return users.find((u) => u.xUserId === xUserId) || null;
}

export async function upsertUser(record: XUserRecord): Promise<XUserRecord> {
  const users = await readAll();
  const existingIndex = users.findIndex((u) => u.xUserId === record.xUserId);
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...record, updatedAt: Date.now() };
  } else {
    users.push(record);
  }
  await writeAll(users);
  return record;
}

export async function listUsers(): Promise<XUserRecord[]> {
  return readAll();
}
