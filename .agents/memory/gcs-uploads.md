---
name: GCS file uploads
description: How file uploads are stored and served — GCS via Replit object storage sidecar, local disk fallback for dev.
---

## Rule
All file uploads (logos, photos, coupons, banners, popup ads) are stored in the Replit GCS bucket, **not** on local disk. Local disk (`artifacts/api-server/uploads/`) is a fallback for dev only and is ephemeral in production.

**Why:** Local disk is wiped on each production redeployment, so files would disappear after every deploy. GCS persists across deploys.

## How to apply
- Multer config must use `memoryStorage()` in all routes (admin.ts, businesses.ts). Never use `diskStorage`.
- After multer, call `makeUploadFilename()` + `uploadBufferToGCS(filename, req.file.buffer, req.file.mimetype)` from `lib/gcs.ts`.
- On delete, call `deleteFromGCS(filename)` (best-effort, ignores errors).
- `/api/uploads` in `app.ts` checks local disk first (for dev convenience), then streams from GCS.
- GCS client uses Replit sidecar at `http://127.0.0.1:1106` for auth (no API key needed). See `artifacts/api-server/src/lib/gcs.ts`.
- Bucket ID comes from `DEFAULT_OBJECT_STORAGE_BUCKET_ID` env secret. Files stored at `uploads/<filename>` within the bucket.
- When seeding dev test files, run a one-off Node script from `artifacts/api-server/` directory (where `@google-cloud/storage` is installed).
