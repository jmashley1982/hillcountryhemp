import { Router } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { uploadBufferToGCS, makeUploadFilename } from "../lib/gcs.js";
import {
  db,
  usersTable,
  businessesTable,
  bannerAdTable,
  b2bBannerAdTable,
  popupAdTable,
} from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// ─── Public GET endpoints ──────────────────────────────────────────────────

// B2B banner (public read for business-facing pages)
router.get("/admin/b2b-banner", async (_req, res): Promise<void> => {
  const [b2b] = await db
    .select()
    .from(b2bBannerAdTable)
    .where(eq(b2bBannerAdTable.id, 1));
  res.json(
    b2b
      ? { id: b2b.id, image_path: b2b.imagePath, link_url: b2b.linkUrl }
      : { id: 1, image_path: null, link_url: null },
  );
});

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
      .orderBy(businessesTable.name);
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
      .orderBy(businessesTable.name);
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
      const { deleteFromGCS: _del } = await import("../lib/gcs.js");
      await _del(b.logoPath);
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
    const { link_url } = req.body as { link_url?: string };
    const [existing] = await db
      .select()
      .from(bannerAdTable)
      .where(eq(bannerAdTable.id, 1));

    let newFilename: string | undefined;
    if (req.file) {
      newFilename = makeUploadFilename("ad", req.file.originalname);
      await uploadBufferToGCS(newFilename, req.file.buffer, req.file.mimetype);
    }

    if (existing) {
      const updates: Partial<typeof bannerAdTable.$inferInsert> = {
        linkUrl: link_url ?? existing.linkUrl,
      };
      if (newFilename) updates.imagePath = newFilename;
      await db.update(bannerAdTable).set(updates).where(eq(bannerAdTable.id, 1));
    } else {
      await db.insert(bannerAdTable).values({
        id: 1,
        imagePath: newFilename ?? null,
        linkUrl: link_url ?? null,
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

    let newFilename: string | undefined;
    if (req.file) {
      newFilename = makeUploadFilename("popup", req.file.originalname);
      await uploadBufferToGCS(newFilename, req.file.buffer, req.file.mimetype);
    }

    if (existing) {
      const updates: Partial<typeof popupAdTable.$inferInsert> = {
        linkUrl: link_url ?? existing.linkUrl,
        isActive: active,
      };
      if (newFilename) updates.imagePath = newFilename;
      await db.update(popupAdTable).set(updates).where(eq(popupAdTable.id, 1));
    } else {
      await db.insert(popupAdTable).values({
        id: 1,
        imagePath: newFilename ?? null,
        linkUrl: link_url ?? null,
        isActive: active,
      });
    }
    res.json({ success: true });
  },
);

// Update B2B banner (admin write)
router.put(
  "/admin/b2b-banner",
  requireLogin,
  requireAdmin,
  upload.single("banner"),
  async (req, res): Promise<void> => {
    const { link_url } = req.body as { link_url?: string };
    const [existing] = await db
      .select()
      .from(b2bBannerAdTable)
      .where(eq(b2bBannerAdTable.id, 1));

    let newFilename: string | undefined;
    if (req.file) {
      newFilename = makeUploadFilename("ad", req.file.originalname);
      await uploadBufferToGCS(newFilename, req.file.buffer, req.file.mimetype);
    }

    if (existing) {
      const updates: Partial<typeof b2bBannerAdTable.$inferInsert> = {
        linkUrl: link_url ?? existing.linkUrl,
      };
      if (newFilename) updates.imagePath = newFilename;
      await db.update(b2bBannerAdTable).set(updates).where(eq(b2bBannerAdTable.id, 1));
    } else {
      await db.insert(b2bBannerAdTable).values({
        id: 1,
        imagePath: newFilename ?? null,
        linkUrl: link_url ?? null,
      });
    }
    res.json({ success: true });
  },
);

export default router;
