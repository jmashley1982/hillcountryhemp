import { useGetBusinesses, useGetBrands } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Map as MapIcon, List, Star, MapPin, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { BusinessMap } from "@/components/map";
import { ShopOverlay } from "@/components/shop-overlay";
import { SuggestBrandModal } from "@/components/suggest-brand-modal";

const DEFAULT_CITIES = ["New Braunfels", "Seguin", "San Marcos"];
const MORE_CITIES = [
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

const DEFAULT_CATEGORIES = ["Flower", "Pre-Rolls", "Drinks", "Edibles"];
const MORE_CATEGORIES = [
  "Concentrates",
  "Topicals",
  "CBD Products",
  "Bongs/Pipes",
  "Cones/Papers",
  "Lighters/Torches",
  "Batteries/E-Devices",
];

const DEFAULT_BRANDS = ["Hometown Hero", "Jelly/NYB", "Sherpa"];

interface FilterSectionProps {
  label: string;
  defaultItems: string[];
  moreItems: string[];
  selected: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: (item: string) => void;
  testIdPrefix?: string;
}

function FilterSection({
  label,
  defaultItems,
  moreItems,
  selected,
  expanded,
  onToggleExpand,
  onSelect,
  testIdPrefix,
}: FilterSectionProps) {
  const activeClass =
    "bg-[#84C7D0] text-black border-[#84C7D0] shadow-[#84C7D0]/30";
  const inactiveClass =
    "hover:bg-muted border-border text-muted-foreground hover:text-foreground";

  const renderChip = (item: string) => (
    <button
      key={item}
      onClick={() => onSelect(item)}
      className={`cursor-pointer font-bold border-2 rounded-full px-3 py-1 text-[11px] shadow-sm transition-all ${
        selected === item ? activeClass : inactiveClass
      }`}
      data-testid={testIdPrefix ? `${testIdPrefix}-${item.replace(/\s+/g, "-").replace(/\//g, "-").toLowerCase()}` : undefined}
    >
      {item}
    </button>
  );

  return (
    <div className="border-b border-border pb-3 mb-3 last:border-b-0 last:mb-0 last:pb-0">
      <button
        className="flex w-full items-center justify-between py-1 mb-2 text-sm font-bold text-foreground/80 uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={onToggleExpand}
        data-testid={testIdPrefix ? `${testIdPrefix}-toggle` : undefined}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div className="flex flex-wrap gap-1.5">
        {defaultItems.map(renderChip)}
        {expanded && moreItems.map(renderChip)}
      </div>
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [cityExpanded, setCityExpanded] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [brandExpanded, setBrandExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const { data: allBrands = [] } = useGetBrands();

  const defaultBrandNames = DEFAULT_BRANDS;
  const moreBrandNames = allBrands
    .map((b) => b.name)
    .filter((name) => !defaultBrandNames.includes(name));

  const { data: businesses = [], isLoading } = useGetBusinesses({
    search: search || undefined,
    category: selectedCat || undefined,
    city: selectedCity || undefined,
    brand: selectedBrand || undefined,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Sidebar */}
        <div
          className={`w-full flex-1 md:flex-none md:w-96 min-h-0 bg-card border-r border-border flex flex-col z-10 ${viewMode === "map" ? "hidden md:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-border bg-card shadow-sm">
            <h1 className="text-xl text-[#99CC66] mb-1 tracking-wide">
              Find Hill Country Hemp
            </h1>
            <p className="text-xs text-muted-foreground font-medium mb-4 leading-relaxed">
              Your guide to hemp dispensaries &amp; smoking accessories in Comal County and beyond.
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops or brands..."
                className="pl-9 bg-background border-2 font-bold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>

            <FilterSection
              label="City"
              defaultItems={DEFAULT_CITIES}
              moreItems={MORE_CITIES}
              selected={selectedCity}
              expanded={cityExpanded}
              onToggleExpand={() => setCityExpanded((v) => !v)}
              onSelect={(city) =>
                setSelectedCity(selectedCity === city ? null : city)
              }
              testIdPrefix="filter-city"
            />

            <FilterSection
              label="Category"
              defaultItems={DEFAULT_CATEGORIES}
              moreItems={MORE_CATEGORIES}
              selected={selectedCat}
              expanded={catExpanded}
              onToggleExpand={() => setCatExpanded((v) => !v)}
              onSelect={(cat) =>
                setSelectedCat(selectedCat === cat ? null : cat)
              }
              testIdPrefix="filter-cat"
            />

            <FilterSection
              label="Brand"
              defaultItems={defaultBrandNames}
              moreItems={moreBrandNames}
              selected={selectedBrand}
              expanded={brandExpanded}
              onToggleExpand={() => setBrandExpanded((v) => !v)}
              onSelect={(brand) =>
                setSelectedBrand(selectedBrand === brand ? null : brand)
              }
              testIdPrefix="filter-brand"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-border rounded-xl" />
                ))}
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground font-bold">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No shops found.
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
                        <Star className="h-5 w-5 fill-[#99CC66] text-[#99CC66] shrink-0 ml-2" />
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
              {businesses.length} shop{businesses.length !== 1 ? "s" : ""}{" "}
              found
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

        {/* Map Area */}
        <div
          className={`flex-1 relative ${viewMode === "list" ? "hidden md:block" : "block"}`}
        >
          <BusinessMap
            businesses={businesses}
            onSelectBusiness={(id) => setSelectedBizId(id)}
          />
        </div>
      </div>

      {/* Mobile view toggle — always reachable, even from the list */}
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

      {/* Shop detail overlay */}
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
