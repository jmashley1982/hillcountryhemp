import { Router } from "express";
import path from "path";
import multer from "multer";
import { eq, and, isNull, isNotNull, inArray, desc } from "drizzle-orm";
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
  claimAuditLogsTable,
  flaggedIpsTable,
  bannerAdTable,
  b2bBannerAdTable,
  popupAdTable,
} from "@workspace/db";
import { requireLogin, requireAdmin } from "../middlewares/auth.js";
import {
  sendListingApprovedEmail,
  sendListingRejectedEmail,
  sendClaimApprovedEmail,
  sendClaimRejectedEmail,
} from "../lib/mailer.js";
import { appendAuditLog } from "../lib/claim-helpers.js";

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
        website: sanitizeHttpUrl(website),
        hours: composeHoursDisplay(hours_json),
        hoursJson: hours_json ?? null,
        description: description ?? null,
        instagram: normalizeHandle(instagram, "instagram.com"),
        facebook: normalizeHandle(facebook, "facebook.com"),
        googleReviewsUrl: sanitizeGoogleReviewsUrl(google_reviews_url),
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
    const id = parseInt(raw, 10);

    const [business] = await db
      .select({ name: businessesTable.name, ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, id));

    await db
      .update(businessesTable)
      .set({ status: "approved", rejectionReason: null })
      .where(eq(businessesTable.id, id));

    if (business?.ownerId) {
      const [owner] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, business.ownerId));
      if (owner?.email) {
        sendListingApprovedEmail(owner.email, business.name).catch((err: unknown) => {
          req.log.warn({ err }, "Failed to send listing approved email");
        });
      }
    }

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
    const id = parseInt(raw, 10);
    const { reason } = req.body as { reason?: string };
    const rejectionReason = reason?.trim() || "Your listing did not meet our requirements. Please review and resubmit.";

    const [business] = await db
      .select({ name: businessesTable.name, ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, id));

    await db
      .update(businessesTable)
      .set({ status: "rejected", rejectionReason })
      .where(eq(businessesTable.id, id));

    if (business?.ownerId) {
      const [owner] = await db
        .select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, business.ownerId));
      if (owner?.email) {
        sendListingRejectedEmail(owner.email, business.name, rejectionReason).catch((err: unknown) => {
          req.log.warn({ err }, "Failed to send listing rejected email");
        });
      }
    }

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

const ACTIVE_CLAIM_STATUSES = [
  "PENDING_EMAIL_CHECK",
  "AWAITING_OTP",
  "AWAITING_DOCUMENT",
  "PENDING_MANUAL_REVIEW",
  "PENDING_OWNER_REVIEW",
  "pending",
];

// Get all in-progress claims (new multi-step statuses + legacy 'pending')
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
        claimant_email: claimsTable.claimantEmail,
        verification_method: claimsTable.verificationMethod,
        document_path: claimsTable.documentPath,
        contest_deadline: claimsTable.contestDeadline,
        otp_attempts: claimsTable.otpAttempts,
        otp_locked_until: claimsTable.otpLockedUntil,
        rejection_reason: claimsTable.claimRejectionReason,
      })
      .from(claimsTable)
      .innerJoin(businessesTable, eq(businessesTable.id, claimsTable.businessId))
      .innerJoin(usersTable, eq(usersTable.id, claimsTable.userId))
      .where(inArray(claimsTable.status, ACTIVE_CLAIM_STATUSES))
      .orderBy(claimsTable.createdAt);
    res.json(rows.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
      contest_deadline: r.contest_deadline?.toISOString() ?? null,
      otp_locked_until: r.otp_locked_until?.toISOString() ?? null,
    })));
  },
);

// Approve or reject a claim (rejection requires a reason)
router.patch(
  "/admin/claims/:id",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const claimId = parseInt(raw, 10);
    if (isNaN(claimId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status, reason, override } = req.body as { status: string; reason?: string; override?: boolean };

    const [row] = await db
      .select({
        id: claimsTable.id,
        businessId: claimsTable.businessId,
        userId: claimsTable.userId,
        status: claimsTable.status,
        claimantEmail: claimsTable.claimantEmail,
        contestDeadline: claimsTable.contestDeadline,
        userEmail: usersTable.email,
        businessName: businessesTable.name,
      })
      .from(claimsTable)
      .innerJoin(usersTable, eq(usersTable.id, claimsTable.userId))
      .innerJoin(businessesTable, eq(businessesTable.id, claimsTable.businessId))
      .where(eq(claimsTable.id, claimId));

    if (!row) { res.status(404).json({ error: "Claim not found" }); return; }

    const normalizedStatus = (status ?? "").toUpperCase();

    // ── 72-hour owner-contest gate ─────────────────────────────────────
    // When a claim is in PENDING_OWNER_REVIEW the existing owner has 72 hours
    // to approve or contest. Block admin resolution until the window expires
    // unless the admin explicitly passes override:true (which gets audited).
    if (
      row.status === "PENDING_OWNER_REVIEW" &&
      row.contestDeadline &&
      row.contestDeadline > new Date() &&
      !override
    ) {
      res.status(409).json({
        error: `This claim is within the 72-hour owner-review window (deadline: ${row.contestDeadline.toISOString()}). Pass override:true to force resolution and bypass the window.`,
        contestDeadline: row.contestDeadline.toISOString(),
      });
      return;
    }

    if (override) {
      await appendAuditLog({
        claimId,
        actorUserId: req.session.userId,
        actionType: "admin_contest_window_override",
        metadata: { reason: reason?.trim() ?? "no reason given", contestDeadline: row.contestDeadline?.toISOString() },
      });
    }

    if (normalizedStatus === "APPROVED") {
      await db.update(businessesTable).set({ ownerId: row.userId }).where(eq(businessesTable.id, row.businessId));
      await db
        .update(claimsTable)
        .set({ status: "REJECTED", claimRejectionReason: "Another claim was approved" })
        .where(and(eq(claimsTable.businessId, row.businessId), inArray(claimsTable.status, ACTIVE_CLAIM_STATUSES)));
      await db.update(claimsTable).set({ status: "APPROVED" }).where(eq(claimsTable.id, claimId));

      await appendAuditLog({ claimId, actorUserId: req.session.userId, actionType: "approved", metadata: { adminApproval: true, override: !!override } });

      const emailTo = row.claimantEmail ?? row.userEmail;
      sendClaimApprovedEmail(emailTo, row.businessName).catch(() => {});

    } else if (normalizedStatus === "REJECTED") {
      if (!reason?.trim()) {
        res.status(400).json({ error: "A rejection reason is required." });
        return;
      }
      await db.update(claimsTable).set({ status: "REJECTED", claimRejectionReason: reason.trim() }).where(eq(claimsTable.id, claimId));
      await appendAuditLog({ claimId, actorUserId: req.session.userId, actionType: "rejected", metadata: { adminApproval: true, reason: reason.trim() } });

      const emailTo = row.claimantEmail ?? row.userEmail;
      sendClaimRejectedEmail(emailTo, row.businessName, reason.trim()).catch(() => {});

    } else {
      res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
      return;
    }

    res.json({ success: true });
  },
);

// Audit log for all claims on a business
router.get(
  "/admin/audit-log/business/:businessId",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const bizId = parseInt(raw, 10);
    if (isNaN(bizId)) { res.status(400).json({ error: "Invalid businessId" }); return; }

    const claimRows = await db
      .select({ id: claimsTable.id })
      .from(claimsTable)
      .where(eq(claimsTable.businessId, bizId));

    if (claimRows.length === 0) { res.json([]); return; }

    const claimIds = claimRows.map((c) => c.id);
    const logs = await db
      .select()
      .from(claimAuditLogsTable)
      .where(inArray(claimAuditLogsTable.claimId, claimIds))
      .orderBy(desc(claimAuditLogsTable.timestamp));

    res.json(logs.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })));
  },
);

// List all flagged IPs
router.get(
  "/admin/flagged-ips",
  requireLogin,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(flaggedIpsTable).orderBy(desc(flaggedIpsTable.flaggedAt));
    res.json(rows.map((r) => ({
      ...r,
      flagged_at: r.flaggedAt.toISOString(),
      cleared_at: r.clearedAt?.toISOString() ?? null,
    })));
  },
);

// Clear a flagged IP (admin)
router.patch(
  "/admin/flagged-ips/:id/clear",
  requireLogin,
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const flaggedId = parseInt(raw, 10);
    if (isNaN(flaggedId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [existing] = await db.select({ id: flaggedIpsTable.id }).from(flaggedIpsTable).where(eq(flaggedIpsTable.id, flaggedId));
    if (!existing) { res.status(404).json({ error: "Record not found" }); return; }

    await db.update(flaggedIpsTable).set({ clearedAt: new Date(), clearedByUserId: req.session.userId ?? null }).where(eq(flaggedIpsTable.id, flaggedId));
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
