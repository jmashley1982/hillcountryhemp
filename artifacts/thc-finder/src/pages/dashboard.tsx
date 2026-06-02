import { useGetMe, useGetOwnedBusinesses, getGetOwnedBusinessesQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Clock, CheckCircle, XCircle, Building2, Sparkles, ImagePlus, Lightbulb } from "lucide-react";
import { B2BBannerAd } from "@/components/b2b-banner-ad";
import { SuggestBrandModal } from "@/components/suggest-brand-modal";

const statusConfig = {
  pending: { label: "Pending Review", icon: Clock, color: "bg-yellow-900/40 text-yellow-300 border-yellow-700" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-900/40 text-green-300 border-green-700" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-900/40 text-red-300 border-red-700" },
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: businesses = [], isLoading } = useGetOwnedBusinesses({
    query: { queryKey: getGetOwnedBusinessesQueryKey() },
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/login");
    }
    if (user?.role === "admin") {
      setLocation("/admin");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading || isLoading) {
    return (
      <div className="p-12 text-center font-bold text-xl animate-pulse">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <B2BBannerAd />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* CTA card */}
        <div className="mb-6 bg-gradient-to-r from-primary/80 to-[#1a2226] border border-[#99CC66]/30 rounded-2xl p-5 flex items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <Sparkles className="h-6 w-6 text-[#99CC66] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white text-sm">Keep your page fresh!</p>
            <p className="text-white/70 text-sm mt-0.5">Add a new coupon or update your photos to attract more customers.</p>
          </div>
          {businesses.length > 0 && businesses[0].status === "approved" && (
            <Link href={`/dashboard/edit/${businesses[0].id}`} className="ml-auto shrink-0">
              <Button size="sm" className="bg-[#99CC66] hover:bg-[#82B54F] text-black font-bold">
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Update
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl text-[#99CC66]">My Listings</h1>
            <p className="text-muted-foreground font-bold mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-medium underline-offset-2 hover:underline"
              onClick={() => setSuggestOpen(true)}
              data-testid="button-suggest-brand-dashboard"
            >
              Suggest a brand
            </button>
            <Link href="/dashboard/add">
              <Button
                className="bg-primary hover:bg-primary/90 font-bold border-b-4 border-black/20"
                data-testid="button-add-listing"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Listing
              </Button>
            </Link>
          </div>
        </div>

        {businesses.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl text-[#99CC66] mb-2">No Listings Yet</h2>
            <p className="text-muted-foreground font-medium mb-6">
              List your hemp shop to get discovered by customers in the Hill Country.
            </p>
            <Link href="/dashboard/add">
              <Button className="font-bold bg-primary" data-testid="button-add-first-listing">
                <Plus className="h-4 w-4 mr-2" /> List My Business
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map((biz) => {
              const status = statusConfig[biz.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const StatusIcon = status.icon;
              const lastUpdated = (biz as { last_updated?: string }).last_updated;
              return (
                <div
                  key={biz.id}
                  className="bg-card border-2 border-border rounded-2xl p-6 hover:border-[#99CC66]/40 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                  data-testid={`card-business-${biz.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-2xl text-[#99CC66]">{biz.name}</h2>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs uppercase tracking-wider ${status.color}`}
                          data-testid={`status-${biz.id}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                        {biz.is_featured === 1 && (
                          <span className="px-2 py-1 rounded-full bg-[#99CC66]/20 text-[#99CC66] border border-[#99CC66]/40 font-bold text-xs uppercase tracking-wider">
                            Featured
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground font-medium mb-2">{biz.address}</p>

                      {lastUpdated && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Last updated: {formatDate(lastUpdated)}
                        </p>
                      )}

                      {biz.status === "rejected" && biz.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-950/50 border border-red-800 rounded-xl">
                          <p className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">
                            Rejection Reason
                          </p>
                          <p className="text-sm text-red-300">{biz.rejection_reason}</p>
                          <p className="text-xs text-red-400 mt-1 font-bold">
                            Edit your listing to re-submit for review.
                          </p>
                        </div>
                      )}

                      {biz.categories && biz.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {biz.categories.map((cat) => (
                            <span
                              key={cat}
                              className="text-[10px] uppercase font-bold bg-muted/60 px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Link href={`/dashboard/edit/${biz.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold border-2 w-full"
                          data-testid={`button-edit-${biz.id}`}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </Link>
                      {biz.status === "approved" && (
                        <Link href={`/business/${biz.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-bold w-full"
                            data-testid={`button-view-${biz.id}`}
                          >
                            View Public
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SuggestBrandModal open={suggestOpen} onClose={() => setSuggestOpen(false)} />
    </div>
  );
}
