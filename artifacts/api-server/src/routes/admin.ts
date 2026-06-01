import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  bannerAdTable,
  popupAdTable,
} from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "ad-" + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const router = Router();

// ─── Public GET endpoints ──────────────────────────────────────────────────

// Banner ad (public read so it can display site-wide)
router.get("/admin/banner", async (_req, res): Promise<void> => {
  const [banner] = await db
    .select()
    .from(bannerAdTable)
    .where(eq(bannerAdTable.id, 1));
  res.json(
    banner
      ? { id: banner.id, image_path: banner.imagePath, link_url: banner.linkUrl }
      : { id: 1, image_path: null, link_url: null },
  );
});

// Popup ad (admin view — public read for config display)
router.get("/admin/popup", async (_req, res): Promise<void> => {
  const [popup] = await db
    .select()
    .from(popupAdTable)
    .where(eq(popupAdTable.id, 1));
  res.json(
    popup
      ? { id: popup.id, image_path: popup.imagePath, link_url: popup.linkUrl, is_active: popup.isActive }
      : { id: 1, image_path: null, link_url: null, is_active: 0 },
  );
});

// ─── Admin-only routes ─────────────────────────────────────────────────────

// Pending businesses
router.get(
  "/admin/pending",
  requireLogin,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: businessesTable.id,
        owner_id: businessesTable.ownerId,
        name: businessesTable.name,
        address: businessesTable.address,
        lat: businessesTable.lat,
        lng: businessesTable.lng,
        phone: businessesTable.phone,
        website: businessesTable.website,
        hours: businessesTable.hours,
        description: businessesTable.description,
        logo_path: businessesTable.logoPath,
        status: businessesTable.status,
        rejection_reason: businessesTable.rejectionReason,
        is_featured: businessesTable.isFeatured,
        created_at: businessesTable.createdAt,
        owner_email: usersTable.email,
      })
      .from(businessesTable)
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .where(eq(businessesTable.status, "pending"))
      .orderBy(businessesTable.createdAt);
    res.json(
      rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })),
    );
  },
);

// All businesses
router.get(
  "/admin/businesses",
  requireLogin,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: businessesTable.id,
        owner_id: businessesTable.ownerId,
        name: businessesTable.name,
        address: businessesTable.address,
        lat: businessesTable.lat,
        lng: businessesTable.lng,
        phone: businessesTable.phone,
        website: businessesTable.website,
        hours: businessesTable.hours,
        description: businessesTable.description,
        logo_path: businessesTable.logoPath,
        status: businessesTable.status,
        rejection_reason: businessesTable.rejectionReason,
        is_featured: businessesTable.isFeatured,
        created_at: businessesTable.createdAt,
        owner_email: usersTable.email,
      })
      .from(businessesTable)
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId))
      .orderBy(businessesTable.createdAt);
    res.json(
      rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })),
    );
  },
);

// Approve
router.put(
  "/admin/businesses/:id/approve",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    await db
      .update(businessesTable)
      .set({ status: "approved", rejectionReason: null })
      .where(eq(businessesTable.id, parseInt(raw, 10)));
    res.json({ success: true });
  },
);

// Reject
router.put(
  "/admin/businesses/:id/reject",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const { reason } = req.body as { reason?: string };
    await db
      .update(businessesTable)
      .set({ status: "rejected", rejectionReason: reason ?? "" })
      .where(eq(businessesTable.id, parseInt(raw, 10)));
    res.json({ success: true });
  },
);

// Delete
router.delete(
  "/admin/businesses/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, id));
    if (b?.logoPath) {
      const p = path.join(uploadsDir, b.logoPath);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await db.delete(businessesTable).where(eq(businessesTable.id, id));
    res.json({ success: true });
  },
);

// Toggle featured
router.put(
  "/admin/businesses/:id/feature",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, id));
    if (!b) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const newStatus = b.isFeatured ? 0 : 1;
    await db
      .update(businessesTable)
      .set({ isFeatured: newStatus })
      .where(eq(businessesTable.id, id));
    res.json({ is_featured: newStatus });
  },
);

// Update banner (admin write)
router.put(
  "/admin/banner",
  requireLogin,
  requireAdmin,
  upload.single("banner"),
  async (req, res): Promise<void> => {
    const { linkUrl } = req.body as { linkUrl?: string };
    const [existing] = await db
      .select()
      .from(bannerAdTable)
      .where(eq(bannerAdTable.id, 1));

    if (existing) {
      const updates: Partial<typeof bannerAdTable.$inferInsert> = {
        linkUrl: linkUrl ?? existing.linkUrl,
      };
      if (req.file) updates.imagePath = req.file.filename;
      await db
        .update(bannerAdTable)
        .set(updates)
        .where(eq(bannerAdTable.id, 1));
    } else {
      await db.insert(bannerAdTable).values({
        id: 1,
        imagePath: req.file?.filename ?? null,
        linkUrl: linkUrl ?? null,
      });
    }
    res.json({ success: true });
  },
);

// Update popup (admin write)
router.put(
  "/admin/popup",
  requireLogin,
  requireAdmin,
  upload.single("image"),
  async (req, res): Promise<void> => {
    const { link_url, is_active } = req.body as {
      link_url?: string;
      is_active?: string;
    };
    const active = is_active === "true" ? 1 : 0;
    const [existing] = await db
      .select()
      .from(popupAdTable)
      .where(eq(popupAdTable.id, 1));

    if (existing) {
      const updates: Partial<typeof popupAdTable.$inferInsert> = {
        linkUrl: link_url ?? existing.linkUrl,
        isActive: active,
      };
      if (req.file) updates.imagePath = req.file.filename;
      await db.update(popupAdTable).set(updates).where(eq(popupAdTable.id, 1));
    } else {
      await db.insert(popupAdTable).values({
        id: 1,
        imagePath: req.file?.filename ?? null,
        linkUrl: link_url ?? null,
        isActive: active,
      });
    }
    res.json({ success: true });
  },
);

export default router;
