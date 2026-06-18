---
name: wouter base-path router + manual history desync
description: Why raw window.history.replaceState breaks under wouter base routing, and the safe pattern for syncing URL query params to state
---

# wouter base-path router + manual history desync

This app's router runs under a base path: `<WouterRouter base={import.meta.env.BASE_URL...}>` in `artifacts/thc-finder/src/App.tsx`.

**Rule:** Do NOT mutate the URL with raw `window.history.pushState/replaceState` in components when the router has a `base`. Use wouter's own navigation (`const [, navigate] = useLocation(); navigate(path, { replace: true })`) instead.

**Why:** Raw `window.history.replaceState({}, "", window.location.pathname)` desyncs from wouter's internal location/search state under a base path. Symptom we hit: the home page synced a `?brand=` query param into React state then stripped it with raw replaceState; the brand kept getting re-applied on re-render, so clicking the filter chip's X (which just calls `setSelectedBrand("")`) appeared to do nothing — but ONLY when the brand arrived via URL navigation (header banner ad → `setLocation('/?brand=X')`). Selecting from the dropdown never touched the URL, so it always worked.

**How to apply:** When copying a URL query param into state once on navigation:
- apply the value, then clear the param via `navigate("/", { replace: true })` (base-aware), and
- guard with a `useRef` so the param is consumed at most once per presence (reset the ref to false when the param is absent), so a user clearing the derived state can't be overridden by a re-applied effect.
