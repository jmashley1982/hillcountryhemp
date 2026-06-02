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
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  lat: real("lat"),
  lng: real("lng"),
  phone: text("phone"),
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
  linkUrl: text("link_url"),
});

export const b2bBannerAdTable = pgTable("b2b_banner_ad", {
  id: integer("id").primaryKey().default(1),
  imagePath: text("image_path"),
  linkUrl: text("link_url"),
});

export const popupAdTable = pgTable("popup_ad", {
  id: integer("id").primaryKey().default(1),
  imagePath: text("image_path"),
  linkUrl: text("link_url"),
  isActive: integer("is_active").notNull().default(0),
});

export const sessionsTable = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type Business = typeof businessesTable.$inferSelect;
export type Brand = typeof brandsTable.$inferSelect;
export type Photo = typeof businessPhotosTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type BannerAd = typeof bannerAdTable.$inferSelect;
export type B2BBannerAd = typeof b2bBannerAdTable.$inferSelect;
export type PopupAd = typeof popupAdTable.$inferSelect;
