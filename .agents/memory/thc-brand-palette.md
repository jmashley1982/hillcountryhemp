---
name: THC / Hill Country Hemp Finder brand palette
description: Brand identity (name, domain, logo, color palette) for the thc-finder artifact and how colors map to theme tokens.
---

# Texas Hill Country Hemp Finder — brand

- **Product name**: Texas Hill Country Hemp Finder (the artifact dir is still `thc-finder`; older copy said "THC Finder").
- **Domain**: hillcountryhempfinder.com (use for demo ad creatives, emails like ads@hillcountryhempfinder.com).
- **Logo**: provided PNG in `attached_assets/`, imported via the `@assets` Vite alias. Used in navbar + age gate. It is a white wordmark with willow-green "TEXAS", so it needs a **dark backdrop**.

## Palette (from user's Coolors)
- Willow Green `#99CC66` = hsl(90 50% 60%) — **primary brand pop color** (was gold `#D4AF37`). Use dark foreground on it.
- Frosted Blue `#84C7D0` = hsl(187 45% 67%) — **secondary / active / feature states** (was bright green `#00C853`; rgba was `rgba(0,200,83,...)` → `rgba(132,199,208,...)`).
- Tomato `#FE4A49` = hsl(0 99% 64%) — **destructive**.
- Iron Grey `#4C5B61` family = hue ~200 — **neutrals**: background hsl(200 14% 8%), cards/borders/muted in the 200 hue range. Dark gradients use `#1a2226 / #2c3a40 / #0a1012`.

## Conventions / gotchas
- The codebase hard-codes hex in `className` (e.g. `text-[#99CC66]`) in many pages AND uses theme tokens in index.css `:root`. When recoloring, swap BOTH the hard-coded hex across pages/components AND the `:root` vars, or the rebrand drifts.
- Gold hover shade `#c49f2a` → darker willow `#82B54F`.
- **Why dark theme stays**: the white logo requires a dark background; keep backgrounds dark even though the palette itself is light/vibrant.
