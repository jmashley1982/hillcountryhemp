import { Router } from "express";
import path from "path";
import multer from "multer";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { uploadBufferToGCS, makeUploadFilename, listStorageFiles, deleteFileFromStorage } from "../lib/gcs.js";
import { ACCEPTED_IMAGE_MIMES, compressImage } from "../lib/compress.js";
import {
  db,
  usersTable,
  businessesTable,
  businessCategoriesTable,
  businessBrandsTable,
  businessPhotosTable,
  couponsTable,
  brandsTable,
  claimsTable,
  bannerAdTable,
  b2bBannerAdTable,
  popupAdTable,
} from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// ─── Shared helpers ────────────────────────────────────────────────────────

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const resp = await fetch(url, { headers: { "User-Agent": "THCHempFinder/1.0" } });
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

function composeAddress(
  street: string | undefined, city: string | undefined,
  state: string | undefined, zip: string | undefined,
  fallback: string,
): string {
  const parts: string[] = [];
  if (street?.trim()) parts.push(street.trim());
  const cityStateZip = [
    city?.trim(),
    [state?.trim(), zip?.trim()].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.length ? parts.join(", ") : fallback;
}

function composeHoursDisplay(hoursJson: string | null | undefined): string | null {
  if (!hoursJson) return null;
  let parsed: { day: string; closed: boolean; open: string; close: string }[];
  try { parsed = JSON.parse(hoursJson) as typeof parsed; } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const lines = DAY_ORDER.map((day) => {
    const entry = parsed.find((d) => d.day === day);
    if (!entry) return null;
    if (entry.closed) return `${day}: Closed`;
    if (!entry.open || !entry.close) return null;
    return `${day}: ${entry.open} – ${entry.close}`;
  }).filter((l): l is string => l !== null);
  return lines.length ? lines.join("\n") : null;
}

function normalizeHandle(value: string | undefined, host: string): string | null {
  if (value === undefined) return null;
  let v = value.trim();
  if (!v) return "";
  v = v.replace(/^@/, "");
  v = v.replace(new RegExp(`^https?://(www\\.)?${host.replace(".", "\\.")}/`, "i"), "");
  v = v.replace(/\/+$/, "");
  return v;
}

// ─── Public GET endpoints ──────────────────────────────────────────────────

router.get("/admin/b2b-banner", async (_req, res): Promise<void> => {
  const [b2b] = await db
    .select()
    .from(b2bBannerAdTable)
    .where(eq(b2bBannerAdTable.id, 1));
  res.json(
    b2b
      ? { id: b2b.id, image_path: b2b.imagePath, mobile_image_path: b2b.mobileImagePath, link_url: b2b.linkUrl, mobile_link_url: b2b.mobileLinkUrl, link_opens_new_tab: b2b.linkOpensNewTab }
      : { id: 1, image_path: null, link_url: null, mobile_link_url: null, link_opens_new_tab: 1 },
  );
});

router.get("/admin/banner", async (_req, res): Promise<void> => {
  const [banner] = await db
    .select()
    .from(bannerAdTable)
    .where(eq(bannerAdTable.id, 1));
  res.json(
    banner
      ? { id: banner.id, image_path: banner.imagePath, mobile_image_path: banner.mobileImagePath, link_url: banner.linkUrl, mobile_link_url: banner.mobileLinkUrl, link_opens_new_tab: banner.linkOpensNewTab, brand_filter: banner.brandFilter }
      : { id: 1, image_path: null, link_url: null, mobile_link_url: null, link_opens_new_tab: 1, brand_filter: null },
  );
});

router.get("/admin/popup", async (_req, res): Promise<void> => {
  const [popup] = await db
    .select()
    .from(popupAdTable)
    .where(eq(popupAdTable.id, 1));
  res.json(
    popup
      ? { id: popup.id, image_path: popup.imagePath, mobile_image_path: popup.mobileImagePath, link_url: popup.linkUrl, mobile_link_url: popup.mobileLinkUrl, is_active: popup.isActive, link_opens_new_tab: popup.linkOpensNewTab, brand_filter: popup.brandFilter }
      : { id: 1, image_path: null, link_url: null, mobile_link_url: null, is_active: 0, link_opens_new_tab: 1, brand_filter: null },
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
      .innerJoin(usersTable, eq(usersTable.id, businessesTable.ownerId!))
      .where(eq(businessesTable.status, "pending"))
      .orderBy(businessesTable.name);
    res.json(rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })));
  },
);

// All businesses (includes unclaimed — uses LEFT JOIN)
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
      .leftJoin(usersTable, eq(usersTable.id, businessesTable.ownerId!))
      .orderBy(businessesTable.name);
    res.json(rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })));
  },
);

// Admin creates an unclaimed business listing
router.post(
  "/admin/businesses",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const {
      name, address, street, city, state, zip, phone, email, website,
      hours_json, description, instagram, facebook, google_reviews_url,
      categories, brand_ids, on_site_smoking_area,
    } = req.body as {
      name: string;
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
      email?: string;
      website?: string;
      hours_json?: string;
      description?: string;
      instagram?: string;
      facebook?: string;
      google_reviews_url?: string;
      categories?: string[];
      brand_ids?: number[];
      on_site_smoking_area?: boolean;
    };

    const composedAddress = composeAddress(street, city, state, zip, address ?? "");
    if (!name || !composedAddress) {
      res.status(400).json({ error: "Name and address required" });
      return;
    }

    const coords = await geocode(composedAddress);

    const [business] = await db
      .insert(businessesTable)
      .values({
        ownerId: null,
        name,
        address: composedAddress,
        street: street ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        phone: phone ?? null,
        email: email ?? null,
        website: website ?? null,
        hours: composeHoursDisplay(hours_json),
        hoursJson: hours_json ?? null,
        description: description ?? null,
        instagram: normalizeHandle(instagram, "instagram.com"),
        facebook: normalizeHandle(facebook, "facebook.com"),
        googleReviewsUrl: google_reviews_url ?? null,
        onSiteSmokingArea: on_site_smoking_area ? 1 : 0,
        status: "approved",
      })
      .returning();

    if (categories?.length) {
      await db.insert(businessCategoriesTable).values(
        categories.map((cat) => ({ businessId: business.id, category: cat })),
      );
    }
    if (brand_ids?.length) {
      await db.insert(businessBrandsTable).values(
        brand_ids.map((bid) => ({ businessId: business.id, brandId: bid })),
      );
    }

    const cats = await db
      .select({ category: businessCategoriesTable.category })
      .from(businessCategoriesTable)
      .where(eq(businessCategoriesTable.businessId, business.id));

    res.status(201).json({
      id: business.id,
      owner_id: null,
      name: business.name,
      address: business.address,
      street: business.street,
      city: business.city,
      state: business.state,
      zip: business.zip,
      lat: business.lat,
      lng: business.lng,
      phone: business.phone,
      website: business.website,
      hours: business.hours,
      description: business.description,
      logo_path: business.logoPath,
      status: business.status,
      is_featured: business.isFeatured,
      created_at: business.createdAt.toISOString(),
      categories: cats.map((c) => c.category),
      brands: [],
    });
  },
);

// Approve
router.put(
  "/admin/businesses/:id/approve",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body as { reason?: string };
    const rejectionReason = reason?.trim() || "Your listing did not meet our requirements. Please review and resubmit.";
    await db
      .update(businessesTable)
      .set({ status: "rejected", rejectionReason })
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
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
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
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
    if (!b) { res.status(404).json({ error: "Business not found" }); return; }
    const newStatus = b.isFeatured ? 0 : 1;
    await db.update(businessesTable).set({ isFeatured: newStatus }).where(eq(businessesTable.id, id));
    res.json({ is_featured: newStatus });
  },
);

// ─── Claim management ──────────────────────────────────────────────────────

// Get all pending claims
router.get(
  "/admin/claims",
  requireLogin,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: claimsTable.id,
        business_id: claimsTable.businessId,
        business_name: businessesTable.name,
        user_id: claimsTable.userId,
        user_email: usersTable.email,
        status: claimsTable.status,
        created_at: claimsTable.createdAt,
      })
      .from(claimsTable)
      .innerJoin(businessesTable, eq(businessesTable.id, claimsTable.businessId))
      .innerJoin(usersTable, eq(usersTable.id, claimsTable.userId))
      .where(eq(claimsTable.status, "pending"))
      .orderBy(claimsTable.createdAt);
    res.json(rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })));
  },
);

// Approve or reject a claim
router.patch(
  "/admin/claims/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const claimId = parseInt(raw, 10);
    const { status } = req.body as { status: string };

    const [claim] = await db.select().from(claimsTable).where(eq(claimsTable.id, claimId));
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }

    if (status === "approved") {
      await db
        .update(businessesTable)
        .set({ ownerId: claim.userId })
        .where(eq(businessesTable.id, claim.businessId));

      await db
        .update(claimsTable)
        .set({ status: "rejected" })
        .where(and(eq(claimsTable.businessId, claim.businessId), eq(claimsTable.status, "pending")));

      await db
        .update(claimsTable)
        .set({ status: "approved" })
        .where(eq(claimsTable.id, claimId));
    } else if (status === "rejected") {
      await db.update(claimsTable).set({ status: "rejected" }).where(eq(claimsTable.id, claimId));
    } else {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    res.json({ success: true });
  },
);

// ─── Banner / Popup / B2B ad writes ────────────────────────────────────────

// Update banner (admin write) — accepts desktop (banner) and/or mobile (banner_mobile)
router.put(
  "/admin/banner",
  requireLogin,
  requireAdmin,
  upload.fields([{ name: "banner", maxCount: 1 }, { name: "banner_mobile", maxCount: 1 }]),
  async (req, res): Promise<void> => {
    const body = req.body as { link_url?: string; mobile_link_url?: string; link_opens_new_tab?: string; brand_filter?: string };
    const files = req.files as { [f: string]: Express.Multer.File[] } | undefined;
    const [existing] = await db.select().from(bannerAdTable).where(eq(bannerAdTable.id, 1));

    const updates: Partial<typeof bannerAdTable.$inferInsert> = {};
    if (body.link_url !== undefined) updates.linkUrl = body.link_url || null;
    if (body.mobile_link_url !== undefined) updates.mobileLinkUrl = body.mobile_link_url || null;
    if (body.link_opens_new_tab !== undefined) updates.linkOpensNewTab = body.link_opens_new_tab === "true" ? 1 : 0;
    if (body.brand_filter !== undefined) updates.brandFilter = body.brand_filter || null;
    if (files?.["banner"]?.[0]) {
      const f = files["banner"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("ad", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.imagePath = name;
    }
    if (files?.["banner_mobile"]?.[0]) {
      const f = files["banner_mobile"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("ad-mobile", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.mobileImagePath = name;
    }
    if (existing) {
      await db.update(bannerAdTable).set(updates).where(eq(bannerAdTable.id, 1));
    } else {
      await db.insert(bannerAdTable).values({ id: 1, imagePath: null, mobileImagePath: null, linkUrl: null, mobileLinkUrl: null, linkOpensNewTab: 1, ...updates });
    }
    res.json({ success: true });
  },
);

// Update popup (admin write) — accepts desktop (image) and/or mobile (image_mobile), each with own link
router.put(
  "/admin/popup",
  requireLogin,
  requireAdmin,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "image_mobile", maxCount: 1 }]),
  async (req, res): Promise<void> => {
    const body = req.body as { link_url?: string; mobile_link_url?: string; is_active?: string; link_opens_new_tab?: string; brand_filter?: string };
    const files = req.files as { [f: string]: Express.Multer.File[] } | undefined;
    const [existing] = await db.select().from(popupAdTable).where(eq(popupAdTable.id, 1));

    const updates: Partial<typeof popupAdTable.$inferInsert> = {};
    if (body.link_url !== undefined) updates.linkUrl = body.link_url || null;
    if (body.mobile_link_url !== undefined) updates.mobileLinkUrl = body.mobile_link_url || null;
    if (body.is_active !== undefined) updates.isActive = body.is_active === "true" ? 1 : 0;
    if (body.link_opens_new_tab !== undefined) updates.linkOpensNewTab = body.link_opens_new_tab === "true" ? 1 : 0;
    if (body.brand_filter !== undefined) updates.brandFilter = body.brand_filter || null;
    if (files?.["image"]?.[0]) {
      const f = files["image"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("popup", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.imagePath = name;
    }
    if (files?.["image_mobile"]?.[0]) {
      const f = files["image_mobile"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("popup-mobile", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.mobileImagePath = name;
    }
    if (existing) {
      await db.update(popupAdTable).set(updates).where(eq(popupAdTable.id, 1));
    } else {
      await db.insert(popupAdTable).values({ id: 1, imagePath: null, mobileImagePath: null, linkUrl: null, mobileLinkUrl: null, isActive: 0, linkOpensNewTab: 1, ...updates });
    }
    res.json({ success: true });
  },
);

// Update B2B banner (admin write) — accepts desktop (banner) and/or mobile (banner_mobile), each with own link
router.put(
  "/admin/b2b-banner",
  requireLogin,
  requireAdmin,
  upload.fields([{ name: "banner", maxCount: 1 }, { name: "banner_mobile", maxCount: 1 }]),
  async (req, res): Promise<void> => {
    const body = req.body as { link_url?: string; mobile_link_url?: string; link_opens_new_tab?: string };
    const files = req.files as { [f: string]: Express.Multer.File[] } | undefined;
    const [existing] = await db.select().from(b2bBannerAdTable).where(eq(b2bBannerAdTable.id, 1));

    const updates: Partial<typeof b2bBannerAdTable.$inferInsert> = {};
    if (body.link_url !== undefined) updates.linkUrl = body.link_url || null;
    if (body.mobile_link_url !== undefined) updates.mobileLinkUrl = body.mobile_link_url || null;
    if (body.link_opens_new_tab !== undefined) updates.linkOpensNewTab = body.link_opens_new_tab === "true" ? 1 : 0;
    if (files?.["banner"]?.[0]) {
      const f = files["banner"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("ad", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.imagePath = name;
    }
    if (files?.["banner_mobile"]?.[0]) {
      const f = files["banner_mobile"][0];
      const c = await compressImage(f.buffer);
      const name = makeUploadFilename("ad-mobile", f.originalname, c.ext);
      await uploadBufferToGCS(name, c.buffer, c.mimetype);
      updates.mobileImagePath = name;
    }
    if (existing) {
      await db.update(b2bBannerAdTable).set(updates).where(eq(b2bBannerAdTable.id, 1));
    } else {
      await db.insert(b2bBannerAdTable).values({ id: 1, imagePath: null, mobileImagePath: null, linkUrl: null, mobileLinkUrl: null, linkOpensNewTab: 1, ...updates });
    }
    res.json({ success: true });
  },
);

// ─── Image storage manager ─────────────────────────────────────────────────

// Build a map of filename → context labels from all DB tables
async function buildLiveRefs(): Promise<Map<string, string[]>> {
  const refs = new Map<string, string[]>();
  const addRef = (filename: string | null | undefined, label: string) => {
    if (!filename) return;
    const list = refs.get(filename) ?? [];
    list.push(label);
    refs.set(filename, list);
  };

  const [banner] = await db.select().from(bannerAdTable).where(eq(bannerAdTable.id, 1));
  addRef(banner?.imagePath, "Banner – Desktop");
  addRef(banner?.mobileImagePath, "Banner – Mobile");

  const [b2b] = await db.select().from(b2bBannerAdTable).where(eq(b2bBannerAdTable.id, 1));
  addRef(b2b?.imagePath, "B2B Banner – Desktop");
  addRef(b2b?.mobileImagePath, "B2B Banner – Mobile");

  const [popup] = await db.select().from(popupAdTable).where(eq(popupAdTable.id, 1));
  addRef(popup?.imagePath, "Popup – Desktop");
  addRef(popup?.mobileImagePath, "Popup – Mobile");

  const bizLogos = await db
    .select({ name: businessesTable.name, logoPath: businessesTable.logoPath })
    .from(businessesTable)
    .where(isNotNull(businessesTable.logoPath));
  for (const b of bizLogos) addRef(b.logoPath, `${b.name} – Logo`);

  const photos = await db
    .select({ businessName: businessesTable.name, photoPath: businessPhotosTable.photoPath })
    .from(businessPhotosTable)
    .innerJoin(businessesTable, eq(businessesTable.id, businessPhotosTable.businessId));
  for (const p of photos) addRef(p.photoPath, `${p.businessName} – Photo`);

  const couponRows = await db
    .select({ businessName: businessesTable.name, imagePath: couponsTable.imagePath })
    .from(couponsTable)
    .innerJoin(businessesTable, eq(businessesTable.id, couponsTable.businessId));
  for (const c of couponRows) addRef(c.imagePath, `${c.businessName} – Coupon`);

  const brandRows = await db
    .select({ name: brandsTable.name, logoPath: brandsTable.logoPath })
    .from(brandsTable)
    .where(isNotNull(brandsTable.logoPath));
  for (const b of brandRows) addRef(b.logoPath!, `Brand: ${b.name} – Logo`);

  return refs;
}

router.get(
  "/admin/images",
  requireLogin,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const [refs, files] = await Promise.all([buildLiveRefs(), listStorageFiles()]);
    res.json(
      files.map((f) => ({
        filename: f.filename,
        size: f.size,
        last_modified: f.lastModified,
        live: refs.has(f.filename),
        contexts: refs.get(f.filename) ?? [],
      })),
    );
  },
);

// Must be registered before /:filename/* routes to avoid path conflicts
router.post(
  "/admin/images/bulk-delete",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const { filenames } = req.body as { filenames?: unknown };
    if (!Array.isArray(filenames) || filenames.length === 0) {
      res.status(400).json({ error: "filenames array required" });
      return;
    }
    // Bulk delete only operates on unlisted files — skip any that are currently live
    const refs = await buildLiveRefs();
    const safeFilenames = (filenames as string[]).map((f) => path.basename(String(f))).filter(Boolean);
    const toDelete = safeFilenames.filter((f) => !refs.has(f));
    await Promise.allSettled(toDelete.map((f) => deleteFileFromStorage(f)));
    res.json({ success: true, deleted: toDelete.length, skipped: safeFilenames.length - toDelete.length });
  },
);

// Force-delete a live image — requires explicit admin intent
router.post(
  "/admin/images/:filename/force-delete",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const filename = path.basename(raw);
    if (!filename || filename === ".") {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    await deleteFileFromStorage(filename);
    res.json({ success: true });
  },
);

// Safe delete — blocked if the file is currently live in the DB
router.delete(
  "/admin/images/:filename",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const filename = path.basename(raw);
    if (!filename || filename === ".") {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    const refs = await buildLiveRefs();
    if (refs.has(filename)) {
      res.status(409).json({
        error: "Image is currently live",
        contexts: refs.get(filename) ?? [],
      });
      return;
    }
    await deleteFileFromStorage(filename);
    res.json({ success: true });
  },
);

// JSON error handler — converts multer errors (file too large, wrong type, etc.)
// and any other route errors into a consistent { error } JSON response instead
// of the default Express HTML error page.
router.use(
  (
    err: Error & { code?: string },
    _req: import("express").Request,
    res: import("express").Response,
    _next: import("express").NextFunction,
  ): void => {
    const status =
      err.code === "LIMIT_FILE_SIZE"
        ? 413
        : err.message === "Only image files are allowed"
          ? 415
          : 500;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 5 MB."
        : err.message ?? "Upload failed";
    res.status(status).json({ error: message });
  },
);

export default router;
