import { Router } from "express";
import multer from "multer";
import { eq, and, isNull, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  businessesTable,
  businessCategoriesTable,
  businessPhotosTable,
  couponsTable,
  brandsTable,
  businessBrandsTable,
  claimsTable,
} from "@workspace/db";
import { requireLogin, requireBusiness } from "../middlewares/auth.js";
import {
  sendAdminAlert,
  sendClaimOtpEmail,
  sendOwnerContestNotification,
} from "../lib/mailer.js";
import { logger } from "../lib/logger.js";
import {
  appendAuditLog,
  checkUserRateLimit,
  checkIpRateLimit,
  isIpCurrentlyFlagged,
  flagIp,
  getClientIp,
  extractEmailDomain,
  extractWebsiteDomain,
  isHighTrustMatch,
  generateOtp,
  hashOtp,
  verifyOtp,
} from "../lib/claim-helpers.js";
import { uploadBufferToGCS, makeUploadFilename, deleteFromGCS } from "../lib/gcs.js";
import { ACCEPTED_IMAGE_MIMES, compressImage } from "../lib/compress.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});
const uploadCoupon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_MIMES.has(file.mimetype) || file.mimetype === "application/pdf")
      cb(null, true);
    else cb(new Error("Only image or PDF files are allowed"));
  },
});
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_MIMES.has(file.mimetype) || file.mimetype === "application/pdf")
      cb(null, true);
    else cb(new Error("Only image or PDF files are allowed for claim documents"));
  },
});

/** Accept only http/https URLs; return null for anything else (e.g. javascript:, data:, relative paths). */
function sanitizeHttpUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const { protocol } = new URL(value);
    if (protocol !== "http:" && protocol !== "https:") return null;
  } catch {
    return null;
  }
  return value;
}

/**
 * Accept a Google Reviews URL only when it resolves to a known Google-owned
 * host (*.google.com, google.com, g.page, goo.gl, maps.app.goo.gl).
 * Returns null for any other domain or non-http(s) scheme.
 */
function sanitizeGoogleReviewsUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  const googleOwned =
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "g.page" ||
    host === "goo.gl" ||
    host === "maps.app.goo.gl";
  return googleOwned ? value : null;
}

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
  ownerId: number | null;
  name: string;
  address: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
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
    email: b.email,
    website: b.website,
    hours: composeHoursDisplay(b.hoursJson),
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

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

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
    const abbr = DAY_ABBR[day] ?? day;
    if (!entry) return null;
    if (entry.closed) return `${abbr}: Closed`;
    if (!entry.open || !entry.close) return null;
    return `${abbr}: ${entry.open} – ${entry.close}`;
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

function getAdminPanelUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
  const proto = domain.includes("localhost") ? "http" : "https";
  const basePath = process.env.BASE_PATH ?? "";
  return `${proto}://${domain}${basePath}/admin`;
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
      const featuredDiff = b.is_featured - a.is_featured;
      if (featuredDiff !== 0) return featuredDiff;
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
    enriched.sort(
      (a, b) =>
        b.is_featured - a.is_featured ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
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
    const { name, address, street, city, state, zip, phone, email, website, hours_json, description, instagram, facebook, google_reviews_url, categories, brand_ids, on_site_smoking_area, owner_authorized } =
      req.body as {
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
        owner_authorized?: boolean;
      };
    const composedAddress = composeAddress(street, city, state, zip, address ?? "");
    if (!name || !composedAddress) {
      res.status(400).json({ error: "Name and address required" });
      return;
    }
    const coords = await geocode(composedAddress);

    if (!owner_authorized) {
      await db.insert(businessesTable).values({
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
        email: email ?? null,
        website: sanitizeHttpUrl(website),
        hours: composeHoursDisplay(hours_json),
        hoursJson: hours_json ?? null,
        description: description ?? null,
        instagram: normalizeHandle(instagram, "instagram.com"),
        facebook: normalizeHandle(facebook, "facebook.com"),
        googleReviewsUrl: sanitizeGoogleReviewsUrl(google_reviews_url),
        onSiteSmokingArea: on_site_smoking_area ? 1 : 0,
        status: "rejected",
        rejectionReason: "Owner authorization not confirmed.",
      });
      res.status(400).json({ error: "You must confirm that you are the owner or authorized representative of this business." });
      return;
    }

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
        email: email ?? null,
        website: sanitizeHttpUrl(website),
        hours: composeHoursDisplay(hours_json),
        hoursJson: hours_json ?? null,
        description: description ?? null,
        instagram: normalizeHandle(instagram, "instagram.com"),
        facebook: normalizeHandle(facebook, "facebook.com"),
        googleReviewsUrl: sanitizeGoogleReviewsUrl(google_reviews_url),
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

    const enriched = await enrichBusiness(business);
    res.status(201).json(enriched);

    const [owner] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!));
    sendAdminAlert({
      subject: "New listing submitted for review",
      headline: "A shop has submitted a listing for review",
      details: [
        { label: "Shop name", value: business.name },
        { label: "Owner email", value: owner?.email ?? "unknown" },
      ],
      adminPanelUrl: getAdminPanelUrl(),
    }).catch((err: unknown) => {
      logger.warn({ err }, "Failed to send admin alert for new listing");
    });
  },
);

// Update business (owner or admin)
router.put(
  "/businesses/:id",
  requireLogin,
  async (req, res): Promise<void> => {
    const isAdmin = req.session.role === "admin";
    if (!isAdmin && req.session.role !== "business") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const raw = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(raw, 10);
    const [b] = await db
      .select()
      .from(businessesTable)
      .where(
        isAdmin
          ? eq(businessesTable.id, id)
          : and(eq(businessesTable.id, id), eq(businessesTable.ownerId, req.session.userId!)),
      );
    if (!b) {
      res.status(isAdmin ? 404 : 403).json({ error: isAdmin ? "Business not found" : "Forbidden" });
      return;
    }

    const { name, street, city, state, zip, phone, email, website, hours_json, description, instagram, facebook, google_reviews_url, categories, brand_ids, on_site_smoking_area } =
      req.body as {
        name?: string;
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
    const needsGeocode = hasCompleteAddress && (composedAddress !== b.address || b.lat == null || b.lng == null);
    if (needsGeocode) {
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
      email: email !== undefined ? email : b.email,
      website: website !== undefined ? sanitizeHttpUrl(website) : b.website,
      hours: hours_json !== undefined ? composeHoursDisplay(hours_json) : b.hours,
      hoursJson: hours_json !== undefined ? hours_json : b.hoursJson,
      description: description !== undefined ? description : b.description,
      instagram: instagram !== undefined ? normalizeHandle(instagram, "instagram.com") : b.instagram,
      facebook: facebook !== undefined ? normalizeHandle(facebook, "facebook.com") : b.facebook,
      googleReviewsUrl: google_reviews_url !== undefined ? sanitizeGoogleReviewsUrl(google_reviews_url) : b.googleReviewsUrl,
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
    const compressed = await compressImage(req.file.buffer);
    const filename = makeUploadFilename("logo", req.file.originalname, compressed.ext);
    await uploadBufferToGCS(filename, compressed.buffer, compressed.mimetype);
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
    const compressedPhoto = await compressImage(req.file.buffer);
    const filename = makeUploadFilename("photo", req.file.originalname, compressedPhoto.ext);
    await uploadBufferToGCS(filename, compressedPhoto.buffer, compressedPhoto.mimetype);
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
    let couponBuf = req.file.buffer;
    let couponMime = req.file.mimetype;
    let couponExt: string | undefined;
    if (couponMime !== "application/pdf") {
      const c = await compressImage(req.file.buffer);
      couponBuf = c.buffer;
      couponMime = c.mimetype;
      couponExt = c.ext;
    }
    const filename = makeUploadFilename("coupon", req.file.originalname, couponExt);
    await uploadBufferToGCS(filename, couponBuf, couponMime);
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

// ─── Claim verification state machine ──────────────────────────────────────

const ACTIVE_CLAIM_STATUSES = [
  "PENDING_EMAIL_CHECK",
  "AWAITING_OTP",
  "AWAITING_DOCUMENT",
  "PENDING_MANUAL_REVIEW",
  "PENDING_OWNER_REVIEW",
  "pending",
];

// Initiate a claim — starts the multi-step verification flow
router.post(
  "/businesses/:id/claim",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const clientIp = getClientIp(req as Parameters<typeof getClientIp>[0]);

    const [flagged, ipOk] = await Promise.all([
      isIpCurrentlyFlagged(clientIp),
      checkIpRateLimit(clientIp),
    ]);
    if (flagged) {
      res.status(429).json({ error: "Access temporarily restricted. Contact support if this is an error." });
      return;
    }
    if (!ipOk) {
      await flagIp(clientIp, "IP rate limit exceeded on claim initiation");
      await appendAuditLog({ clientIp, actionType: "ip_flagged", actorUserId: req.session.userId, metadata: { reason: "IP_QUOTA_EXCEEDED" } });
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    const userOk = await checkUserRateLimit(req.session.userId!);
    if (!userOk) {
      res.status(429).json({ error: "You've submitted too many claims recently. Please wait 24 hours before trying again." });
      return;
    }

    const { email, phone } = req.body as { email?: string; phone?: string };
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "A valid email address is required to verify your claim." });
      return;
    }

    const [biz] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, id));
    if (!biz) { res.status(404).json({ error: "Business not found" }); return; }

    // Check for an existing in-progress claim by this user
    const [existingActive] = await db
      .select()
      .from(claimsTable)
      .where(
        and(
          eq(claimsTable.businessId, id),
          eq(claimsTable.userId, req.session.userId!),
          inArray(claimsTable.status, ACTIVE_CLAIM_STATUSES),
        ),
      );
    if (existingActive) {
      const st = existingActive.status;
      const msg =
        st === "AWAITING_OTP"
          ? "A verification code was already sent to your email. Please check your inbox."
          : st === "AWAITING_DOCUMENT"
            ? "Please upload a supporting document to proceed with your claim."
            : "You already have a claim in progress for this business.";
      res.status(400).json({ error: msg, status: st, claimId: existingActive.id });
      return;
    }

    // Domain-based classification
    const emailDomain = extractEmailDomain(email);
    const websiteDomain = extractWebsiteDomain(biz.website);
    const highTrust = emailDomain && websiteDomain
      ? isHighTrustMatch(emailDomain, websiteDomain)
      : false;
    const method: "domain_otp" | "document" = highTrust ? "domain_otp" : "document";

    const hasExistingOwner = biz.ownerId !== null;
    const contestDeadline = hasExistingOwner ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null;

    const [claim] = await db
      .insert(claimsTable)
      .values({
        businessId: id,
        userId: req.session.userId!,
        status: method === "domain_otp" ? "AWAITING_OTP" : "AWAITING_DOCUMENT",
        claimantEmail: email.trim().toLowerCase(),
        claimantPhone: phone?.trim() ?? null,
        verificationMethod: method,
        otpAttempts: 0,
        contestDeadline,
        clientIp,
      })
      .returning();

    await appendAuditLog({
      claimId: claim.id,
      actorUserId: req.session.userId,
      actorSessionId: req.sessionID,
      clientIp,
      actionType: "claim_initiated",
      metadata: { method, businessId: id, emailDomain, websiteDomain, hasExistingOwner },
    });

    // Path A: generate and email OTP
    if (method === "domain_otp") {
      const code = generateOtp();
      const otpHash = await hashOtp(code);
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.update(claimsTable).set({ otpHash, otpExpiresAt }).where(eq(claimsTable.id, claim.id));
      sendClaimOtpEmail(email.trim(), biz.name, code).catch((err: unknown) => {
        logger.warn({ err, to: email }, "Failed to send OTP email");
      });
      await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "otp_requested", metadata: { emailDomain } });
    }

    // Notify existing owner of a contest
    if (hasExistingOwner && biz.ownerId) {
      const [ownerRow] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, biz.ownerId));
      if (ownerRow) {
        sendOwnerContestNotification(ownerRow.email, biz.name, contestDeadline!, email.trim()).catch((err: unknown) => {
          logger.warn({ err }, "Failed to send owner contest notification");
        });
        await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "contest_started", metadata: { contestDeadlineIso: contestDeadline?.toISOString() } });
      }
    }

    sendAdminAlert({
      subject: "New claim initiated on a listing",
      headline: "A user started the multi-step claim verification flow",
      details: [
        { label: "Shop name", value: biz.name },
        { label: "Claimant email", value: email.trim() },
        { label: "Method", value: method === "domain_otp" ? "Domain OTP (fast-track)" : "Document upload" },
        { label: "Existing owner", value: hasExistingOwner ? "Yes — owner contest notification sent" : "No" },
      ],
      adminPanelUrl: getAdminPanelUrl(),
    }).catch((err: unknown) => { logger.warn({ err }, "Failed to send admin alert for claim initiation"); });

    res.status(201).json({ success: true, claimId: claim.id, method: method === "domain_otp" ? "otp" : "document" });
  },
);

// Verify OTP code for a claim in AWAITING_OTP state
router.post(
  "/businesses/:id/claim/verify-otp",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { code } = req.body as { code?: string };
    if (!code || !/^\d{6}$/.test(code.trim())) {
      res.status(400).json({ error: "A 6-digit verification code is required." });
      return;
    }

    const clientIp = getClientIp(req as Parameters<typeof getClientIp>[0]);

    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(and(eq(claimsTable.businessId, id), eq(claimsTable.userId, req.session.userId!), eq(claimsTable.status, "AWAITING_OTP")));
    if (!claim) { res.status(400).json({ error: "No pending OTP verification found for this business." }); return; }

    if (claim.otpLockedUntil && claim.otpLockedUntil > new Date()) {
      res.status(429).json({ error: "Too many failed attempts. Please wait 60 minutes before trying again.", locked_until: claim.otpLockedUntil.toISOString() });
      return;
    }
    if (!claim.otpExpiresAt || claim.otpExpiresAt < new Date()) {
      res.status(400).json({ error: "Your verification code has expired. Please start a new claim." });
      return;
    }

    const valid = claim.otpHash ? await verifyOtp(code.trim(), claim.otpHash) : false;

    if (valid) {
      const [biz] = await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, id));
      const hasOwner = biz?.ownerId !== null;

      if (hasOwner) {
        await db.update(claimsTable).set({ status: "PENDING_OWNER_REVIEW", otpHash: null }).where(eq(claimsTable.id, claim.id));
        await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "otp_success", metadata: { outcome: "pending_owner_review" } });
        res.json({ success: true, status: "PENDING_OWNER_REVIEW", message: "Identity verified. The current owner has been notified and has 72 hours to respond. An admin will contact you once the review is complete." });
      } else {
        await db.update(businessesTable).set({ ownerId: req.session.userId! }).where(eq(businessesTable.id, id));
        await db.update(claimsTable).set({ status: "REJECTED", claimRejectionReason: "Another claim was approved" })
          .where(and(eq(claimsTable.businessId, id), inArray(claimsTable.status, ACTIVE_CLAIM_STATUSES)));
        await db.update(claimsTable).set({ status: "APPROVED", otpHash: null }).where(eq(claimsTable.id, claim.id));
        await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "otp_success", metadata: { outcome: "approved" } });
        res.json({ success: true, status: "APPROVED" });
      }
    } else {
      const newAttempts = (claim.otpAttempts ?? 0) + 1;
      const lockout = newAttempts >= 3;
      const otpLockedUntil = lockout ? new Date(Date.now() + 60 * 60 * 1000) : null;
      await db.update(claimsTable).set({ otpAttempts: newAttempts, ...(lockout ? { otpLockedUntil } : {}) }).where(eq(claimsTable.id, claim.id));
      await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: lockout ? "otp_locked" : "otp_failed", metadata: { attempts: newAttempts } });

      if (lockout) {
        res.status(429).json({ error: "Too many failed attempts. Your verification is locked for 60 minutes.", locked_until: otpLockedUntil!.toISOString() });
      } else {
        res.status(400).json({ error: `Invalid code. ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? "s" : ""} remaining.`, attempts_remaining: 3 - newAttempts });
      }
    }
  },
);

// Upload a supporting document for a claim in AWAITING_DOCUMENT state
router.post(
  "/businesses/:id/claim/upload-document",
  requireLogin,
  requireBusiness,
  uploadDocument.single("document"),
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    if (!req.file) { res.status(400).json({ error: "A document file is required (image or PDF, max 5 MB)." }); return; }

    const clientIp = getClientIp(req as Parameters<typeof getClientIp>[0]);

    const [claim] = await db
      .select()
      .from(claimsTable)
      .where(and(eq(claimsTable.businessId, id), eq(claimsTable.userId, req.session.userId!), eq(claimsTable.status, "AWAITING_DOCUMENT")));
    if (!claim) { res.status(400).json({ error: "No pending document upload found for this business." }); return; }

    const [biz] = await db.select({ name: businessesTable.name, ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, id));
    if (!biz) { res.status(404).json({ error: "Business not found" }); return; }

    const isPdf = req.file.mimetype === "application/pdf";
    let documentPath: string;
    if (isPdf) {
      documentPath = makeUploadFilename("claim-doc", req.file.originalname, ".pdf");
      await uploadBufferToGCS(documentPath, req.file.buffer, "application/pdf");
    } else {
      const c = await compressImage(req.file.buffer);
      documentPath = makeUploadFilename("claim-doc", req.file.originalname, c.ext);
      await uploadBufferToGCS(documentPath, c.buffer, c.mimetype);
    }

    await db.update(claimsTable).set({ documentPath, status: "PENDING_MANUAL_REVIEW" }).where(eq(claimsTable.id, claim.id));
    await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "document_uploaded", metadata: { documentPath, businessId: id } });

    sendAdminAlert({
      subject: "Claim document uploaded — manual review needed",
      headline: "A claimant has uploaded a verification document",
      details: [
        { label: "Shop name", value: biz.name },
        { label: "Claimant email", value: claim.claimantEmail ?? "unknown" },
        { label: "Contested listing", value: biz.ownerId ? "Yes (existing owner notified)" : "No" },
      ],
      adminPanelUrl: getAdminPanelUrl(),
    }).catch((err: unknown) => { logger.warn({ err }, "Failed to send admin alert for claim document upload"); });

    if (biz.ownerId && !claim.contestDeadline) {
      const [ownerRow] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, biz.ownerId));
      if (ownerRow) {
        const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
        await db.update(claimsTable).set({ contestDeadline }).where(eq(claimsTable.id, claim.id));
        sendOwnerContestNotification(ownerRow.email, biz.name, contestDeadline, claim.claimantEmail ?? "unknown").catch((err: unknown) => {
          logger.warn({ err }, "Failed to send owner contest notification");
        });
        await appendAuditLog({ claimId: claim.id, actorUserId: req.session.userId, clientIp, actionType: "contest_started", metadata: { ownerId: biz.ownerId } });
      }
    }

    res.json({ success: true, status: "PENDING_MANUAL_REVIEW" });
  },
);

// Get current claim status for the authenticated user + this business
router.get(
  "/businesses/:id/claim/status",
  requireLogin,
  requireBusiness,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [claim] = await db
      .select({
        id: claimsTable.id,
        status: claimsTable.status,
        verificationMethod: claimsTable.verificationMethod,
        otpAttempts: claimsTable.otpAttempts,
        otpLockedUntil: claimsTable.otpLockedUntil,
        otpExpiresAt: claimsTable.otpExpiresAt,
        contestDeadline: claimsTable.contestDeadline,
        claimantEmail: claimsTable.claimantEmail,
      })
      .from(claimsTable)
      .where(and(eq(claimsTable.businessId, id), eq(claimsTable.userId, req.session.userId!)))
      .orderBy(claimsTable.createdAt)
      .limit(1);

    if (!claim) { res.status(404).json({ error: "No claim found for this business." }); return; }

    const now = new Date();
    res.json({
      id: claim.id,
      status: claim.status,
      method: claim.verificationMethod === "domain_otp" ? "otp" : claim.verificationMethod === "document" ? "document" : null,
      otp_locked: !!(claim.otpLockedUntil && claim.otpLockedUntil > now),
      otp_locked_until: claim.otpLockedUntil?.toISOString() ?? null,
      otp_expires_at: claim.otpExpiresAt?.toISOString() ?? null,
      contest_deadline: claim.contestDeadline?.toISOString() ?? null,
      claimant_email: claim.claimantEmail,
    });
  },
);

// Get user email by id (helper used by admin route)
export { usersTable };

export default router;
