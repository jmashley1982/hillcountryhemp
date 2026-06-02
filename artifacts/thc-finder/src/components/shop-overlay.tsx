import { useEffect, useRef } from "react";
import { useGetBusiness } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  X,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  Wind,
  RefreshCw,
  ExternalLink,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

type BrandWithLogo = { id: number; name: string; logo_path?: string | null };

interface ShopOverlayProps {
  businessId: number;
  onClose: () => void;
}

export function ShopOverlay({ businessId, onClose }: ShopOverlayProps) {
  const { data: biz, isLoading, error } = useGetBusiness(businessId);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Lock background scroll while the overlay is open, restore the trigger's focus on close
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const lastUpdated = (biz as { last_updated?: string } | undefined)?.last_updated;
  const onSiteSmokingArea = (biz as { on_site_smoking_area?: number } | undefined)?.on_site_smoking_area;
  const socialUrl = (handle: string | null | undefined, host: string) => {
    if (!handle) return null;
    if (/^https?:\/\//i.test(handle)) return handle;
    return `https://${host}/${handle.replace(/^@/, "")}`;
  };
  const instagram = socialUrl(
    (biz as { instagram?: string | null } | undefined)?.instagram,
    "instagram.com",
  );
  const facebook = socialUrl(
    (biz as { facebook?: string | null } | undefined)?.facebook,
    "facebook.com",
  );
  const googleReviewsUrl = (biz as { google_reviews_url?: string | null } | undefined)?.google_reviews_url;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-stretch md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      data-testid="shop-overlay"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full md:max-w-2xl md:max-h-[88vh] bg-card md:rounded-3xl border-2 border-border shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          aria-label="Close"
          data-testid="button-close-overlay"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="p-12 text-center font-bold text-lg animate-pulse text-muted-foreground">
            Loading shop details...
          </div>
        ) : error || !biz ? (
          <div className="p-12 text-center font-bold text-lg text-destructive">
            Shop not found.
          </div>
        ) : (
          <div className="overflow-y-auto">
            {/* Header */}
            <div className="p-6 pb-4 border-b-2 border-border bg-gradient-to-b from-muted/30 to-transparent">
              <div className="flex items-start gap-4 pr-10">
                {biz.logo_path && (
                  <img
                    src={`/api/uploads/${biz.logo_path}`}
                    alt={biz.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#99CC66]/40 shrink-0 shadow-md"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-2xl md:text-3xl text-[#99CC66] leading-tight flex items-center gap-2">
                    <span className="break-words">{biz.name}</span>
                    {biz.is_featured === 1 && (
                      <Star className="h-6 w-6 fill-[#99CC66] text-[#99CC66] shrink-0" />
                    )}
                  </h2>
                  {biz.categories && biz.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {biz.categories.map((cat) => (
                        <Badge
                          key={cat}
                          className="bg-primary/20 text-[#99CC66] hover:bg-primary/30 font-bold border border-primary/40 rounded-full text-[11px]"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {biz.description && (
                <p className="font-medium leading-relaxed text-foreground text-sm">
                  {biz.description}
                </p>
              )}

              {/* Info */}
              <div className="bg-background/40 border-2 border-border rounded-2xl p-5 space-y-3 font-medium">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{biz.address}</span>
                </div>
                {biz.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary shrink-0" />
                    <a
                      href={`tel:${biz.phone}`}
                      className="hover:text-[#99CC66] transition-colors text-sm"
                    >
                      {formatPhone(biz.phone)}
                    </a>
                  </div>
                )}
                {biz.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary shrink-0" />
                    <a
                      href={biz.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#99CC66] transition-colors line-clamp-1 text-sm"
                    >
                      {biz.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {biz.hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line text-sm">{biz.hours}</span>
                  </div>
                )}
                {!!onSiteSmokingArea && (
                  <div className="flex items-center gap-3 bg-[#84C7D0]/10 border border-[#84C7D0]/30 rounded-xl px-3 py-2">
                    <Wind className="h-4 w-4 text-[#84C7D0] shrink-0" />
                    <span className="text-xs font-bold text-[#84C7D0] uppercase tracking-wider">
                      On-site smoking area
                    </span>
                  </div>
                )}
                {(instagram || facebook || googleReviewsUrl) && (
                  <div className="pt-2 border-t border-border space-y-2">
                    {instagram && (
                      <a href={instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-bold text-pink-500 hover:text-pink-400 transition-colors">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Instagram
                      </a>
                    )}
                    {facebook && (
                      <a href={facebook} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        Facebook
                      </a>
                    )}
                    {googleReviewsUrl && (
                      <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#99CC66]/15 border border-[#99CC66]/40 text-sm font-bold text-[#99CC66] hover:bg-[#99CC66]/25 transition-colors">
                        <Star className="h-4 w-4 shrink-0 fill-[#99CC66]" />
                        Google Reviews
                      </a>
                    )}
                  </div>
                )}
                {lastUpdated && (
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(lastUpdated)}
                    </span>
                  </div>
                )}
              </div>

              {/* Photos */}
              {biz.photos && biz.photos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg text-[#99CC66] font-heading">Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {biz.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-2xl overflow-hidden border-2 border-border shadow-md"
                      >
                        <img
                          src={`/api/uploads/${photo.photo_path}`}
                          alt="Shop photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands */}
              {biz.brands && biz.brands.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg text-[#99CC66] font-heading">
                    Featured Brands
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {(biz.brands as BrandWithLogo[]).map((brand) => (
                      <div
                        key={brand.id}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold border-2 shadow-md transition-all ${
                          brand.logo_path
                            ? "bg-card border-[#99CC66]/30"
                            : "bg-card border-border"
                        }`}
                      >
                        {brand.logo_path && (
                          <img
                            src={`/api/uploads/${brand.logo_path}`}
                            alt={brand.name}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#99CC66]/40"
                          />
                        )}
                        <span className="text-sm">{brand.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coupons */}
              {biz.coupons && biz.coupons.length > 0 && (
                <div className="bg-[#99CC66]/10 border-2 border-[#99CC66]/40 rounded-2xl p-5 space-y-4">
                  <h3 className="text-lg text-[#99CC66] font-heading">
                    Exclusive Deals
                  </h3>
                  {biz.coupons.map((coupon) =>
                    coupon.image_path.toLowerCase().endsWith(".pdf") ? (
                      <a
                        key={coupon.id}
                        href={`/api/uploads/${coupon.image_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-card rounded-xl border-2 border-dashed border-[#99CC66]/40 p-4 hover:border-[#99CC66] transition-colors"
                      >
                        <Ticket className="h-7 w-7 text-[#FE4A49] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">
                            {coupon.title || "PDF Coupon"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tap to view PDF
                          </p>
                        </div>
                      </a>
                    ) : (
                      <div
                        key={coupon.id}
                        className="bg-card rounded-xl overflow-hidden border-2 border-dashed border-[#99CC66]/40 relative"
                      >
                        <img
                          src={`/api/uploads/${coupon.image_path}`}
                          alt={coupon.title || "Coupon"}
                          className="w-full h-auto"
                        />
                        {coupon.title && (
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white p-2 text-center font-bold text-sm">
                            {coupon.title}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* Full page link */}
              <Link
                href={`/business/${biz.id}`}
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm py-3 rounded-2xl hover:opacity-90 transition-opacity"
                data-testid="link-full-page"
              >
                View Full Page <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
