import { useState, useRef } from "react";
import {
  useGetMe,
  useGetPendingBusinesses,
  useGetAllBusinesses,
  useGetBrands,
  useGetAdminPopup,
  useGetBanner,
  useApproveBusiness,
  useRejectBusiness,
  useToggleFeatureBusiness,
  useDeleteBusiness,
  useCreateBrand,
  useDeleteBrand,
  useToggleFeatureBrand,
  getGetPendingBusinessesQueryKey,
  getGetAllBusinessesQueryKey,
  getGetBrandsQueryKey,
  getGetBannerQueryKey,
  getGetAdminPopupQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Star,
  Trash2,
  Plus,
  Upload,
  Loader2,
  Clock,
  Building,
  Tag,
  Image,
  Megaphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Briefcase,
} from "lucide-react";

type Tab = "pending" | "all" | "brands" | "banner" | "popup" | "b2b";

const rejectSchema = z.object({ reason: z.string().optional() });
type RejectForm = z.infer<typeof rejectSchema>;
const brandSchema = z.object({ name: z.string().min(1, "Brand name required") });
type BrandForm = z.infer<typeof brandSchema>;

function RejectDialog({
  businessId,
  onDone,
}: {
  businessId: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reject = useRejectBusiness();
  const form = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          reject.mutate(
            { id: businessId, data: { reason: data.reason } },
            {
              onSuccess: () => {
                toast({ title: "Rejected" });
                queryClient.invalidateQueries({ queryKey: getGetPendingBusinessesQueryKey() });
                queryClient.invalidateQueries({ queryKey: getGetAllBusinessesQueryKey() });
                onDone();
              },
            },
          );
        })}
        className="mt-3 space-y-2"
      >
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  className="border-2 text-sm"
                  placeholder="Rejection reason (optional)"
                  data-testid="input-rejection-reason"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            className="font-bold"
            disabled={reject.isPending}
            data-testid="button-confirm-reject"
          >
            {reject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Reject"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="font-bold" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

type BizRow = {
  id: number;
  name: string;
  address: string;
  owner_email: string;
  status: string;
  is_featured: number;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  hours?: string | null;
  logo_path?: string | null;
  categories?: string[];
  brands?: { id: number; name: string }[];
};

function FullDetails({ biz }: { biz: BizRow }) {
  return (
    <div className="mt-4 p-4 bg-background border border-border rounded-xl space-y-3 text-sm">
      {biz.logo_path && (
        <img
          src={`/api/uploads/${biz.logo_path}`}
          alt="Logo"
          className="w-20 h-20 object-cover rounded-xl border-2 border-border"
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        {biz.phone && (
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Phone</p>
            <p>{biz.phone}</p>
          </div>
        )}
        {biz.website && (
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Website</p>
            <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline flex items-center gap-1">
              {biz.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
      {biz.hours && (
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Hours</p>
          <pre className="font-sans whitespace-pre-wrap">{biz.hours}</pre>
        </div>
      )}
      {biz.description && (
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Description</p>
          <p className="text-muted-foreground">{biz.description}</p>
        </div>
      )}
      {biz.categories && biz.categories.length > 0 && (
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Categories</p>
          <div className="flex flex-wrap gap-1">
            {biz.categories.map((c) => (
              <span key={c} className="text-[10px] uppercase font-bold bg-muted px-2 py-0.5 rounded-full border border-border text-muted-foreground">{c}</span>
            ))}
          </div>
        </div>
      )}
      {biz.brands && biz.brands.length > 0 && (
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Brands</p>
          <div className="flex flex-wrap gap-1">
            {biz.brands.map((b) => (
              <span key={b.id} className="text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">{b.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessCard({
  biz,
  showApprove,
}: {
  biz: BizRow;
  showApprove: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const approve = useApproveBusiness();
  const toggleFeature = useToggleFeatureBusiness();
  const deleteBiz = useDeleteBusiness();
  const [showReject, setShowReject] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetPendingBusinessesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAllBusinessesQueryKey() });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-900/40 text-yellow-300",
    approved: "bg-green-900/40 text-green-300",
    rejected: "bg-red-900/40 text-red-300",
  };

  return (
    <div
      className="bg-card border-2 border-border rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      data-testid={`admin-card-${biz.id}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-heading text-xl text-[#D4AF37]">{biz.name}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[biz.status] ?? "bg-muted text-foreground"}`}>
              {biz.status}
            </span>
            {biz.is_featured === 1 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">Featured</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">{biz.address}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Owner: {biz.owner_email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="font-bold border border-border text-muted-foreground hover:text-foreground"
            onClick={() => setShowDetails(!showDetails)}
            data-testid={`button-details-${biz.id}`}
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
            Details
          </Button>

          {showApprove && (
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white font-bold"
              onClick={() =>
                approve.mutate({ id: biz.id }, {
                  onSuccess: () => { toast({ title: "Approved" }); invalidateAll(); },
                })
              }
              disabled={approve.isPending}
              data-testid={`button-approve-${biz.id}`}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          )}

          {!showReject && (
            <Button
              size="sm"
              variant="destructive"
              className="font-bold"
              onClick={() => setShowReject(true)}
              data-testid={`button-reject-${biz.id}`}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className={`font-bold border-2 ${biz.is_featured === 1 ? "border-[#D4AF37]/60 text-[#D4AF37]" : ""}`}
            onClick={() =>
              toggleFeature.mutate({ id: biz.id }, {
                onSuccess: () => {
                  toast({ title: biz.is_featured === 1 ? "Removed from featured" : "Marked as featured" });
                  invalidateAll();
                },
              })
            }
            data-testid={`button-feature-${biz.id}`}
          >
            <Star className={`h-3.5 w-3.5 mr-1 ${biz.is_featured === 1 ? "fill-[#D4AF37] text-[#D4AF37]" : ""}`} />
            {biz.is_featured === 1 ? "Unfeature" : "Feature"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="font-bold text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirm(`Delete "${biz.name}"?`)) return;
              deleteBiz.mutate({ id: biz.id }, {
                onSuccess: () => { toast({ title: "Deleted" }); invalidateAll(); },
              });
            }}
            data-testid={`button-delete-${biz.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showDetails && <FullDetails biz={biz} />}
      {showReject && <RejectDialog businessId={biz.id} onDone={() => setShowReject(false)} />}
    </div>
  );
}

function PendingTab() {
  const { data: pending = [], isLoading } = useGetPendingBusinesses({
    query: { queryKey: getGetPendingBusinessesQueryKey() },
  });
  if (isLoading) return <div className="p-8 text-center font-bold animate-pulse">Loading...</div>;
  if (pending.length === 0) return (
    <div className="p-8 text-center text-muted-foreground font-bold">No pending submissions.</div>
  );
  return (
    <div className="space-y-4">
      {pending.map((b) => <BusinessCard key={b.id} biz={b as BizRow} showApprove />)}
    </div>
  );
}

function AllBusinessesTab() {
  const { data: all = [], isLoading } = useGetAllBusinesses({
    query: { queryKey: getGetAllBusinessesQueryKey() },
  });
  const [search, setSearch] = useState("");
  const filtered = all.filter(
    (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.owner_email.toLowerCase().includes(search.toLowerCase()),
  );
  if (isLoading) return <div className="p-8 text-center font-bold animate-pulse">Loading...</div>;
  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or owner..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border-2"
        data-testid="input-search-businesses"
      />
      <p className="text-sm font-bold text-muted-foreground">{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</p>
      {filtered.map((b) => <BusinessCard key={b.id} biz={b as BizRow} showApprove={b.status === "pending"} />)}
    </div>
  );
}

function BrandsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useGetBrands({ query: { queryKey: getGetBrandsQueryKey() } });
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  const toggleFeature = useToggleFeatureBrand();
  const logoRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const form = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "" },
  });

  const onAddBrand = (data: BrandForm) => {
    createBrand.mutate(
      { data: { name: data.name } },
      {
        onSuccess: () => {
          toast({ title: "Brand added" });
          queryClient.invalidateQueries({ queryKey: getGetBrandsQueryKey() });
          form.reset();
        },
        onError: () => toast({ title: "Brand already exists", variant: "destructive" }),
      },
    );
  };

  const uploadLogo = async (brandId: number, file: File) => {
    const fd = new FormData();
    fd.append("logo", file);
    try {
      const res = await fetch(`/api/brands/${brandId}/logo`, { method: "PUT", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Logo uploaded" });
      queryClient.invalidateQueries({ queryKey: getGetBrandsQueryKey() });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAddBrand)} className="flex gap-3 items-end">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="font-bold uppercase text-xs tracking-wider">Add Brand</FormLabel>
                <FormControl>
                  <Input {...field} className="border-2" placeholder="Brand name" data-testid="input-brand-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="font-bold" disabled={createBrand.isPending} data-testid="button-add-brand">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </form>
      </Form>

      {isLoading ? (
        <div className="animate-pulse font-bold">Loading brands...</div>
      ) : (
        <div className="space-y-2">
          {brands.map((brand) => {
            const brandWithLogo = brand as { id: number; name: string; is_featured: number; logo_path?: string | null };
            return (
              <div
                key={brand.id}
                className="flex items-center justify-between p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                data-testid={`brand-row-${brand.id}`}
              >
                <div className="flex items-center gap-3">
                  {brandWithLogo.logo_path ? (
                    <img
                      src={`/api/uploads/${brandWithLogo.logo_path}`}
                      alt={brand.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#D4AF37]/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-bold text-lg">
                    {brand.name}
                    {brand.is_featured === 1 && (
                      <Star className="inline h-4 w-4 ml-2 fill-[#D4AF37] text-[#D4AF37]" />
                    )}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    ref={(el) => { logoRefs.current[brand.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogo(brand.id, file);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold border border-border text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => logoRefs.current[brand.id]?.click()}
                    title="Upload logo"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Logo
                    <span className="ml-1.5 text-[9px] text-muted-foreground hidden sm:inline">200×200 · 2MB</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`font-bold border-2 ${brand.is_featured === 1 ? "border-[#D4AF37]/60 text-[#D4AF37]" : ""}`}
                    onClick={() =>
                      toggleFeature.mutate({ id: brand.id }, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: getGetBrandsQueryKey() });
                          toast({ title: brand.is_featured === 1 ? "Unfeatured" : "Featured" });
                        },
                      })
                    }
                    data-testid={`button-feature-brand-${brand.id}`}
                  >
                    <Star className="h-3.5 w-3.5 mr-1" />
                    {brand.is_featured === 1 ? "Unfeature" : "Feature"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-bold text-destructive hover:text-destructive"
                    onClick={() => {
                      if (!confirm(`Delete brand "${brand.name}"?`)) return;
                      deleteBrand.mutate({ id: brand.id }, {
                        onSuccess: () => {
                          toast({ title: "Deleted" });
                          queryClient.invalidateQueries({ queryKey: getGetBrandsQueryKey() });
                        },
                      });
                    }}
                    data-testid={`button-delete-brand-${brand.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdUploader({
  label,
  endpoint,
  field,
  currentImage,
  currentLink,
  hint,
  showActiveToggle,
  onSuccess,
}: {
  label: string;
  endpoint: string;
  field: string;
  currentImage?: string | null;
  currentLink?: string | null;
  hint?: string;
  showActiveToggle?: boolean;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState(currentLink ?? "");
  const [isActive, setIsActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      fd.append("link_url", link);
      if (showActiveToggle) fd.append("is_active", String(isActive));
      const res = await fetch(endpoint, { method: "PUT", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Updated successfully" });
      onSuccess();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveLink = async () => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("link_url", link);
      if (showActiveToggle) fd.append("is_active", String(isActive));
      await fetch(endpoint, { method: "PUT", body: fd });
      toast({ title: "Saved" });
      onSuccess();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {currentImage && (
        <div className="border-2 border-border rounded-2xl overflow-hidden max-w-lg">
          <img src={`/api/uploads/${currentImage}`} alt={label} className="w-full h-auto" />
        </div>
      )}
      {hint && (
        <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          {hint}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="border-2 flex-1"
          placeholder="https://link-url.com"
          data-testid={`input-${field}-link`}
        />
        {showActiveToggle && (
          <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
              data-testid="checkbox-popup-active"
            />
            Active
          </label>
        )}
        <Button
          variant="outline"
          className="border-2 font-bold"
          onClick={saveLink}
          disabled={uploading}
          data-testid={`button-save-${field}-link`}
        >
          Save Link
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
        <Button
          className="font-bold bg-primary hover:bg-primary/90"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          data-testid={`button-upload-${field}`}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {currentImage ? "Replace Image" : "Upload Image"}
        </Button>
      </div>
    </div>
  );
}

function BannerTab() {
  const queryClient = useQueryClient();
  const { data: banner, isLoading } = useGetBanner({ query: { queryKey: getGetBannerQueryKey() } });
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <AdUploader
      label="Banner Ad"
      endpoint="/api/admin/banner"
      field="banner"
      currentImage={banner?.image_path ?? null}
      currentLink={banner?.link_url ?? null}
      hint="Recommended size: 728×90 pixels (horizontal banner). Max file size: 5 MB."
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetBannerQueryKey() })}
    />
  );
}

function PopupTab() {
  const queryClient = useQueryClient();
  const { data: popup, isLoading } = useGetAdminPopup({ query: { queryKey: getGetAdminPopupQueryKey() } });
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <AdUploader
      label="Popup Ad"
      endpoint="/api/admin/popup"
      field="image"
      currentImage={popup?.image_path ?? null}
      currentLink={popup?.link_url ?? null}
      hint="Recommended size: 600×800 pixels (portrait) or 800×600 (landscape). Max file size: 5 MB."
      showActiveToggle
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetAdminPopupQueryKey() })}
    />
  );
}

function B2BBannerTab() {
  const [b2bData, setB2bData] = useState<{ image_path: string | null; link_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/b2b-banner")
      .then((r) => r.json())
      .then((d: { image_path: string | null; link_url: string | null }) => { setB2bData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">
        This banner appears on the Dashboard and Add/Edit Business pages — visible only to logged-in business owners.
      </p>
      <AdUploader
        label="B2B Banner Ad"
        endpoint="/api/admin/b2b-banner"
        field="banner"
        currentImage={b2bData?.image_path ?? null}
        currentLink={b2bData?.link_url ?? null}
        hint="Recommended size: 728×90 pixels (horizontal banner). Max file size: 5 MB."
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "all", label: "All Listings", icon: Building },
  { id: "brands", label: "Brands", icon: Tag },
  { id: "banner", label: "Banner Ad", icon: Image },
  { id: "popup", label: "Popup Ad", icon: Megaphone },
  { id: "b2b", label: "B2B Banner", icon: Briefcase },
];

export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe();
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) return <div className="p-12 text-center font-bold animate-pulse">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl text-[#D4AF37]">Admin Panel</h1>
        <p className="text-muted-foreground font-bold mt-1">{user?.email} — Super Admin</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-border pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-[#D4AF37]/50 hover:text-[#D4AF37]"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "all" && <AllBusinessesTab />}
        {activeTab === "brands" && <BrandsTab />}
        {activeTab === "banner" && <BannerTab />}
        {activeTab === "popup" && <PopupTab />}
        {activeTab === "b2b" && <B2BBannerTab />}
      </div>
    </div>
  );
}
