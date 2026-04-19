import { head, list, put } from "@vercel/blob";
import { Storage } from "@google-cloud/storage";

export type CloudStoreKind = "gcs" | "blob" | null;

function getProjectId() {
  return process.env.GCP_PROJECT_ID || undefined;
}

function getStorageClient() {
  const projectId = getProjectId();
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      return new Storage({ projectId, credentials });
    } catch (error) {
      console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", error);
    }
  }

  return new Storage({ projectId });
}

export function getCloudStoreKind(): CloudStoreKind {
  if (process.env.GCS_BUCKET_NAME) return "gcs";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return null;
}

export async function cloudReadText(key: string): Promise<string | null> {
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

export async function cloudWriteText(
  key: string,
  data: string,
  {
    contentType = "text/plain",
  }: {
    contentType?: string;
  } = {}
): Promise<void> {
  const kind = getCloudStoreKind();

  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) return;

    const file = getStorageClient().bucket(bucketName).file(key);
    await file.save(data, {
      contentType,
      metadata: { cacheControl: "no-cache" },
    });
    return;
  }

  if (kind === "blob") {
    await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });
  }
}

export async function cloudObjectExists(key: string): Promise<boolean> {
  const kind = getCloudStoreKind();

  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) return false;

    const file = getStorageClient().bucket(bucketName).file(key);
    const [exists] = await file.exists();
    return exists;
  }

  if (kind === "blob") {
    try {
      await head(key);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export async function cloudCount(prefix: string): Promise<number> {
  const kind = getCloudStoreKind();

  if (kind === "gcs") {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) return 0;

    const [files] = await getStorageClient().bucket(bucketName).getFiles({ prefix });
    return files.length;
  }

  if (kind === "blob") {
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

  return 0;
}
