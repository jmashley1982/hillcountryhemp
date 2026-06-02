import { useGetBusiness } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Globe, Clock, Star, ArrowLeft, RefreshCw, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

type BrandWithLogo = { id: number; name: string; logo_path?: string | null };

export default function BusinessDetail() {
  const params = useParams<{ id: string }>();
  const { data: biz, isLoading, error } = useGetBusiness(Number(params.id));

  if (isLoading) {
    return <div className="p-12 text-center font-bold text-xl animate-pulse">Loading shop details...</div>;
  }

  if (error || !biz) {
    return <div className="p-12 text-center font-bold text-xl text-destructive">Shop not found.</div>;
  }

  const lastUpdated = (biz as { last_updated?: string }).last_updated;
  const onSiteSmokingArea = (biz as { on_site_smoking_area?: number }).on_site_smoking_area;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-[#D4AF37] mb-6 transition-colors text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Map
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl text-[#D4AF37] mb-2 flex items-center gap-3">
                {biz.name}
                {biz.is_featured === 1 && <Star className="h-8 w-8 fill-[#D4AF37] text-[#D4AF37]" />}
              </h1>
              <div className="flex flex-wrap gap-2 mt-4">
                {biz.categories?.map(cat => (
                  <Badge key={cat} className="bg-primary/20 text-[#D4AF37] hover:bg-primary/30 font-bold border border-primary/40 rounded-full">{cat}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-lg">
            <p className="font-medium leading-relaxed text-foreground">{biz.description}</p>
          </div>

          {biz.photos && biz.photos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#D4AF37]">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {biz.photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden border-2 border-border shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <img src={`/api/uploads/${photo.photo_path}`} alt="Shop photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {biz.brands && biz.brands.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#D4AF37]">Featured Brands</h3>
              <div className="flex flex-wrap gap-3">
                {(biz.brands as BrandWithLogo[]).map(brand => (
                  <div
                    key={brand.id}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold border-2 shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all hover:border-[#D4AF37]/50 ${
                      brand.logo_path ? "bg-card border-[#D4AF37]/30" : "bg-card border-border"
                    }`}
                  >
                    {brand.logo_path && (
                      <img
                        src={`/api/uploads/${brand.logo_path}`}
                        alt={brand.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-[#D4AF37]/40"
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
            <h3 className="text-xl text-[#D4AF37] mb-6 pb-4 border-b-2 border-border font-heading">Shop Info</h3>

            <div className="space-y-4 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{biz.address}</span>
              </div>

              {biz.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${biz.phone}`} className="hover:text-[#D4AF37] transition-colors text-sm">{biz.phone}</a>
                </div>
              )}

              {biz.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <a href={biz.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors line-clamp-1 text-sm">{biz.website}</a>
                </div>
              )}

              {biz.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line text-sm">{biz.hours}</span>
                </div>
              )}

              {!!onSiteSmokingArea && (
                <div className="flex items-center gap-3 bg-[#00C853]/10 border border-[#00C853]/30 rounded-xl px-3 py-2">
                  <Wind className="h-4 w-4 text-[#00C853] shrink-0" />
                  <span className="text-xs font-bold text-[#00C853] uppercase tracking-wider">On-site smoking area</span>
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

          {biz.coupons && biz.coupons.length > 0 && (
            <div className="bg-[#D4AF37]/10 border-2 border-[#D4AF37]/40 rounded-2xl p-6">
              <h3 className="text-xl mb-4 text-[#D4AF37] font-heading">Exclusive Deals</h3>
              <div className="space-y-4">
                {biz.coupons.map(coupon => (
                  <div key={coupon.id} className="bg-card rounded-xl overflow-hidden border-2 border-dashed border-[#D4AF37]/40 relative group cursor-pointer hover:border-[#D4AF37] transition-colors">
                    <img src={`/api/uploads/${coupon.image_path}`} alt={coupon.title || 'Coupon'} className="w-full h-auto" />
                    {coupon.title && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white p-2 text-center font-bold text-sm">
                        {coupon.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
