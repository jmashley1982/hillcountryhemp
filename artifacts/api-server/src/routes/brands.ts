import { Router } from "express";
import multer from "multer";
import { eq, and, sql } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";
import { uploadBufferToGCS, makeUploadFilename, deleteFromGCS } from "../lib/gcs.js";
import { ACCEPTED_IMAGE_MIMES, compressImage } from "../lib/compress.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// Public: list approved brands
router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      is_featured: brandsTable.isFeatured,
      logo_path: brandsTable.logoPath,
      status: brandsTable.status,
    })
    .from(brandsTable)
    .where(eq(brandsTable.status, "approved"))
    .orderBy(sql`lower(${brandsTable.name})`);
  res.json(brands);
});

// Public: suggest a brand (creates pending brand)
router.post("/brands/suggest", async (req, res): Promise<void> => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Brand name required" });
    return;
  }
  try {
    await db.insert(brandsTable).values({ name: name.trim(), status: "pending" });
    res.status(201).json({ success: true });
  } catch {
    res.status(400).json({ error: "A brand with that name already exists" });
  }
});

// Admin: list all brands including pending
router.get("/admin/brands", requireLogin, requireAdmin, async (_req, res): Promise<void> => {
  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      is_featured: brandsTable.isFeatured,
      logo_path: brandsTable.logoPath,
      status: brandsTable.status,
    })
    .from(brandsTable)
    .orderBy(brandsTable.status, sql`lower(${brandsTable.name})`);
  res.json(brands);
});

// Admin: approve a pending brand
router.put(
  "/admin/brands/:id/approve",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }
    await db.update(brandsTable).set({ status: "approved" }).where(eq(brandsTable.id, id));
    res.json({ success: true });
  },
);

// Admin: add brand (with optional logo)
router.post(
  "/brands",
  requireLogin,
  requireAdmin,
  upload.single("logo"),
  async (req, res): Promise<void> => {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: "Brand name required" });
      return;
    }
    let logoPath: string | null = null;
    if (req.file) {
      const c = await compressImage(req.file.buffer);
      logoPath = makeUploadFilename("brand", req.file.originalname, c.ext);
      await uploadBufferToGCS(logoPath, c.buffer, c.mimetype);
    }
    try {
      await db.insert(brandsTable).values({ name, logoPath, status: "approved" });
      res.status(201).json({ success: true });
    } catch {
      res.status(400).json({ error: "Brand already exists" });
    }
  },
);

// Admin: upload/replace brand logo
router.put(
  "/brands/:id/logo",
  requireLogin,
  requireAdmin,
  upload.single("logo"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }
    if (brand.logoPath) await deleteFromGCS(brand.logoPath);
    const c = await compressImage(req.file.buffer);
    const filename = makeUploadFilename("brand", req.file.originalname, c.ext);
    await uploadBufferToGCS(filename, c.buffer, c.mimetype);
    await db.update(brandsTable).set({ logoPath: filename }).where(eq(brandsTable.id, id));
    res.json({ logo_path: filename });
  },
);

// Admin: rename brand
router.patch(
  "/brands/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Brand name required" });
      return;
    }
    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }
    try {
      await db.update(brandsTable).set({ name: name.trim() }).where(eq(brandsTable.id, id));
      res.json({ success: true });
    } catch {
      res.status(400).json({ error: "A brand with that name already exists" });
    }
  },
);

// Admin: delete brand
router.delete(
  "/brands/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
    if (brand?.logoPath) await deleteFromGCS(brand.logoPath);
    await db.delete(brandsTable).where(eq(brandsTable.id, id));
    res.json({ success: true });
  },
);

// Admin: toggle featured
router.put(
  "/brands/:id/feature",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [brand] = await db.select().from(brandsTable).where(eq(brandsTable.id, id));
    if (!brand) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }
    const newStatus = brand.isFeatured ? 0 : 1;
    await db.update(brandsTable).set({ isFeatured: newStatus }).where(eq(brandsTable.id, id));
    res.json({ is_featured: newStatus });
  },
);

export default router;
