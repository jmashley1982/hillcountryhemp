import { useGetBusinesses, useGetBrands } from "@workspace/api-client-react";
import { ALL_CATEGORIES } from "@/lib/categories";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Map as MapIcon, List, Star, MapPin, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { BusinessMap } from "@/components/map";
import { ShopOverlay } from "@/components/shop-overlay";
import { SuggestBrandModal } from "@/components/suggest-brand-modal";

const ALL_CITIES = [
  "New Braunfels",
  "Seguin",
  "San Marcos",
  "Kyle",
  "Buda",
  "Schertz",
  "Cibolo",
  "Canyon Lake",
  "Dripping Springs",
  "Wimberley",
  "Bulverde",
  "Garden Ridge",
];


const selectClass =
  "h-8 rounded-lg border-2 border-border bg-background text-xs font-bold text-foreground pl-2.5 pr-7 appearance-none cursor-pointer hover:border-[#84C7D0]/60 focus:outline-none focus:border-[#84C7D0] transition-colors";

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  testId?: string;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectClass} w-full`}
        data-testid={testId}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
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

  const { data: businesses = [], isLoading } = useGetBusinesses({
    search: search || undefined,
    category: selectedCat || undefined,
    city: selectedCity || undefined,
    brand: selectedBrand || undefined,
    ...(userCoords
      ? { sort: "distance", lat: String(userCoords.lat), lng: String(userCoords.lng) }
      : {}),
  });

  const hasFilters = selectedBrand || selectedCat || selectedCity;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ── Filter bar ── */}
      <div className="bg-muted/30 border-b-2 border-border px-3 py-2 flex-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 shrink-0 pr-1">
            Filter
          </span>

          <FilterSelect
            value={selectedBrand}
            onChange={setSelectedBrand}
            placeholder="All Brands"
            options={allBrands.map((b) => b.name)}
            testId="select-brand"
          />

          <FilterSelect
            value={selectedCat}
            onChange={setSelectedCat}
            placeholder="All Products"
            options={ALL_CATEGORIES}
            testId="select-category"
          />

          <FilterSelect
            value={selectedCity}
            onChange={setSelectedCity}
            placeholder="All Cities"
            options={ALL_CITIES}
            testId="select-city"
          />

          {hasFilters && (
            <button
              onClick={() => {
                setSelectedBrand("");
                setSelectedCat("");
                setSelectedCity("");
              }}
              className="shrink-0 text-[10px] font-bold text-muted-foreground/60 hover:text-destructive transition-colors whitespace-nowrap"
              data-testid="button-clear-filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Main area: list panel + map ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Store list panel */}
        <div
          className={`w-full flex-1 md:flex-none md:w-[38%] min-h-0 bg-card border-r border-border flex flex-col z-10 ${viewMode === "map" ? "hidden md:flex" : "flex"}`}
        >
          {/* Search — top of list panel */}
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

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 bg-muted/10">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-border rounded-xl" />
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground font-bold">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No stores found.
              </div>
            ) : (
              businesses.map((biz) => (
                <Link
                  key={biz.id}
                  href={`/business/${biz.id}`}
                  data-testid={`card-business-${biz.id}`}
                >
                  <div
                    className={`bg-card rounded-2xl border-2 p-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
                      biz.is_featured
                        ? "border-[#99CC66]/60 shadow-[0_4px_20px_rgba(153,204,102,0.15)]"
                        : highlightedId === biz.id
                          ? "border-[#84C7D0] shadow-[0_4px_20px_rgba(132,199,208,0.15)]"
                          : "border-border hover:border-[#84C7D0]/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                    }`}
                    onMouseEnter={() => setHighlightedId(biz.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-heading text-lg text-foreground leading-tight">
                        {biz.name}
                      </h3>
                      {biz.is_featured === 1 && (
                        <Star className="h-5 w-5 fill-[#D4AF37] text-[#D4AF37] shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {biz.address}
                    </p>
                    {biz.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {biz.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {biz.categories?.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="text-[10px] uppercase font-bold bg-muted/60 px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
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
        <div
          className={`flex-1 relative ${viewMode === "list" ? "hidden md:block" : "block"}`}
        >
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

      {/* Store detail overlay */}
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
