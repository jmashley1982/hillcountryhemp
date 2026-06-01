import { useGetMe, useGetOwnedBusinesses, getGetOwnedBusinessesQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";

const statusConfig = {
  pending: { label: "Pending Review", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-300" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 border-red-300" },
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl text-primary">My Listings</h1>
          <p className="text-muted-foreground font-bold mt-1">{user?.email}</p>
        </div>
        <Link href="/dashboard/add">
          <Button
            className="bg-primary hover:bg-primary/90 font-bold border-b-4 border-black/20"
            data-testid="button-add-listing"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Listing
          </Button>
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl text-primary mb-2">No Listings Yet</h2>
          <p className="text-muted-foreground font-medium mb-6">
            List your hemp shop to get discovered by customers in the Hill Country.
          </p>
          <Link href="/dashboard/add">
            <Button className="font-bold" data-testid="button-add-first-listing">
              <Plus className="h-4 w-4 mr-2" /> List My Business
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {businesses.map((biz) => {
            const status = statusConfig[biz.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={biz.id}
                className="bg-card border-2 border-border rounded-xl p-6 hover:border-primary transition-all"
                data-testid={`card-business-${biz.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-2xl text-primary">{biz.name}</h2>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs uppercase tracking-wider ${status.color}`}
                        data-testid={`status-${biz.id}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                      {biz.is_featured === 1 && (
                        <span className="px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/40 font-bold text-xs uppercase tracking-wider">
                          Featured
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground font-medium mb-2">{biz.address}</p>

                    {biz.status === "rejected" && biz.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-bold text-red-700 uppercase tracking-wider mb-1">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-red-600">{biz.rejection_reason}</p>
                        <p className="text-xs text-red-500 mt-1 font-bold">
                          Edit your listing to re-submit for review.
                        </p>
                      </div>
                    )}

                    {biz.categories && biz.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {biz.categories.map((cat) => (
                          <span
                            key={cat}
                            className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded border"
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
  );
}
