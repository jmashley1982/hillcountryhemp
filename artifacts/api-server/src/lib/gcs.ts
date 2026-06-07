import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
} as ConstructorParameters<typeof Storage>[0]);

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return gcsClient.bucket(bucketId);
}

export function makeUploadFilename(
  prefix: string,
  originalName: string,
  ext?: string,
): string {
  const e = ext ?? path.extname(originalName).toLowerCase();
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${e}`;
}

export async function uploadBufferToGCS(
  filename: string,
  buffer: Buffer,
  mimetype: string,
): Promise<void> {
  const bucket = getBucket();
  const file = bucket.file(`uploads/${filename}`);
  await file.save(buffer, { contentType: mimetype, resumable: false });
}

export async function deleteFromGCS(filename: string): Promise<void> {
  try {
    const bucket = getBucket();
    const file = bucket.file(`uploads/${filename}`);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch {
    // best-effort — ignore errors on delete
  }
}

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

export async function listStorageFiles(): Promise<
  Array<{ filename: string; size: number; lastModified: string }>
> {
  if (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    try {
      const bucket = getBucket();
      const [files] = await bucket.getFiles({ prefix: "uploads/" });
      return files.map((f) => ({
        filename: f.name.replace(/^uploads\//, ""),
        size: parseInt(String(f.metadata.size ?? "0"), 10),
        lastModified: String(f.metadata.updated ?? f.metadata.timeCreated ?? ""),
      }));
    } catch {
      return [];
    }
  } else {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) return [];
      const names = await fsPromises.readdir(UPLOADS_DIR);
      const results = await Promise.all(
        names.map(async (name) => {
          try {
            const stat = await fsPromises.stat(path.join(UPLOADS_DIR, name));
            return { filename: name, size: stat.size, lastModified: stat.mtime.toISOString() };
          } catch {
            return null;
          }
        }),
      );
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    } catch {
      return [];
    }
  }
}

export async function deleteFileFromStorage(filename: string): Promise<void> {
  const localPath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(localPath)) {
    try {
      await fsPromises.unlink(localPath);
    } catch { /* best-effort */ }
  }
  await deleteFromGCS(filename);
}

export async function streamFromGCS(
  filename: string,
  res: import("express").Response,
): Promise<boolean> {
  try {
    const bucket = getBucket();
    const file = bucket.file(`uploads/${filename}`);
    const [exists] = await file.exists();
    if (!exists) return false;
    const [metadata] = await file.getMetadata();
    res.setHeader(
      "Content-Type",
      (metadata.contentType as string) || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000");
    await new Promise<void>((resolve, reject) => {
      file.createReadStream().pipe(res).on("finish", resolve).on("error", reject);
    });
    return true;
  } catch {
    return false;
  }
}
