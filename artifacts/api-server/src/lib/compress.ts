import sharp from "sharp";

export const ACCEPTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/gif",
]);

export async function compressImage(
  buffer: Buffer,
): Promise<{ buffer: Buffer; mimetype: string; ext: string }> {
  const compressed = await sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { buffer: compressed, mimetype: "image/jpeg", ext: ".jpg" };
}
