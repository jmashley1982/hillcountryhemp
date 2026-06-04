import { useGetBusiness, useClaimBusiness } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Globe, Clock, Star, ArrowLeft, RefreshCw, Wind, ExternalLink, Ticket, Flag, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BANNED_TAGS } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export default function BusinessDetail() {
  const params = useParams<{ id: string }>();
  const { data: biz, isLoading, error } = useGetBusiness(Number(params.id));
  const { toast } = useToast();
  const claimBusiness = useClaimBusiness();
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null));
  }, []);

  if (isLoading) {
    return <div className="p-12 text-center font-bold text-xl animate-pulse">Loading store details...</div>;
  }

  if (error || !biz) {
    return <div className="p-12 text-center font-bold text-xl text-destructive">Store not found.</div>;
  }

  const lastUpdated = (biz as { last_updated?: string }).last_updated;
  const onSiteSmokingArea = (biz as { on_site_smoking_area?: number }).on_site_smoking_area;
  const ownerId = (biz as { owner_id?: number | null }).owner_id;
  const isUnclaimed = ownerId == null;
  const canClaim = isUnclaimed && currentUser?.role === "business" && !claimSubmitted;

  const socialUrl = (handle: string | null | undefined, host: string) => {
    if (!handle) return null;
    if (/^https?:\/\//i.test(handle)) return handle;
    return `https://${host}/${handle.replace(/^@/, "")}`;
  };
  const instagram = socialUrl(
    (biz as { instagram?: string | null }).instagram,
    "instagram.com",
  );
  const facebook = socialUrl(
    (biz as { facebook?: string | null }).facebook,
    "facebook.com",
  );
  const googleReviewsUrl = (biz as { google_reviews_url?: string | null }).google_reviews_url;

  const handleClaim = () => {
    claimBusiness.mutate(
      { id: Number(params.id) },
      {
        onSuccess: () => {
          toast({ title: "Claim submitted! The admin will review your request." });
          setClaimSubmitted(true);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            ?? "Failed to submit claim";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-[#99CC66] mb-6 transition-colors text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Map
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl text-[#99CC66] mb-2 flex items-center gap-3">
                {biz.name}
                {biz.is_featured === 1 && <Star className="h-8 w-8 fill-[#99CC66] text-[#99CC66]" />}
              </h1>
              {isUnclaimed && (
                <div className="inline-flex items-center gap-1.5 bg-orange-900/30 border border-orange-700/50 text-orange-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3">
                  <Flag className="h-3.5 w-3.5" />
                  Claim This Business
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {biz.categories?.filter(cat => !BANNED_TAGS.has(cat.toLowerCase())).map(cat => (
                  <Badge key={cat} className="bg-primary/20 text-[#99CC66] hover:bg-primary/30 font-bold border border-primary/40 rounded-full">{cat}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-lg">
            <p className="font-medium leading-relaxed text-foreground">{biz.description}</p>
          </div>

          {biz.photos && biz.photos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#99CC66]">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {biz.photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden border-2 border-border shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <img src={`/api/uploads/${photo.photo_path}`} alt="Store photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {biz.brands && biz.brands.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#99CC66]">Featured Brands</h3>
              <div className="flex flex-wrap gap-3">
                {[...(biz.brands as BrandWithLogo[])].sort((a, b) => a.name.localeCompare(b.name)).map(brand => (
                  <div
                    key={brand.id}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold border-2 shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all hover:border-[#99CC66]/50 ${
                      brand.logo_path ? "bg-card border-[#99CC66]/30" : "bg-card border-border"
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
        </div>

        <div className="space-y-6">
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <h3 className="text-xl text-[#99CC66] mb-6 pb-4 border-b-2 border-border font-heading">Store Info</h3>

            <div className="space-y-4 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{biz.address}</span>
              </div>

              {biz.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${biz.phone}`} className="hover:text-[#99CC66] transition-colors text-sm">{formatPhone(biz.phone)}</a>
                </div>
              )}

              {biz.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <a href={biz.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#99CC66] transition-colors line-clamp-1 text-sm">{biz.website.replace(/^https?:\/\//, "")}</a>
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
                  <span className="text-xs font-bold text-[#84C7D0] uppercase tracking-wider">On-site smoking area</span>
                </div>
              )}

              {(instagram || facebook || googleReviewsUrl) && (
                <div className="pt-2 border-t border-border space-y-2">
                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-pink-500 hover:text-pink-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Instagram
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Facebook
                    </a>
                  )}
                  {googleReviewsUrl && (
                    <a
                      href={googleReviewsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#99CC66]/15 border border-[#99CC66]/40 text-sm font-bold text-[#99CC66] hover:bg-[#99CC66]/25 transition-colors"
                    >
                      <Star className="h-4 w-4 shrink-0 fill-[#99CC66]" />
                      Google Reviews
                    </a>
                  )}
                </div>
              )}

              {lastUpdated && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Updated {formatDate(lastUpdated)}</span>
                </div>
              )}
            </div>
          </div>

          {isUnclaimed && (
            <div className="bg-orange-950/30 border-2 border-orange-700/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-orange-400 shrink-0" />
                <h3 className="font-heading text-lg text-orange-300">Is this your business?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This listing hasn't been claimed yet. If you own this business, submit a claim and an admin will verify and link it to your account.
              </p>
              {currentUser?.role === "business" ? (
                claimSubmitted ? (
                  <div className="text-sm font-bold text-orange-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Claim submitted — pending admin review
                  </div>
                ) : (
                  <Button
                    className="w-full font-bold bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleClaim}
                    disabled={claimBusiness.isPending}
                    data-testid="button-claim-business"
                  >
                    {claimBusiness.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                      : <><Flag className="h-4 w-4 mr-2" /> Claim This Business</>
                    }
                  </Button>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  <Link href="/login" className="text-[#99CC66] hover:underline font-bold">Log in</Link> with a business account to claim this listing.
                </p>
              )}
            </div>
          )}

          {biz.coupons && biz.coupons.length > 0 && (
            <div className="bg-[#99CC66]/10 border-2 border-[#99CC66]/40 rounded-2xl p-6">
              <h3 className="text-xl mb-4 text-[#99CC66] font-heading">Exclusive Deals</h3>
              <div className="space-y-4">
                {biz.coupons.map(coupon => (
                  coupon.image_path.toLowerCase().endsWith('.pdf') ? (
                    <a
                      key={coupon.id}
                      href={`/api/uploads/${coupon.image_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-card rounded-xl border-2 border-dashed border-[#99CC66]/40 p-4 hover:border-[#99CC66] transition-colors"
                    >
                      <Ticket className="h-7 w-7 text-[#FE4A49] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{coupon.title || 'PDF Coupon'}</p>
                        <p className="text-xs text-muted-foreground">Tap to view PDF</p>
                      </div>
                    </a>
                  ) : (
                  <div key={coupon.id} className="bg-card rounded-xl overflow-hidden border-2 border-dashed border-[#99CC66]/40 relative group cursor-pointer hover:border-[#99CC66] transition-colors">
                    <img src={`/api/uploads/${coupon.image_path}`} alt={coupon.title || 'Coupon'} className="w-full h-auto" />
                    {coupon.title && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white p-2 text-center font-bold text-sm">
                        {coupon.title}
                      </div>
                    )}
                  </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
