import { useGetBusiness } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Globe, Clock, Star, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BusinessDetail() {
  const params = useParams<{ id: string }>();
  const { data: biz, isLoading, error } = useGetBusiness(Number(params.id));

  if (isLoading) {
    return <div className="p-12 text-center font-bold text-xl animate-pulse">Loading shop details...</div>;
  }

  if (error || !biz) {
    return <div className="p-12 text-center font-bold text-xl text-destructive">Shop not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Map
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl text-primary mb-2 flex items-center gap-3">
                {biz.name}
                {biz.is_featured === 1 && <Star className="h-8 w-8 fill-secondary text-secondary" />}
              </h1>
              <div className="flex flex-wrap gap-2 mt-4">
                {biz.categories?.map(cat => (
                  <Badge key={cat} className="bg-primary/10 text-primary hover:bg-primary/20 font-bold border-none">{cat}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="prose prose-lg dark:prose-invert">
            <p className="font-medium leading-relaxed">{biz.description}</p>
          </div>

          {biz.photos && biz.photos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-primary">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {biz.photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border-4 border-border">
                    <img src={`/api/uploads/${photo.photo_path}`} alt="Shop photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {biz.brands && biz.brands.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-primary">Featured Brands</h3>
              <div className="flex flex-wrap gap-2">
                {biz.brands.map(brand => (
                  <div key={brand.id} className="px-4 py-2 bg-card border-2 border-border rounded-lg font-bold">
                    {brand.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border-2 border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-display text-xl mb-6 pb-4 border-b-2 border-border">Shop Info</h3>
            
            <div className="space-y-4 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{biz.address}</span>
              </div>
              
              {biz.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${biz.phone}`} className="hover:text-primary transition-colors">{biz.phone}</a>
                </div>
              )}
              
              {biz.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <a href={biz.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors line-clamp-1">{biz.website}</a>
                </div>
              )}
              
              {biz.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{biz.hours}</span>
                </div>
              )}
            </div>
          </div>

          {biz.coupons && biz.coupons.length > 0 && (
            <div className="bg-secondary/10 border-2 border-secondary rounded-xl p-6">
              <h3 className="font-display text-xl mb-4 text-secondary-foreground">Exclusive Deals</h3>
              <div className="space-y-4">
                {biz.coupons.map(coupon => (
                  <div key={coupon.id} className="bg-card rounded-lg overflow-hidden border-2 border-dashed border-secondary/50 relative group cursor-pointer hover:border-secondary transition-colors">
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
