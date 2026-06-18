import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("business"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  lat: real("lat"),
  lng: real("lng"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  hours: text("hours"),
  hoursJson: text("hours_json"),
  description: text("description"),
  logoPath: text("logo_path"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  isFeatured: integer("is_featured").notNull().default(0),
  onSiteSmokingArea: integer("on_site_smoking_area").notNull().default(0),
  instagram: text("instagram"),
  facebook: text("facebook"),
  googleReviewsUrl: text("google_reviews_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const claimsTable = pgTable("claims", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  claimantEmail: text("claimant_email"),
  claimantPhone: text("claimant_phone"),
  verificationMethod: text("verification_method"),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at"),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  otpLockedUntil: timestamp("otp_locked_until"),
  documentPath: text("document_path"),
  claimRejectionReason: text("claim_rejection_reason"),
  contestDeadline: timestamp("contest_deadline"),
  clientIp: text("client_ip"),
});

export const businessCategoriesTable = pgTable(
  "business_categories",
  {
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.category] })],
);

export const businessPhotosTable = pgTable("business_photos", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  photoPath: text("photo_path").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  imagePath: text("image_path").notNull(),
  title: text("title"),
});

export const brandsTable = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  isFeatured: integer("is_featured").notNull().default(0),
  logoPath: text("logo_path"),
  status: text("status").notNull().default("approved"),
});

export const businessBrandsTable = pgTable(
  "business_brands",
  {
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brandsTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.brandId] })],
);

export const bannerAdTable = pgTable("banner_ad", {
  id: integer("id").primaryKey().default(1),
  imagePath: text("image_path"),
  mobileImagePath: text("mobile_image_path"),
  linkUrl: text("link_url"),
  mobileLinkUrl: text("mobile_link_url"),
  linkOpensNewTab: integer("link_opens_new_tab").notNull().default(1),
  brandFilter: text("brand_filter"),
});

export const b2bBannerAdTable = pgTable("b2b_banner_ad", {
  id: integer("id").primaryKey().default(1),
  imagePath: text("image_path"),
  mobileImagePath: text("mobile_image_path"),
  linkUrl: text("link_url"),
  mobileLinkUrl: text("mobile_link_url"),
  linkOpensNewTab: integer("link_opens_new_tab").notNull().default(1),
});

export const popupAdTable = pgTable("popup_ad", {
  id: integer("id").primaryKey().default(1),
  imagePath: text("image_path"),
  mobileImagePath: text("mobile_image_path"),
  linkUrl: text("link_url"),
  mobileLinkUrl: text("mobile_link_url"),
  isActive: integer("is_active").notNull().default(0),
  linkOpensNewTab: integer("link_opens_new_tab").notNull().default(1),
  brandFilter: text("brand_filter"),
});

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
});

export const sessionsTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const claimAuditLogsTable = pgTable("claim_audit_logs", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claimsTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  actorSessionId: text("actor_session_id"),
  clientIp: text("client_ip"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  actionType: text("action_type").notNull(),
  metadata: text("metadata"),
});

export const flaggedIpsTable = pgTable("flagged_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").unique().notNull(),
  flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
  flaggedReason: text("flagged_reason").notNull(),
  clearedAt: timestamp("cleared_at"),
  clearedByUserId: integer("cleared_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
});

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

export type User = typeof usersTable.$inferSelect;
export type Business = typeof businessesTable.$inferSelect;
export type Brand = typeof brandsTable.$inferSelect;
export type Photo = typeof businessPhotosTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type BannerAd = typeof bannerAdTable.$inferSelect;
export type B2BBannerAd = typeof b2bBannerAdTable.$inferSelect;
export type PopupAd = typeof popupAdTable.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
export type Claim = typeof claimsTable.$inferSelect;
export type ClaimAuditLog = typeof claimAuditLogsTable.$inferSelect;
export type FlaggedIp = typeof flaggedIpsTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
export type City = typeof citiesTable.$inferSelect;
