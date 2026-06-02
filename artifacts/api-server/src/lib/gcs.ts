import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";

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
): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
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
