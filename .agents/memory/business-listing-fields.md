---
name: Business listing structured fields
description: How THC Hemp Finder composes/stores address, hours, and social fields, and the legacy-row rules.
---

# Business listing data conventions

Listings are kept uniform via guided form inputs. Several DB columns are *composed* server-side, not entered directly.

- **Address**: form sends `street`/`city`/`state`/`zip`; server composes the `address` string and geocodes that composed value (Nominatim). On update, address is only recomposed/re-geocoded when ALL four parts are present.
  - **Why:** a partial update (or a legacy row missing structured fields) would otherwise degrade a valid full address into a fragment like "Austin" or "TX 78624".
  - **How to apply:** when touching the update route, keep the `hasCompleteAddress` guard; preserve `b.address`/`b.lat`/`b.lng` otherwise.
- **Hours**: form sends `hours_json` (per-day array); server composes the human-readable `hours` display string from it. Editor defaults to 9–7 (Sun closed).
  - **Why:** legacy rows have free-form `hours` text and null `hours_json`; the structured editor can't parse old text, so editing a legacy row can silently overwrite real hours with defaults. A review-warning banner is shown when editing a row that has `hours` but no `hours_json`.
- **Social (instagram/facebook)**: stored as BARE handles (server `normalizeHandle` strips `@`, full URLs, trailing slashes). Display code composes the URL (`https://instagram.com/<handle>`) and must also tolerate legacy rows that still hold full URLs.
- **Coupons**: accept image OR PDF (`uploadCoupon` multer filter); logo/photo are image-only. Display checks `image_path` ending in `.pdf` and renders a "view PDF" link instead of `<img>`.

**USPS address validation** was raised as an open question — not implemented; needs USPS Web Tools credentials. Current validation is Zod format only (2-letter state, 5-digit ZIP) + Nominatim geocoding. Offer as a follow-up if the user wants true deliverability checks.
