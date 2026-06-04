import { useGetBusinesses, useGetBrands } from "@workspace/api-client-react";
import { ALL_CATEGORIES } from "@/lib/categories";
import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  Map as MapIcon,
  List,
  Star,
  MapPin,
  ChevronDown,
  X,
  Wind,
  ShieldCheck,
  ShieldAlert,
  Tag,
} from "lucide-react";
import { Link } from "wouter";
import { BusinessMap } from "@/components/map";
import { ShopOverlay } from "@/components/shop-overlay";
import { SuggestBrandModal } from "@/components/suggest-brand-modal";

const ALL_CITIES = [
  "Austin",
  "Boerne",
  "Buda",
  "Bulverde",
  "Canyon Lake",
  "Cedar Park",
  "Cibolo",
  "Converse",
  "Dripping Springs",
  "Fredericksburg",
  "Garden Ridge",
  "Georgetown",
  "Kerrville",
  "Kyle",
  "Live Oak",
  "Marble Falls",
  "New Braunfels",
  "Pflugerville",
  "Round Rock",
  "San Antonio",
  "San Marcos",
  "Schertz",
  "Seguin",
  "Universal City",
  "Wimberley",
];

// ── Synonym map: word → category name ─────────────────────────────
const SYNONYMS: Record<string, string> = {
  weed: "Flower", bud: "Flower", grass: "Flower", hemp: "Flower",
  cannabis: "Flower", herb: "Flower", nug: "Flower", nugs: "Flower",
  joint: "Pre-Rolls", blunt: "Pre-Rolls", joints: "Pre-Rolls",
  blunts: "Pre-Rolls", preroll: "Pre-Rolls", prerolls: "Pre-Rolls",
  dab: "Concentrates", dabs: "Concentrates", wax: "Concentrates",
  shatter: "Concentrates", rosin: "Concentrates", resin: "Concentrates",
  concentrate: "Concentrates", concentrates: "Concentrates", pen: "Concentrates",
  gummies: "Edibles", gummy: "Edibles", edible: "Edibles", edibles: "Edibles",
  cookie: "Edibles", brownie: "Edibles", candy: "Edibles", chocolate: "Edibles",
  drink: "Drinks", drinks: "Drinks", beverage: "Drinks", soda: "Drinks", tea: "Drinks",
  cbd: "CBD Products", cbg: "CBD Products", cbn: "CBD Products",
  cream: "Topicals", lotion: "Topicals", balm: "Topicals", topical: "Topicals", salve: "Topicals",
  glass: "Bongs/Pipes", pipe: "Bongs/Pipes", bong: "Bongs/Pipes", bowl: "Bongs/Pipes",
  vape: "Batteries/E-Devices", battery: "Batteries/E-Devices",
  cart: "Batteries/E-Devices", cartridge: "Batteries/E-Devices",
  cone: "Cones/Papers", cones: "Cones/Papers", paper: "Cones/Papers", papers: "Cones/Papers",
  lighter: "Lighters/Torches", lighters: "Lighters/Torches", torch: "Lighters/Torches",
  mushroom: "Mushrooms", shroom: "Mushrooms", shrooms: "Mushrooms",
  pet: "Pet", pets: "Pet",
};

type SuggestionItem =
  | { kind: "category"; value: string }
  | { kind: "brand"; value: string }
  | { kind: "city"; value: string };

function getSuggestions(
  query: string,
  brands: { name: string }[],
  selBrands: string[],
  selCats: string[],
  selCities: string[],
): SuggestionItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SuggestionItem[] = [];
  const addedCats = new Set<string>();

  for (const word of q.split(/[\s\-_/]+/)) {
    const cat = SYNONYMS[word];
    if (cat && !selCats.includes(cat) && !addedCats.has(cat)) {
      addedCats.add(cat);
      results.push({ kind: "category", value: cat });
    }
  }
  for (const cat of ALL_CATEGORIES) {
    if (!addedCats.has(cat) && !selCats.includes(cat) && cat.toLowerCase().includes(q)) {
      addedCats.add(cat);
      results.push({ kind: "category", value: cat });
    }
  }
  for (const brand of brands) {
    if (!selBrands.includes(brand.name) && brand.name.toLowerCase().includes(q)) {
      results.push({ kind: "brand", value: brand.name });
    }
  }
  for (const city of ALL_CITIES) {
    if (!selCities.includes(city) && city.toLowerCase().includes(q)) {
      results.push({ kind: "city", value: city });
    }
  }
  return results.slice(0, 8);
}

// ── Product display tags ──────────────────────────────────────────
function getProductTags(categories: string[]): string[] {
  const cats = new Set(categories);
  const tags: string[] = [];
  const hasFlower = cats.has("Flower");
  const hasPR = cats.has("Pre-Rolls");
  if (hasFlower && hasPR) tags.push("Flower & Pre-Rolls");
  else if (hasFlower) tags.push("Flower");
  else if (hasPR) tags.push("Pre-Rolls");
  if (cats.has("Concentrates")) tags.push("Dabs & Concentrates");
  const hasEd = cats.has("Edibles");
  const hasDr = cats.has("Drinks");
  if (hasEd && hasDr) tags.push("Edibles & Drinks");
  else if (hasEd) tags.push("Edibles");
  else if (hasDr) tags.push("Drinks");
  if (cats.has("Topicals")) tags.push("Topicals");
  if (cats.has("CBD Products")) tags.push("CBD");
  if (cats.has("Bongs/Pipes")) tags.push("Glass & Pipes");
  if (cats.has("Cones/Papers")) tags.push("Cones & Papers");
  if (cats.has("Lighters/Torches")) tags.push("Lighters");
  if (cats.has("Batteries/E-Devices")) tags.push("Battery Devices");
  if (cats.has("Mushrooms")) tags.push("Mushrooms");
  if (cats.has("Pet")) tags.push("Pet");
  if (cats.has("Novelty")) tags.push("Novelty");
  return tags;
}

// ── isOpenNow ─────────────────────────────────────────────────────
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function parseTimeMins(t: string): number {
  const m = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const mins = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return h * 60 + mins;
}
function isOpenNow(hoursJson: unknown): "open" | "closed" | "unknown" {
  if (!hoursJson) return "unknown";
  try {
    const parsed = JSON.parse(String(hoursJson)) as Array<{
      day: string; open?: string; close?: string; closed?: boolean;
    }>;
    const now = new Date();
    const entry = parsed.find((e) => e.day === DAYS[now.getDay()]);
    if (!entry) return "unknown";
    if (entry.closed) return "closed";
    if (!entry.open || !entry.close) return "unknown";
    const cur = now.getHours() * 60 + now.getMinutes();
    const o = parseTimeMins(entry.open);
    const c = parseTimeMins(entry.close);
    if (o < 0 || c < 0) return "unknown";
    if (c < o) return cur >= o || cur < c ? "open" : "closed";
    return cur >= o && cur < c ? "open" : "closed";
  } catch { return "unknown"; }
}

// ── MultiFilterSelect ─────────────────────────────────────────────
function MultiFilterSelect({
  values, onChange, placeholder, options, testId,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  options: string[];
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  const label =
    values.length === 0 ? placeholder
    : values.length === 1 ? values[0]
    : `${values.length} selected`;

  return (
    <div ref={ref} className="relative flex-1 min-w-0" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`h-8 rounded-lg border-2 w-full text-left pl-2.5 pr-7 text-xs font-bold cursor-pointer transition-colors truncate ${
          values.length > 0
            ? "border-[#84C7D0] bg-[#84C7D0]/10 text-foreground"
            : "border-border bg-background text-muted-foreground hover:border-[#84C7D0]/60"
        }`}
      >
        {label}
      </button>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] max-h-52 overflow-y-auto bg-card border-2 border-border rounded-xl shadow-2xl z-50 py-1">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/60 text-xs font-bold select-none">
              <input type="checkbox" checked={values.includes(opt)} onChange={() => toggle(opt)} className="accent-[#99CC66] h-3.5 w-3.5 cursor-pointer" />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────
export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserCoords(null),
      { timeout: 8000 },
    );
  }, []);

  // Close suggestion dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const { data: allBrands = [] } = useGetBrands();

  const { data: allBusinesses = [], isLoading } = useGetBusinesses({
    search: search || undefined,
    ...(userCoords
      ? { sort: "distance", lat: String(userCoords.lat), lng: String(userCoords.lng) }
      : {}),
  });

  const businesses = allBusinesses.filter((biz) => {
    if (selectedBrands.length > 0) {
      const bizBrands = (biz as { brands?: { name: string }[] }).brands ?? [];
      if (!selectedBrands.some((b) => bizBrands.some((br) => br.name === b))) return false;
    }
    if (selectedCats.length > 0) {
      const cats = biz.categories ?? [];
      if (!selectedCats.some((c) => cats.includes(c))) return false;
    }
    if (selectedCities.length > 0) {
      const city = (biz as { city?: string | null }).city ?? "";
      if (!selectedCities.some((c) => city.toLowerCase().includes(c.toLowerCase()))) return false;
    }
    return true;
  });

  const hasFilters = selectedBrands.length > 0 || selectedCats.length > 0 || selectedCities.length > 0;

  const suggestions = useMemo(
    () => getSuggestions(search, allBrands, selectedBrands, selectedCats, selectedCities),
    [search, allBrands, selectedBrands, selectedCats, selectedCities],
  );

  const showDropdown = searchFocused && search.trim().length > 0 && suggestions.length > 0;

  function applySuggestion(s: SuggestionItem) {
    if (s.kind === "category") setSelectedCats((p) => [...p, s.value]);
    else if (s.kind === "brand") setSelectedBrands((p) => [...p, s.value]);
    else setSelectedCities((p) => [...p, s.value]);
    setSearch("");
    setSearchFocused(false);
  }

  const suggestionLabel = (s: SuggestionItem) => {
    if (s.kind === "category") return "Product";
    if (s.kind === "brand") return "Brand";
    return "City";
  };
  const suggestionColor = (s: SuggestionItem) => {
    if (s.kind === "category") return "text-[#99CC66]";
    if (s.kind === "brand") return "text-[#84C7D0]";
    return "text-amber-400";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ── Filter bar ── */}
      <div className="bg-muted/30 border-b-2 border-border px-3 py-2 flex-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 pr-1">Filter</span>
          <MultiFilterSelect values={selectedBrands} onChange={setSelectedBrands} placeholder="All Brands" options={allBrands.map((b) => b.name)} testId="select-brand" />
          <MultiFilterSelect values={selectedCats} onChange={setSelectedCats} placeholder="All Products" options={ALL_CATEGORIES} testId="select-category" />
          <MultiFilterSelect values={selectedCities} onChange={setSelectedCities} placeholder="All Cities" options={ALL_CITIES} testId="select-city" />
          <button
            onClick={() => { setSelectedBrands([]); setSelectedCats([]); setSelectedCities([]); }}
            disabled={!hasFilters}
            className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-2 py-1 rounded-lg border ${
              hasFilters ? "border-[#84C7D0]/50 text-[#84C7D0] hover:bg-[#84C7D0]/10" : "border-transparent text-muted-foreground/30 cursor-default"
            }`}
            data-testid="button-clear-filters"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* List panel */}
        <div className={`w-full flex-1 md:flex-none md:w-[360px] min-h-0 bg-card border-r border-border flex flex-col z-10 ${viewMode === "map" ? "hidden md:flex" : "flex"}`}>

          {/* Search with suggestions */}
          <div className="px-3 pt-3 pb-2 flex-none" ref={searchContainerRef}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search stores, brands, products..."
                className="pl-8 h-8 text-xs bg-background border-2 font-bold w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchFocused(false); setSearch(""); } }}
                data-testid="input-search"
              />
              {search && (
                <button onClick={() => { setSearch(""); setSearchFocused(false); }} className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Suggestion dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Filter by
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/60 transition-colors text-left gap-2"
                    >
                      <span className="text-sm font-bold text-foreground truncate">{s.value}</span>
                      <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${suggestionColor(s)}`}>
                        {suggestionLabel(s)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedBrands.map((b) => (
                  <button key={b} onClick={() => setSelectedBrands((p) => p.filter((x) => x !== b))} className="flex items-center gap-1 text-[10px] font-bold bg-[#84C7D0]/15 border border-[#84C7D0]/40 text-[#84C7D0] px-1.5 py-0.5 rounded-full hover:bg-[#84C7D0]/25 transition-colors">
                    {b} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
                {selectedCats.map((c) => (
                  <button key={c} onClick={() => setSelectedCats((p) => p.filter((x) => x !== c))} className="flex items-center gap-1 text-[10px] font-bold bg-[#99CC66]/15 border border-[#99CC66]/40 text-[#99CC66] px-1.5 py-0.5 rounded-full hover:bg-[#99CC66]/25 transition-colors">
                    {c} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
                {selectedCities.map((c) => (
                  <button key={c} onClick={() => setSelectedCities((p) => p.filter((x) => x !== c))} className="flex items-center gap-1 text-[10px] font-bold bg-amber-900/20 border border-amber-700/40 text-amber-400 px-1.5 py-0.5 rounded-full hover:bg-amber-900/30 transition-colors">
                    {c} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Store list */}
          <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1.5 bg-muted/10">
            {isLoading ? (
              <div className="animate-pulse space-y-2 pt-1">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-border rounded-xl" />)}
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground font-bold">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No stores found.
              </div>
            ) : (
              businesses.map((biz) => {
                const openStatus = isOpenNow((biz as { hours_json?: unknown }).hours_json);
                const productTags = getProductTags(biz.categories ?? []);
                const hasSmoking = !!(biz as { on_site_smoking_area?: number }).on_site_smoking_area;
                const hasReviews = !!(biz as { google_reviews_url?: string | null }).google_reviews_url;
                const isVerified = (biz as { owner_id?: number | null }).owner_id != null;

                return (
                  <Link key={biz.id} href={`/business/${biz.id}`} data-testid={`card-business-${biz.id}`}>
                    <div
                      className={`bg-card rounded-xl border-2 px-3 py-2.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
                        biz.is_featured
                          ? "border-[#99CC66]/60 shadow-[0_4px_20px_rgba(153,204,102,0.15)]"
                          : highlightedId === biz.id
                            ? "border-[#84C7D0] shadow-[0_4px_20px_rgba(132,199,208,0.15)]"
                            : "border-border hover:border-[#84C7D0]/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                      }`}
                      onMouseEnter={() => setHighlightedId(biz.id)}
                      onMouseLeave={() => setHighlightedId(null)}
                    >
                      {/* Row 1: Name + badges */}
                      <div className="flex items-start justify-between gap-1.5 mb-0.5">
                        <h3 className="font-heading text-[17px] leading-tight text-foreground truncate">{biz.name}</h3>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {openStatus !== "unknown" && (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              openStatus === "open"
                                ? "bg-green-900/40 text-green-400 border border-green-700/50"
                                : "bg-red-900/40 text-red-400 border border-red-700/50"
                            }`}>
                              {openStatus === "open" ? "Open" : "Closed"}
                            </span>
                          )}
                          {biz.is_featured === 1 && <Star className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" />}
                        </div>
                      </div>

                      {/* Row 2: Address */}
                      <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{biz.address}</span>
                      </p>

                      {/* Row 3: Product tags */}
                      {productTags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-1">
                          {productTags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] font-bold uppercase tracking-wide bg-[#99CC66]/10 border border-[#99CC66]/30 text-[#99CC66] px-1.5 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                          {productTags.length > 3 && (
                            <span className="text-[9px] text-muted-foreground font-bold">+{productTags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Row 4: Amenities + Verified */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          {hasSmoking && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#84C7D0] uppercase tracking-wide">
                              <Wind className="h-2.5 w-2.5" /> Smoking
                            </span>
                          )}
                          {hasReviews && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wide">
                              <Star className="h-2.5 w-2.5 fill-amber-400" /> Reviews
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider ${
                          isVerified ? "text-green-400" : "text-orange-400"
                        }`}>
                          {isVerified
                            ? <><ShieldCheck className="h-3 w-3" /> Verified</>
                            : <><ShieldAlert className="h-3 w-3" /> Unverified</>
                          }
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-border bg-card flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold">
              {businesses.length} store{businesses.length !== 1 ? "s" : ""} found
            </p>
            <button className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-medium underline-offset-2 hover:underline" onClick={() => setSuggestOpen(true)} data-testid="button-suggest-brand-home">
              Suggest a brand
            </button>
          </div>
        </div>

        {/* Map area */}
        <div className={`flex-1 relative ${viewMode === "list" ? "hidden md:block" : "block"}`}>
          <BusinessMap businesses={businesses} onSelectBusiness={(id) => setSelectedBizId(id)} />
        </div>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-[1500] bg-primary text-primary-foreground p-4 rounded-full shadow-xl border-4 border-black/10 transition-transform hover:scale-105"
        onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
        data-testid="button-toggle-view"
      >
        {viewMode === "map" ? <List className="h-6 w-6" /> : <MapIcon className="h-6 w-6" />}
      </button>

      {selectedBizId != null && (
        <ShopOverlay businessId={selectedBizId} onClose={() => setSelectedBizId(null)} />
      )}
      <SuggestBrandModal open={suggestOpen} onClose={() => setSuggestOpen(false)} />
    </div>
  );
}
