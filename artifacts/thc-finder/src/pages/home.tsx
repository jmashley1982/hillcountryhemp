import { useGetBusinesses, useGetBrands } from "@workspace/api-client-react";
import { ALL_CATEGORIES } from "@/lib/categories";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Map as MapIcon, List, Star, MapPin, ChevronDown, X } from "lucide-react";
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
      day: string;
      open?: string;
      close?: string;
      closed?: boolean;
    }>;
    const now = new Date();
    const dayName = DAYS[now.getDay()];
    const entry = parsed.find((e) => e.day === dayName);
    if (!entry) return "unknown";
    if (entry.closed) return "closed";
    if (!entry.open || !entry.close) return "unknown";
    const cur = now.getHours() * 60 + now.getMinutes();
    const openMins = parseTimeMins(entry.open);
    const closeMins = parseTimeMins(entry.close);
    if (openMins < 0 || closeMins < 0) return "unknown";
    if (closeMins < openMins) return cur >= openMins || cur < closeMins ? "open" : "closed";
    return cur >= openMins && cur < closeMins ? "open" : "closed";
  } catch {
    return "unknown";
  }
}

const BANNED_TAGS = new Set(["smoke shop", "vape shop"]);

function MultiFilterSelect({
  values,
  onChange,
  placeholder,
  options,
  testId,
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  };

  const label =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
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
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/60 text-xs font-bold select-none"
            >
              <input
                type="checkbox"
                checked={values.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-[#99CC66] h-3.5 w-3.5 cursor-pointer"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserCoords(null),
      { timeout: 8000 },
    );
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

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedCats([]);
    setSelectedCities([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ── Filter bar ── */}
      <div className="bg-muted/30 border-b-2 border-border px-3 py-2 flex-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 pr-1">
            Filter
          </span>

          <MultiFilterSelect
            values={selectedBrands}
            onChange={setSelectedBrands}
            placeholder="All Brands"
            options={allBrands.map((b) => b.name)}
            testId="select-brand"
          />

          <MultiFilterSelect
            values={selectedCats}
            onChange={setSelectedCats}
            placeholder="All Products"
            options={ALL_CATEGORIES}
            testId="select-category"
          />

          <MultiFilterSelect
            values={selectedCities}
            onChange={setSelectedCities}
            placeholder="All Cities"
            options={ALL_CITIES}
            testId="select-city"
          />

          <button
            onClick={resetFilters}
            disabled={!hasFilters}
            className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap px-2 py-1 rounded-lg border ${
              hasFilters
                ? "border-[#84C7D0]/50 text-[#84C7D0] hover:bg-[#84C7D0]/10"
                : "border-transparent text-muted-foreground/30 cursor-default"
            }`}
            data-testid="button-clear-filters"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Main area: list panel + map ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Store list panel */}
        <div
          className={`w-full flex-1 md:flex-none md:w-[38%] min-h-0 bg-card border-r border-border flex flex-col z-10 ${viewMode === "map" ? "hidden md:flex" : "flex"}`}
        >
          {/* Search */}
          <div className="px-3 pt-3 pb-2 flex-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search stores or brands..."
                className="pl-8 h-8 text-xs bg-background border-2 font-bold w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 bg-muted/10">
            {isLoading ? (
              <div className="animate-pulse space-y-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-border rounded-xl" />
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground font-bold">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No stores found.
              </div>
            ) : (
              businesses.map((biz) => {
                const openStatus = isOpenNow((biz as { hours_json?: unknown }).hours_json);
                return (
                  <Link
                    key={biz.id}
                    href={`/business/${biz.id}`}
                    data-testid={`card-business-${biz.id}`}
                  >
                    <div
                      className={`bg-card rounded-xl border-2 px-3.5 py-2.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
                        biz.is_featured
                          ? "border-[#99CC66]/60 shadow-[0_4px_20px_rgba(153,204,102,0.15)]"
                          : highlightedId === biz.id
                            ? "border-[#84C7D0] shadow-[0_4px_20px_rgba(132,199,208,0.15)]"
                            : "border-border hover:border-[#84C7D0]/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                      }`}
                      onMouseEnter={() => setHighlightedId(biz.id)}
                      onMouseLeave={() => setHighlightedId(null)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-base text-foreground leading-tight truncate">
                          {biz.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {openStatus !== "unknown" && (
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                openStatus === "open"
                                  ? "bg-green-900/40 text-green-400 border border-green-700/50"
                                  : "bg-red-900/40 text-red-400 border border-red-700/50"
                              }`}
                            >
                              {openStatus === "open" ? "Open" : "Closed"}
                            </span>
                          )}
                          {biz.is_featured === 1 && (
                            <Star className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{biz.address}</span>
                      </p>
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
            <button
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-medium underline-offset-2 hover:underline"
              onClick={() => setSuggestOpen(true)}
              data-testid="button-suggest-brand-home"
            >
              Suggest a brand
            </button>
          </div>
        </div>

        {/* Map area */}
        <div className={`flex-1 relative ${viewMode === "list" ? "hidden md:block" : "block"}`}>
          <BusinessMap
            businesses={businesses}
            onSelectBusiness={(id) => setSelectedBizId(id)}
          />
        </div>
      </div>

      {/* Mobile view toggle */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-[1500] bg-primary text-primary-foreground p-4 rounded-full shadow-xl border-4 border-black/10 transition-transform hover:scale-105"
        onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
        data-testid="button-toggle-view"
      >
        {viewMode === "map" ? (
          <List className="h-6 w-6" />
        ) : (
          <MapIcon className="h-6 w-6" />
        )}
      </button>

      {selectedBizId != null && (
        <ShopOverlay
          businessId={selectedBizId}
          onClose={() => setSelectedBizId(null)}
        />
      )}

      <SuggestBrandModal open={suggestOpen} onClose={() => setSuggestOpen(false)} />
    </div>
  );
}

