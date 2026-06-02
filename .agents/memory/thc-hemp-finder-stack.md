---
name: THC Hemp Finder stack decisions
description: Non-obvious decisions for the THC Hemp Finder project — auth, uploads, geocoding, leaflet, admin seed
---

## Categories (authoritative list)
Flower, Pre-Rolls, Concentrates, Edibles, Drinks, Topicals, CBD Products, Bongs/Pipes, Cones/Papers, Lighters/Torches, Batteries/E-Devices. Update ALL_CATEGORIES in both home.tsx AND add-edit-business.tsx together.

**How to apply:** Update `ALL_CATEGORIES` in both `home.tsx` and `add-edit-business.tsx` together.

## Font strategy
- `Permanent Marker` (font-display class) — ONLY for brand name "THC Finder" in navbar and age gate
- `Barlow Condensed 700` (font-heading class / h1–h6) — all headings site-wide
- `Montserrat` (font-sans) — body text

## Color palette (updated)
- Background: near-black `#121212` (`0 0% 7%`)
- Primary: deep forest green `#1A3E1E`
- Secondary/gold: `#D4AF37`
- Accent/bright green: `#00C853` (buttons, active chips)
- Navbar: gradient `#0e2410 → #1A3E1E → #000`

## B2B Banner Ad
Stored in `b2b_banner_ad` table (id=1 singleton). Public GET at `/api/admin/b2b-banner`. Admin PUT at same URL. Displayed by `<B2BBannerAd>` component only on Dashboard and AddEditBusiness pages.

## Photo limit
Max photos per business is **3** (was 6). Enforced in `businesses.ts` route and labeled in `add-edit-business.tsx`.

## Session Auth
Uses `express-session` + `connect-pg-simple` (PostgreSQL session store). No JWT, no Clerk. Session table is `session` (auto-created by connect-pg-simple). `SESSION_SECRET` env var required.

**Why:** User explicitly chose session-based auth for simplicity over JWT complexity.

## Admin Seed
Admin user is created/promoted on API server startup via `seedAdmin()` in `src/seed-admin.ts`. Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars. Safe to re-run — idempotent.

**Why:** No separate seed script needed; startup guarantees admin exists.

## Geocoding
Uses Nominatim (OpenStreetMap) free API — no key required. Called on business create/update when address changes. `User-Agent: THCHempFinder/1.0` header required by Nominatim ToS.

**Why:** Zero cost, no API key management.

## Leaflet Map
`react-leaflet` is imported directly (NOT via `lazy()` + `Suspense`). Lazy loading causes "Invalid hook call" / "Suspense is not defined" errors due to duplicate React in Vite's module graph.

**How to apply:** Always import `BusinessMap` synchronously in `home.tsx`.

## Public Admin Endpoints
`GET /api/admin/banner` and `GET /api/admin/popup` are intentionally public (no `requireAdmin`). This lets the banner and popup display to all site visitors. Only the PUT endpoints require admin.

**Why:** Banner/popup need to load for all anonymous users on every page.

## File Uploads
Stored in `artifacts/api-server/uploads/` (relative to the binary's `__dirname`). Served at `/api/uploads/:filename` as static. Max 5MB per file, 6 photos/business, 3 coupons/business.
