---
name: Leaflet map collapses on mobile
description: Why a full-height Leaflet map renders on desktop but vanishes on mobile, and the definite-height fix
---

# Leaflet map collapses to 0 height on mobile

Leaflet's map container uses `height: 100%` (`h-full`). Percentage/`h-full`
heights only resolve when **every ancestor up to the viewport has a definite
height**. `min-height` (e.g. Tailwind `min-h-[100dvh]`) is NOT a definite height
for this purpose — children's `h-full` resolves to 0.

**Why it works on desktop but not mobile:** on desktop the visible sidebar gives
the flex row an intrinsic height, and the map (flex-1, cross-axis stretch in a
flex-row) matches it. On mobile the sidebar is hidden, so nothing supplies
height and the map collapses to nothing.

**Fix:** anchor a definite height chain from the top.
- `html, body, #root { height: 100%; }` in index.css base layer (none had height).
- Layout shell: `h-full ... overflow-hidden` (a definite height), NOT `min-h-[100dvh]`.
- `<main>`: `flex-1 min-h-0 overflow-y-auto` so content-heavy pages still scroll.
- Then `flex-1 min-h-0` down the chain propagates a real height to the map.

**How to apply:** any full-bleed map/canvas that uses `h-full`. Don't rely on
`min-h-*` + `flex-1` alone — verify there's a definite-height ancestor.
A hardcoded `h-[calc(100dvh-64px)]` also works but breaks when extra elements
(e.g. a top banner) are added above, since the subtracted constant goes stale.
