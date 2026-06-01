import { useGetBusinesses, useGetBanner } from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Map as MapIcon, List, Star, MapPin } from "lucide-react";
import { Link } from "wouter";
import { BusinessMap } from "@/components/map";

const ALL_CATEGORIES = [
  "Hemp Flower",
  "Edibles",
  "Topicals",
  "CBD Products",
  "Smoke Shop",
  "Vape Shop",
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const { data: businesses = [], isLoading } = useGetBusinesses({
    search: search || undefined,
    category: selectedCat || undefined,
  });

  const { data: banner } = useGetBanner();

  return (
    <div className="flex flex-col h-full flex-1">
      {banner?.image_path && (
        <a
          href={banner.link_url || "#"}
          className="block w-full bg-black"
          target={banner.link_url ? "_blank" : undefined}
          rel="noopener noreferrer"
          data-testid="banner-ad"
        >
          <img
            src={`/api/uploads/${banner.image_path}`}
            alt="Advertisement"
            className="w-full h-12 object-cover opacity-90 hover:opacity-100 transition-opacity"
          />
        </a>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100dvh-64px)]">
        {/* Sidebar */}
        <div
          className={`w-full md:w-96 bg-card border-r border-border flex flex-col z-10 ${viewMode === "map" ? "hidden md:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-border bg-card shadow-sm">
            <h1 className="font-display text-xl text-primary mb-4">
              Find Hill Country Hemp
            </h1>

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

            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCat === cat ? "default" : "outline"}
                  className={`cursor-pointer font-bold border-2 transition-colors ${
                    selectedCat === cat
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    setSelectedCat(selectedCat === cat ? null : cat)
                  }
                  data-testid={`filter-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-border rounded-lg" />
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
                    className={`bg-card rounded-xl border-2 p-4 cursor-pointer hover:border-primary transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      biz.is_featured
                        ? "border-secondary shadow-sm"
                        : highlightedId === biz.id
                          ? "border-primary shadow-md"
                          : "border-border"
                    }`}
                    onMouseEnter={() => setHighlightedId(biz.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-lg text-foreground leading-tight">
                        {biz.name}
                      </h3>
                      {biz.is_featured === 1 && (
                        <Star className="h-5 w-5 fill-secondary text-secondary shrink-0 ml-2" />
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
                          className="text-[10px] uppercase font-bold bg-muted px-1.5 py-0.5 rounded border"
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

          <div className="p-3 border-t border-border bg-card text-center">
            <p className="text-xs text-muted-foreground font-bold">
              {businesses.length} shop{businesses.length !== 1 ? "s" : ""}{" "}
              found
            </p>
          </div>
        </div>

        {/* Map Area */}
        <div
          className={`flex-1 relative ${viewMode === "list" ? "hidden md:block" : "block"}`}
        >
          {/* Mobile view toggle */}
          <button
            className="md:hidden absolute bottom-6 right-6 z-[1000] bg-primary text-primary-foreground p-4 rounded-full shadow-xl border-4 border-black/10 transition-transform hover:scale-105"
            onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            data-testid="button-toggle-view"
          >
            {viewMode === "map" ? (
              <List className="h-6 w-6" />
            ) : (
              <MapIcon className="h-6 w-6" />
            )}
          </button>

          <BusinessMap
            businesses={businesses}
            onSelectBusiness={(id) => {
              setHighlightedId(id);
              setViewMode("list");
            }}
          />
        </div>
      </div>
    </div>
  );
}
