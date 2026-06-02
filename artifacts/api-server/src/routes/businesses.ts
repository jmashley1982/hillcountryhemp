import { Router } from "express";
import multer from "multer";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  businessCategoriesTable,
  businessPhotosTable,
  couponsTable,
  brandsTable,
  businessBrandsTable,
} from "@workspace/db";
import { requireLogin, requireBusiness } from "../middlewares/auth.js";
import { uploadBufferToGCS, makeUploadFilename, deleteFromGCS } from "../lib/gcs.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});
const uploadCoupon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf")
      cb(null, true);
    else cb(new Error("Only image or PDF files are allowed"));
  },
});

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "THCHempFinder/1.0" },
    });
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    if (data.length > 0)
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    // ignore
  }
  return null;
}

async function enrichBusiness(b: {
  id: number;
  ownerId: number;
  name: string;
  address: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  hoursJson: string | null;
  description: string | null;
  logoPath: string | null;
  status: string;
  rejectionReason: string | null;
  isFeatured: number;
  onSiteSmokingArea: number;
  instagram: string | null;
  facebook: string | null;
  googleReviewsUrl: string | null;
  createdAt: Date;
  lastUpdated: Date;
}) {
  const cats = await db
    .select({ category: businessCategoriesTable.category })
    .from(businessCategoriesTable)
    .where(eq(businessCategoriesTable.businessId, b.id));

  const brandRows = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      is_featured: brandsTable.isFeatured,
    })
    .from(businessBrandsTable)
    .innerJoin(
      brandsTable,
      eq(brandsTable.id, businessBrandsTable.brandId),
    )
    .where(eq(businessBrandsTable.businessId, b.id));

  return {
    id: b.id,
    owner_id: b.ownerId,
    name: b.name,
    address: b.address,
    street: b.street,
    city: b.city,
    state: b.state,
    zip: b.zip,
    lat: b.lat,
    lng: b.lng,
    phone: b.phone,
    website: b.website,
    hours: b.hours,
    hours_json: b.hoursJson,
    description: b.description,
    logo_path: b.logoPath,
    status: b.status,
    rejection_reason: b.rejectionReason,
    is_featured: b.isFeatured,
    on_site_smoking_area: b.onSiteSmokingArea,
    instagram: b.instagram,
    facebook: b.facebook,
    google_reviews_url: b.googleReviewsUrl,
    created_at: b.createdAt.toISOString(),
    last_updated: b.lastUpdated.toISOString(),
    categories: cats.map((c) => c.category),
    brands: brandRows,
  };
}

type DayHours = {
  day: string;
  closed: boolean;
  open: string;
  close: string;
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function composeHoursDisplay(hoursJson: string | null | undefined): string | null {
  if (!hoursJson) return null;
  let parsed: DayHours[];
  try {
    parsed = JSON.parse(hoursJson) as DayHours[];
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const lines = DAY_ORDER.map((day) => {
    const entry = parsed.find((d) => d.day === day);
    if (!entry) return null;
    if (entry.closed) return `${day}: Closed`;
    if (!entry.open || !entry.close) return null;
    return `${day}: ${entry.open} – ${entry.close}`;
  }).filter((l): l is string => l !== null);
  return lines.length ? lines.join("\n") : null;
}

function composeAddress(
  street: string | undefined,
  city: string | undefined,
  state: string | undefined,
  zip: string | undefined,
  fallback: string,
): string {
  const parts: string[] = [];
  if (street?.trim()) parts.push(street.trim());
  const cityStateZip = [
    city?.trim(),
    [state?.trim(), zip?.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.length ? parts.join(", ") : fallback;
}

function normalizeHandle(value: string | undefined, host: string): string | null {
  if (value === undefined) return null;
  let v = value.trim();
  if (!v) return "";
  v = v.replace(/^@/, "");
  v = v.replace(
    new RegExp(`^https?://(www\\.)?${host.replace(".", "\\.")}/`, "i"),
    "",
  );
  v = v.replace(/\/+$/, "");
  return v;
}

const router = Router();

// Public: list approved businesses
router.get("/businesses", async (req, res): Promise<void> => {
  const { search, category, brand, city, featured, lat, lng, radius, sort } =
    req.query as Record<string, string | undefined>;

  let rows = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.status, "approved"));

  if (featured === "1") {
    rows = rows.filter((b) => b.isFeatured === 1);
  }

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q),
    );
  }

  let enriched = await Promise.all(rows.map(enrichBusiness));

  if (category) {
    const cats = category.split(",");
    enriched = enriched.filter((b) =>
      cats.every((c) => b.categories.includes(c)),
    );
  }

  if (brand) {
    const q = brand.toLowerCase();
    enriched = enriched.filter((b) =>
      b.brands.some((br) => br.name.toLowerCase().includes(q)),
    );
  }

  if (city) {
    const q = city.toLowerCase();
    enriched = enriched.filter((b) => b.city?.toLowerCase().includes(q));
  }

  if (lat && lng && radius) {
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const rad = parseFloat(radius);
    enriched = enriched.filter((b) => {
      if (b.lat == null || b.lng == null) return false;
      return haversineKm(centerLat, centerLng, b.lat, b.lng) <= rad;
    });
  }

  if (sort === "distance" && lat && lng) {
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    enriched.sort((a, b) => {
      const da =
        a.lat != null && a.lng != null
          ? haversineKm(centerLat, centerLng, a.lat, a.lng)
          : Infinity;
      const db_ =
        b.lat != null && b.lng != null
          ? haversineKm(centerLat, centerLng, b.lat, b.lng)
          : Infinity;
      return da - db_;
    });
  } else {
    enriched.sort((a, b) => b.is_featured - a.is_featured || b.id - a.id);
  }

  res.json(enriched);
});

// Stats
router.get("/businesses/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(businessesTable);
  const total = all.filter((b) => b.status === "approved").length;
  const featured = all.filter((b) => b.isFeatured === 1).length;
  const pending = all.filter((b) => b.status === "pending").length;
  const brandCount = (await db.select().from(brandsTable)).length;

  const catRows = await db
    .select({ category: businessCategoriesTable.category })
    .from(businessCategoriesTable);
  const catMap: Record<string, number> = {};
  for (const row of catRows) {
    catMap[row.category] = (catMap[row.category] ?? 0) + 1;
  }
  const categories = Object.entries(catMap).map(([name, count]) => ({
    name,
    count,
  }));

  res.json({ total, featured, pending, brandCount, categories });
});

// Owned businesses
router.get(
  "/businesses/owned",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, req.session.userId!));
    const enriched = await Promise.all(rows.map(enrichBusiness));
    res.json(enriched);
  },
);

// Single business (public/owner/admin)
router.get("/businesses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [b] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, id));
  if (!b) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  if (
    b.status !== "approved" &&
    (!req.session.userId ||
      (req.session.role !== "admin" && b.ownerId !== req.session.userId))
  ) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const base = await enrichBusiness(b);
  const photos = await db
    .select()
    .from(businessPhotosTable)
    .where(eq(businessPhotosTable.businessId, id));
  const coupons = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.businessId, id));

  res.json({
    ...base,
    photos: photos.map((p) => ({
      id: p.id,
      business_id: p.businessId,
      photo_path: p.photoPath,
      display_order: p.displayOrder,
    })),
    coupons: coupons.map((c) => ({
      id: c.id,
      business_id: c.businessId,
      image_path: c.imagePath,
      title: c.title,
    })),
  });
});

// Create business
router.post(
  "/businesses",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const { name, address, street, city, state, zip, phone, website, hours_json, description, instagram, facebook, google_reviews_url, categories, brand_ids, on_site_smoking_area } =
      req.body as {
        name: string;
        address?: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        phone?: string;
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
        ownerId: req.session.userId!,
        name,
        address: composedAddress,
        street: street ?? null,
        city: city ?? null,
        state: state ?? null,
        zip: zip ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        phone: phone ?? null,
        website: website ?? null,
        hours: composeHoursDisplay(hours_json),
        hoursJson: hours_json ?? null,
        description: description ?? null,
        instagram: normalizeHandle(instagram, "instagram.com"),
        facebook: normalizeHandle(facebook, "facebook.com"),
        googleReviewsUrl: google_reviews_url ?? null,
        onSiteSmokingArea: on_site_smoking_area ? 1 : 0,
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

    res.status(201).json(await enrichBusiness(business));
  },
);

// Update business
router.put(
  "/businesses/:id",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { name, street, city, state, zip, phone, website, hours_json, description, instagram, facebook, google_reviews_url, categories, brand_ids, on_site_smoking_area } =
      req.body as {
        name?: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        phone?: string;
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

    const newStreet = street !== undefined ? street : b.street ?? undefined;
    const newCity = city !== undefined ? city : b.city ?? undefined;
    const newState = state !== undefined ? state : b.state ?? undefined;
    const newZip = zip !== undefined ? zip : b.zip ?? undefined;
    // Only recompose the address when a complete structured address is
    // available. This prevents partial updates (or legacy rows with missing
    // structured fields) from degrading a valid full address into a fragment.
    const hasCompleteAddress = !!(
      newStreet?.trim() &&
      newCity?.trim() &&
      newState?.trim() &&
      newZip?.trim()
    );
    const composedAddress = hasCompleteAddress
      ? composeAddress(newStreet, newCity, newState, newZip, b.address)
      : b.address;

    let newLat = b.lat;
    let newLng = b.lng;
    if (hasCompleteAddress && composedAddress !== b.address) {
      const coords = await geocode(composedAddress);
      if (coords) {
        newLat = coords.lat;
        newLng = coords.lng;
      }
    }

    const updates: Partial<typeof businessesTable.$inferInsert> = {
      name: name ?? b.name,
      address: composedAddress,
      street: newStreet ?? null,
      city: newCity ?? null,
      state: newState ?? null,
      zip: newZip ?? null,
      lat: newLat,
      lng: newLng,
      phone: phone !== undefined ? phone : b.phone,
      website: website !== undefined ? website : b.website,
      hours: hours_json !== undefined ? composeHoursDisplay(hours_json) : b.hours,
      hoursJson: hours_json !== undefined ? hours_json : b.hoursJson,
      description: description !== undefined ? description : b.description,
      instagram: instagram !== undefined ? normalizeHandle(instagram, "instagram.com") : b.instagram,
      facebook: facebook !== undefined ? normalizeHandle(facebook, "facebook.com") : b.facebook,
      googleReviewsUrl: google_reviews_url !== undefined ? google_reviews_url : b.googleReviewsUrl,
      onSiteSmokingArea: on_site_smoking_area !== undefined ? (on_site_smoking_area ? 1 : 0) : b.onSiteSmokingArea,
      lastUpdated: new Date(),
    };

    if (b.status === "rejected") {
      updates.status = "pending";
      updates.rejectionReason = null;
    }

    await db.update(businessesTable).set(updates).where(eq(businessesTable.id, id));

    if (categories) {
      await db
        .delete(businessCategoriesTable)
        .where(eq(businessCategoriesTable.businessId, id));
      if (categories.length) {
        await db.insert(businessCategoriesTable).values(
          categories.map((cat) => ({ businessId: id, category: cat })),
        );
      }
    }

    if (brand_ids) {
      await db
        .delete(businessBrandsTable)
        .where(eq(businessBrandsTable.businessId, id));
      if (brand_ids.length) {
        await db.insert(businessBrandsTable).values(
          brand_ids.map((bid) => ({ businessId: id, brandId: bid })),
        );
      }
    }

    res.json({ success: true });
  },
);

// Upload logo
router.post(
  "/businesses/:id/logo",
  requireLogin,
  requireBusiness,
  upload.single("logo"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b || !req.file) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (b.logoPath) await deleteFromGCS(b.logoPath);
    const filename = makeUploadFilename("logo", req.file.originalname);
    await uploadBufferToGCS(filename, req.file.buffer, req.file.mimetype);
    await db
      .update(businessesTable)
      .set({ logoPath: filename })
      .where(eq(businessesTable.id, id));
    res.json({ logo_path: filename });
  },
);

// Upload photo
router.post(
  "/businesses/:id/photos",
  requireLogin,
  requireBusiness,
  upload.single("photo"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b || !req.file) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const existing = await db
      .select()
      .from(businessPhotosTable)
      .where(eq(businessPhotosTable.businessId, id));
    if (existing.length >= 3) {
      res.status(400).json({ error: "Maximum 3 photos allowed" });
      return;
    }
    const filename = makeUploadFilename("photo", req.file.originalname);
    await uploadBufferToGCS(filename, req.file.buffer, req.file.mimetype);
    await db.insert(businessPhotosTable).values({
      businessId: id,
      photoPath: filename,
      displayOrder: existing.length + 1,
    });
    res.status(201).json({ path: filename });
  },
);

// Delete photo
router.delete(
  "/businesses/:id/photos/:photoId",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const rawPhotoId = Array.isArray(req.params.photoId)
      ? req.params.photoId[0]
      : req.params.photoId;
    const id = parseInt(rawId, 10);
    const photoId = parseInt(rawPhotoId, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [photo] = await db
      .select()
      .from(businessPhotosTable)
      .where(
        and(
          eq(businessPhotosTable.id, photoId),
          eq(businessPhotosTable.businessId, id),
        ),
      );
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    await deleteFromGCS(photo.photoPath);
    await db
      .delete(businessPhotosTable)
      .where(eq(businessPhotosTable.id, photoId));
    res.json({ success: true });
  },
);

// Upload coupon
router.post(
  "/businesses/:id/coupons",
  requireLogin,
  requireBusiness,
  uploadCoupon.single("coupon"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b || !req.file) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const existing = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.businessId, id));
    if (existing.length >= 3) {
      res.status(400).json({ error: "Maximum 3 coupons allowed" });
      return;
    }
    const filename = makeUploadFilename("coupon", req.file.originalname);
    await uploadBufferToGCS(filename, req.file.buffer, req.file.mimetype);
    await db.insert(couponsTable).values({
      businessId: id,
      imagePath: filename,
      title: (req.body as { title?: string }).title ?? null,
    });
    res.status(201).json({ path: filename });
  },
);

// Delete coupon
router.delete(
  "/businesses/:id/coupons/:couponId",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const rawCouponId = Array.isArray(req.params.couponId)
      ? req.params.couponId[0]
      : req.params.couponId;
    const id = parseInt(rawId, 10);
    const couponId = parseInt(rawCouponId, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        and(
          eq(businessesTable.id, id),
          eq(businessesTable.ownerId, req.session.userId!),
        ),
      );
    if (!b) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(
        and(eq(couponsTable.id, couponId), eq(couponsTable.businessId, id)),
      );
    if (!coupon) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }
    await deleteFromGCS(coupon.imagePath);
    await db.delete(couponsTable).where(eq(couponsTable.id, couponId));
    res.json({ success: true });
  },
);

// Delete business (admin calls this)
router.delete(
  "/businesses/:id",
  requireLogin,
  async (req, res): Promise<void> => {
    if (req.session.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, id));
    if (b?.logoPath) await deleteFromGCS(b.logoPath);
    await db.delete(businessesTable).where(eq(businessesTable.id, id));
    res.json({ success: true });
  },
);

// Get user email by id (helper used by admin route)
export { usersTable };

export default router;
