# THC Hemp Finder

A map-based business locator for 21+ adults in Texas Hill Country. Businesses list locations, brands, coupons, and photos. Admins approve/reject listings, manage featured shops, brands, and ads.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxy at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, Tailwind CSS + shadcn/ui, react-leaflet (Leaflet maps)
- API: Express 5, express-session (session-based auth, PostgreSQL session store)
- DB: PostgreSQL + Drizzle ORM
- Auth: bcryptjs password hashing, express-session, no JWT/Clerk
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- File uploads: multer → `artifacts/api-server/uploads/`, served at `/api/uploads/`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/index.ts` — Drizzle ORM database schema
- `artifacts/api-server/src/routes/` — Express route handlers (auth, businesses, admin, brands, popup)
- `artifacts/api-server/src/middlewares/auth.ts` — requireLogin, requireAdmin, requireBusiness
- `artifacts/api-server/uploads/` — uploaded files (logos, photos, coupons, ads)
- `artifacts/thc-finder/src/pages/` — React pages (home, dashboard, admin, business-detail, etc.)
- `artifacts/thc-finder/src/components/` — Layout, AgeGate, PopupAd, BusinessMap

## Architecture decisions

- Session-based auth with PostgreSQL session store (connect-pg-simple). No JWT or Clerk.
- Admin user seeded on startup via ADMIN_EMAIL + ADMIN_PASSWORD env vars.
- GET /api/admin/banner and GET /api/admin/popup are public (no auth needed) so the banner/popup can display to all visitors.
- Geocoding via Nominatim (free, no API key) on business create/update.
- File uploads capped at 5MB, photos at 6 per business, coupons at 3 per business.
- Transactional email (password reset, welcome, admin alerts, listing approved/rejected) is sent via Resend, wired through the Replit Resend connector. The mailer fetches the API key from the connector proxy, falling back to a `RESEND_API_KEY` secret. Real delivery requires verifying the `hillcountryhempfinder.com` domain in Resend (DNS records) — until then Resend rejects sends with a 403; failures are logged and never break the request.

## Product

- Public: Interactive Leaflet map of approved hemp shops in Texas Hill Country, category filters, search by name/brand, business detail page with photos and coupons
- Business owners: Register/login, submit listing for review, edit listing, upload logo/photos/coupons, dashboard with status tracking
- Admins: Approve/reject/feature businesses, manage brands, set banner ad and popup ad
- 21+ age gate on first visit, popup ad on first session visit

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing API routes, restart the API Server workflow (it bundles with esbuild).
- `@import "leaflet/dist/leaflet.css"` must stay in `index.css` after installing leaflet in thc-finder.
- Do NOT use `lazy()` + `Suspense` for the Leaflet map component — causes "Invalid hook call" due to duplicate React copies in Vite's module graph.
- Admin password can be changed via the `ADMIN_PASSWORD` env var + server restart (seed logic upserts on startup).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
