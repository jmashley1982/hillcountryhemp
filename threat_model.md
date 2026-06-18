# Threat Model

## Project Overview

THC Hemp Finder is a public business-directory web application for Texas Hill Country hemp shops. It uses a React frontend and an Express 5 API with PostgreSQL-backed sessions, Drizzle ORM, file uploads to object storage, and Resend/SMTP for transactional email. The main user roles are anonymous visitors, business users who manage listings, and admins who approve listings and manage ads, brands, claims, and taxonomy.

## Assets

- **User accounts and sessions** — business and admin email/password accounts plus session cookies. Compromise enables listing tampering, admin actions, and account takeover.
- **Business listing data** — ownership, approval status, public contact data, brand associations, coupons, and uploaded media. Tampering can deface the directory or misroute customers.
- **Uploaded files and ad creatives** — business logos, photos, coupons, and admin-managed banner/popup assets served back to browsers. Unsafe handling can expose server files or deliver malicious content.
- **Admin-only workflows** — listing approval/rejection, featured placement, claim resolution, image deletion, category/city management, and ad configuration. These actions directly control platform integrity.
- **Application secrets and third-party credentials** — session secret, database URL, admin bootstrap password, object-storage access, and Resend/SMTP credentials.
- **Password reset capability** — reset tokens and password-change flows. Weaknesses here allow account takeover without knowing the current password.

## Trust Boundaries

- **Browser to API** — all client input is untrusted, including authenticated business/admin requests and multipart uploads.
- **Anonymous to authenticated to admin** — public listing/ad endpoints coexist with business-owner and admin-only routes; server-side authorization must enforce all boundaries.
- **API to PostgreSQL** — the API has direct access to users, sessions, claims, and reset tokens.
- **API to object storage / local upload fallback** — uploaded filenames and file-serving requests cross into filesystem or GCS access paths.
- **API to external services** — the server calls Nominatim for geocoding and Resend/SMTP for email delivery.
- **Dev-only vs production** — `artifacts/mockup-sandbox` is dev-only per project assumptions and should be ignored unless production reachability is shown.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/thc-finder/src/App.tsx`.
- **Highest-risk areas:** `routes/auth.ts`, `routes/businesses.ts`, `routes/admin.ts`, `lib/gcs.ts`, `app.ts`, `lib/mailer.ts`.
- **Public surfaces:** `/api/businesses*`, `/api/brands`, `/api/popup`, `/api/admin/banner`, `/api/admin/popup`, `/api/uploads/*`, public React pages.
- **Authenticated business surfaces:** listing creation/editing, uploads, claims, account settings.
- **Admin surfaces:** listing moderation, claim resolution, ad management, image deletion, category/city/brand management.
- **Dev-only areas to usually ignore:** `artifacts/mockup-sandbox/**`, local-only operational scripts unless production reachability is proven.

## Threat Categories

### Spoofing

The application relies entirely on session cookies for business and admin authentication. Session identifiers must be unpredictable, tied to a strong deployment-specific secret, and protected with production-safe cookie attributes. Password reset flows must ensure possession of a currently valid token is enough for exactly one password change and must not leave parallel reset links usable after a password update.

### Tampering

Business users and admins can submit rich listing metadata, external URLs, and uploaded files. The server must validate these fields independently of frontend checks, constrain uploaded content to intended formats, and ensure file-serving paths cannot be redirected outside the upload namespace. All moderation and claim decisions must remain server-authorized.

### Information Disclosure

Public endpoints intentionally expose approved listings and selected ad metadata, but unpublished listings, admin-only image inventories, user emails, sessions, reset tokens, and server files must remain inaccessible. File-serving and error handling must not expose arbitrary local files, stack traces, or internal configuration.

### Denial of Service

Public auth and listing endpoints are internet reachable on a public deployment. Login, password-reset, and other unauthenticated or lightly authenticated endpoints must resist brute force and resource abuse. Upload handling and image processing must continue enforcing size/type limits so attackers cannot exhaust CPU, memory, or storage.

### Elevation of Privilege

A business user must never gain admin capabilities or access other businesses' unpublished data. Stored content rendered into admin or public browsers must not enable script execution in the application origin. Claim and moderation workflows must not permit unauthorized ownership transfer or cross-account actions.