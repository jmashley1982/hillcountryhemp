import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db, brandsTable } from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "brand-" + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const router = Router();

// Public: list all brands
router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      is_featured: brandsTable.isFeatured,
      logo_path: brandsTable.logoPath,
    })
    .from(brandsTable)
    .orderBy(brandsTable.name);
  res.json(brands);
});

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
    try {
      await db.insert(brandsTable).values({
        name,
        logoPath: req.file?.filename ?? null,
      });
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
    if (brand.logoPath) {
      const old = path.join(uploadsDir, brand.logoPath);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await db.update(brandsTable).set({ logoPath: req.file.filename }).where(eq(brandsTable.id, id));
    res.json({ logo_path: req.file.filename });
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
    if (brand?.logoPath) {
      const p = path.join(uploadsDir, brand.logoPath);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
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
