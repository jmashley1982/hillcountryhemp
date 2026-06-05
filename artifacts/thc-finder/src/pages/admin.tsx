import { useState, useRef } from "react";
import {
  useGetMe,
  useGetPendingBusinesses,
  useGetAllBusinesses,
  useGetAdminBrands,
  useGetAdminPopup,
  useGetBanner,
  useGetB2bBanner,
  useGetAdminClaims,
  useApproveBusiness,
  useRejectBusiness,
  useToggleFeatureBusiness,
  useDeleteBusiness,
  useAdminCreateBusiness,
  useResolveAdminClaim,
  useCreateBrand,
  useDeleteBrand,
  useToggleFeatureBrand,
  useApproveBrand,
  useRenameBrand,
  getGetPendingBusinessesQueryKey,
  getGetAllBusinessesQueryKey,
  getGetAdminBrandsQueryKey,
  getGetBannerQueryKey,
  getGetB2bBannerQueryKey,
  getGetAdminPopupQueryKey,
  getGetAdminClaimsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  Flag,
  Monitor,
  Smartphone,
  Settings,
  Pencil,
  Check,
  X as XIcon,
} from "lucide-react";
import { ALL_CATEGORIES } from "@/lib/categories";

type Tab = "pending" | "all" | "brands" | "add-store" | "claims" | "map-banner-d" | "map-banner-m" | "map-popup-d" | "map-popup-m" | "dash-banner-d" | "dash-banner-m";

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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
              <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Rejection reason <span className="normal-case font-normal">(optional — shown to the owner)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="border-2 text-sm resize-none"
                  rows={3}
                  placeholder="e.g. Phone number appears invalid, description violates policy…"
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
  owner_id?: number | null;
  owner_email?: string | null;
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
            <p>{formatPhone(biz.phone)}</p>
          </div>
        )}
        {biz.website && (
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Website</p>
            <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-[#99CC66] hover:underline flex items-center gap-1">
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
              <span key={b.id} className="text-[10px] font-bold bg-[#99CC66]/10 text-[#99CC66] px-2 py-0.5 rounded-full border border-[#99CC66]/30">{b.name}</span>
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

  const isUnclaimed = biz.owner_id == null;

  return (
    <div
      className="bg-card border-2 border-border rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      data-testid={`admin-card-${biz.id}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-heading text-xl text-[#99CC66]">{biz.name}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[biz.status] ?? "bg-muted text-foreground"}`}>
              {biz.status}
            </span>
            {isUnclaimed && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300 flex items-center gap-1">
                <Flag className="h-3 w-3" /> Unclaimed
              </span>
            )}
            {biz.is_featured === 1 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#99CC66]/20 text-[#99CC66]">Featured</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">{biz.address}</p>
          {isUnclaimed
            ? <p className="text-xs text-orange-400/80 mt-0.5">No owner — awaiting claim</p>
            : <p className="text-xs text-muted-foreground mt-0.5">Owner: {biz.owner_email}</p>
          }
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
            className={`font-bold border-2 ${biz.is_featured === 1 ? "border-[#99CC66]/60 text-[#99CC66]" : ""}`}
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
            <Star className={`h-3.5 w-3.5 mr-1 ${biz.is_featured === 1 ? "fill-[#99CC66] text-[#99CC66]" : ""}`} />
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
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.owner_email ?? "").toLowerCase().includes(search.toLowerCase()),
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

const addStoreSchema = z.object({
  name: z.string().min(1, "Name required"),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});
type AddStoreForm = z.infer<typeof addStoreSchema>;

function AddStoreTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBusiness = useAdminCreateBusiness();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const form = useForm<AddStoreForm>({
    resolver: zodResolver(addStoreSchema),
    defaultValues: { name: "", street: "", city: "", state: "TX", zip: "", phone: "", website: "", description: "" },
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const onSubmit = (data: AddStoreForm) => {
    createBusiness.mutate(
      {
        data: {
          ...data,
          categories: selectedCategories,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Store added to map" });
          queryClient.invalidateQueries({ queryKey: getGetAllBusinessesQueryKey() });
          form.reset();
          setSelectedCategories([]);
        },
        onError: () => toast({ title: "Failed to create store", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
        Create a store listing without linking it to an account. It will appear on the public map with a
        <span className="font-bold text-orange-300"> CLAIM THIS BUSINESS</span> badge until an owner claims it.
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">Business Name *</FormLabel>
                <FormControl>
                  <Input {...field} className="border-2" placeholder="Hill Country Hemp Co." data-testid="input-store-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2" placeholder="123 Main St" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">City</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2" placeholder="Fredericksburg" />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">State</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-2" placeholder="TX" maxLength={2} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider">ZIP</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-2" placeholder="78624" maxLength={5} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">Phone</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2" placeholder="(512) 555-0100" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">Website</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2" placeholder="https://..." />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">Description</FormLabel>
                <FormControl>
                  <Textarea {...field} className="border-2 resize-none" rows={3} placeholder="Brief description of the store..." />
                </FormControl>
              </FormItem>
            )}
          />

          <div>
            <p className="font-bold uppercase text-xs tracking-wider mb-2 text-foreground">Categories</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${
                    selectedCategories.includes(cat)
                      ? "bg-[#99CC66]/20 border-[#99CC66] text-[#99CC66]"
                      : "border-border text-muted-foreground hover:border-[#99CC66]/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="font-bold bg-[#99CC66] hover:bg-[#82B54F] text-black w-full sm:w-auto"
            disabled={createBusiness.isPending}
            data-testid="button-add-store-submit"
          >
            {createBusiness.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
            Add Store to Map
          </Button>
        </form>
      </Form>
    </div>
  );
}

function ClaimsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: claims = [], isLoading } = useGetAdminClaims({
    query: { queryKey: getGetAdminClaimsQueryKey() },
  });
  const resolve = useResolveAdminClaim();

  const handleResolve = (id: number, status: "approved" | "rejected") => {
    resolve.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: status === "approved" ? "Claim approved — business linked to owner" : "Claim rejected" });
          queryClient.invalidateQueries({ queryKey: getGetAdminClaimsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAllBusinessesQueryKey() });
        },
        onError: () => toast({ title: "Failed to update claim", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="p-8 text-center font-bold animate-pulse">Loading...</div>;

  if (claims.length === 0) return (
    <div className="p-8 text-center text-muted-foreground font-bold">No pending claim requests.</div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted-foreground">{claims.length} pending claim{claims.length !== 1 ? "s" : ""}</p>
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="bg-card border-2 border-orange-800/40 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          data-testid={`claim-card-${claim.id}`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Flag className="h-4 w-4 text-orange-400 shrink-0" />
                <h3 className="font-heading text-lg text-[#99CC66]">{claim.business_name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Claimed by: <span className="text-foreground font-bold">{claim.user_email}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submitted {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-700 hover:bg-green-800 text-white font-bold"
                onClick={() => handleResolve(claim.id, "approved")}
                disabled={resolve.isPending}
                data-testid={`button-approve-claim-${claim.id}`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="font-bold"
                onClick={() => handleResolve(claim.id, "rejected")}
                disabled={resolve.isPending}
                data-testid={`button-reject-claim-${claim.id}`}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BrandsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useGetAdminBrands({ query: { queryKey: getGetAdminBrandsQueryKey() } });
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  const toggleFeature = useToggleFeatureBrand();
  const approveBrand = useApproveBrand();
  const renameBrand = useRenameBrand();
  const logoRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEdit = (id: number, name: string) => { setEditingId(id); setEditingName(name); };
  const cancelEdit = () => { setEditingId(null); setEditingName(""); };
  const saveEdit = (id: number) => {
    if (!editingName.trim()) return;
    renameBrand.mutate(
      { id, data: { name: editingName.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Brand renamed" });
          queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
          cancelEdit();
        },
        onError: () => toast({ title: "Name already in use", variant: "destructive" }),
      },
    );
  };

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
          queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const pendingBrands = brands.filter((b) => b.status === "pending");
  const approvedBrands = brands.filter((b) => b.status !== "pending");

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
        <>
          {pendingBrands.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold uppercase text-xs tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Suggested — Pending Approval ({pendingBrands.length})
              </h3>
              {pendingBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex items-center justify-between p-3 bg-yellow-950/30 border-2 border-yellow-800/40 rounded-2xl"
                  data-testid={`pending-brand-row-${brand.id}`}
                >
                  <span className="font-bold text-sm text-yellow-200">{brand.name}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="font-bold bg-[#99CC66] hover:bg-[#82B54F] text-black h-7 text-xs"
                      onClick={() =>
                        approveBrand.mutate({ id: brand.id }, {
                          onSuccess: () => {
                            toast({ title: `"${brand.name}" approved` });
                            queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
                          },
                        })
                      }
                      data-testid={`button-approve-brand-${brand.id}`}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="font-bold text-destructive hover:text-destructive h-7 text-xs"
                      onClick={() => {
                        if (!confirm(`Reject and delete suggestion "${brand.name}"?`)) return;
                        deleteBrand.mutate({ id: brand.id }, {
                          onSuccess: () => {
                            toast({ title: "Suggestion removed" });
                            queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
                          },
                        });
                      }}
                      data-testid={`button-reject-brand-${brand.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {approvedBrands.map((brand) => {
              const brandWithLogo = brand as { id: number; name: string; is_featured: number; logo_path?: string | null };
              return (
                <div
                  key={brand.id}
                  className="flex items-center justify-between p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                  data-testid={`brand-row-${brand.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {brandWithLogo.logo_path ? (
                      <img
                        src={`/api/uploads/${brandWithLogo.logo_path}`}
                        alt={brand.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-[#99CC66]/40 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border shrink-0">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {editingId === brand.id ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(brand.id); if (e.key === "Escape") cancelEdit(); }}
                          className="flex-1 min-w-0 bg-background border-2 border-[#84C7D0] rounded-lg px-3 py-1 text-sm font-bold focus:outline-none"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#99CC66] hover:text-[#99CC66]" onClick={() => saveEdit(brand.id)} disabled={renameBrand.isPending}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}><XIcon className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <span className="font-bold text-lg truncate">
                        {brand.name}
                        {brand.is_featured === 1 && (
                          <Star className="inline h-4 w-4 ml-2 fill-[#99CC66] text-[#99CC66]" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
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
                    {editingId !== brand.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-bold border border-border text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(brand.id, brand.name)}
                        title="Rename brand"
                        data-testid={`button-rename-brand-${brand.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Rename
                      </Button>
                    )}
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
                      className={`font-bold border-2 ${brand.is_featured === 1 ? "border-[#99CC66]/60 text-[#99CC66]" : ""}`}
                      onClick={() =>
                        toggleFeature.mutate({ id: brand.id }, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
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
                            queryClient.invalidateQueries({ queryKey: getGetAdminBrandsQueryKey() });
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
        </>
      )}
    </div>
  );
}

function SlotUploader({
  endpoint,
  imageField,
  linkField,
  aspectRatio,
  description,
  currentImage,
  currentLink,
  showActiveToggle,
  currentActive,
  currentNewTab,
  brandOptions,
  currentBrandFilter,
  onSuccess,
}: {
  endpoint: string;
  imageField: string;
  linkField: string;
  aspectRatio: string;
  description: string;
  currentImage?: string | null;
  currentLink?: string | null;
  showActiveToggle?: boolean;
  currentActive?: number;
  currentNewTab?: number | null;
  brandOptions?: string[];
  currentBrandFilter?: string | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<"image" | "link" | null>(null);
  const [link, setLink] = useState(currentLink ?? "");
  const [isActive, setIsActive] = useState(currentActive === 1);
  const [openInNewTab, setOpenInNewTab] = useState(currentNewTab !== 0);
  const [actionMode, setActionMode] = useState<"url" | "brand">(() => currentBrandFilter ? "brand" : "url");
  const [brandFilter, setBrandFilter] = useState(currentBrandFilter ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLink(currentLink ?? ""); }, [currentLink]);
  useEffect(() => { setIsActive(currentActive === 1); }, [currentActive]);
  useEffect(() => { setOpenInNewTab(currentNewTab !== 0); }, [currentNewTab]);
  useEffect(() => {
    setActionMode(currentBrandFilter ? "brand" : "url");
    setBrandFilter(currentBrandFilter ?? "");
  }, [currentBrandFilter]);

  const uploadImage = async (file: File) => {
    setUploading("image");
    if (fileRef.current) fileRef.current.value = "";
    try {
      const fd = new FormData();
      fd.append(imageField, file);
      const res = await fetch(endpoint, { method: "PUT", body: fd });
      if (!res.ok) {
        let msg = "Upload failed";
        try {
          const body = await res.json() as { error?: string };
          if (body.error) msg = body.error;
        } catch {}
        toast({ title: "Upload failed", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Image updated" });
      onSuccess();
    } catch {
      toast({ title: "Upload failed", description: "Could not reach the server. Please try again.", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const saveLink = async () => {
    setUploading("link");
    try {
      const fd = new FormData();
      if (actionMode === "brand") {
        fd.append(linkField, "");
        fd.append("brand_filter", brandFilter);
      } else {
        fd.append(linkField, link);
        fd.append("brand_filter", "");
      }
      fd.append("link_opens_new_tab", String(openInNewTab));
      if (showActiveToggle) fd.append("is_active", String(isActive));
      await fetch(endpoint, { method: "PUT", body: fd });
      toast({ title: "Saved" });
      onSuccess();
    } finally {
      setUploading(null);
    }
  };

  const busy = uploading !== null;

  return (
    <div className="space-y-6 max-w-xl">
      <p className="text-sm text-muted-foreground font-medium">{description}</p>

      {/* Image preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded">
            {aspectRatio}
          </span>
          <span className="text-xs text-muted-foreground">aspect ratio</span>
        </div>
        {currentImage ? (
          <div className="border-2 border-border rounded-xl overflow-hidden">
            <img src={`/api/uploads/${currentImage}`} alt="Ad creative" className="w-full h-auto block" />
          </div>
        ) : (
          <div className="border-2 border-dashed border-yellow-600/50 rounded-xl bg-yellow-950/20 flex items-center justify-center py-10">
            <div className="text-center space-y-1">
              <p className="text-yellow-400 font-bold text-xs uppercase tracking-wider">No image uploaded</p>
              <p className="text-yellow-500/60 text-[10px]">Upload a {aspectRatio} image</p>
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
        />
        <Button
          className="w-full font-bold"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          data-testid={`button-upload-${imageField}`}
        >
          {uploading === "image" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {currentImage ? "Replace Image" : "Upload Image"}
        </Button>
      </div>

      {/* Action */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="font-bold text-sm uppercase tracking-wider">Click Action</h3>

        {/* Mode toggle — only show when brand options are available */}
        {brandOptions && brandOptions.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActionMode("url")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                actionMode === "url" ? "bg-[#99CC66]/20 border-[#99CC66] text-[#99CC66]" : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              URL Link
            </button>
            <button
              type="button"
              onClick={() => setActionMode("brand")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                actionMode === "brand" ? "bg-[#84C7D0]/20 border-[#84C7D0] text-[#84C7D0]" : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              Brand Filter
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {actionMode === "brand" && brandOptions && brandOptions.length > 0 ? (
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="border-2 border-border rounded-md bg-background text-foreground px-3 py-2 text-sm flex-1"
                data-testid={`select-${imageField}-brand`}
              >
                <option value="">— Select a brand —</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            ) : (
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="border-2 flex-1"
                placeholder="https://advertiser-site.com"
                data-testid={`input-${imageField}-link`}
              />
            )}
            {showActiveToggle && (
              <label className="flex items-center gap-2 font-bold text-sm cursor-pointer shrink-0">
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
              className="border-2 font-bold shrink-0"
              onClick={saveLink}
              disabled={busy}
              data-testid={`button-save-${imageField}-link`}
            >
              {uploading === "link" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </div>
          {actionMode !== "brand" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => setOpenInNewTab(e.target.checked)}
                className="w-4 h-4"
                data-testid={`checkbox-${imageField}-new-tab`}
              />
              <span className="text-muted-foreground">Open link in a new tab</span>
            </label>
          )}
          {actionMode === "brand" && brandFilter && (
            <p className="text-xs text-[#84C7D0]">
              Clicking this ad will filter the map to show all retailers carrying <strong>{brandFilter}</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MapBannerDesktopTab() {
  const queryClient = useQueryClient();
  const { data: banner, isLoading } = useGetBanner({ query: { queryKey: getGetBannerQueryKey() } });
  const { data: brands = [] } = useGetAdminBrands({ query: { queryKey: getGetAdminBrandsQueryKey() } });
  const approvedBrandNames = brands.filter(b => b.status !== "pending").map(b => b.name).sort((a, b) => a.localeCompare(b));
  const bannerWithFilter = banner as typeof banner & { brand_filter?: string | null };
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/banner"
      imageField="banner"
      linkField="link_url"
      aspectRatio="8:1"
      description="Shown above the nav on the map page for desktop visitors."
      currentImage={banner?.image_path ?? null}
      currentLink={banner?.link_url ?? null}
      currentNewTab={banner?.link_opens_new_tab}
      brandOptions={approvedBrandNames}
      currentBrandFilter={bannerWithFilter?.brand_filter ?? null}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetBannerQueryKey() })}
    />
  );
}

function MapBannerMobileTab() {
  const queryClient = useQueryClient();
  const { data: banner, isLoading } = useGetBanner({ query: { queryKey: getGetBannerQueryKey() } });
  const { data: brands = [] } = useGetAdminBrands({ query: { queryKey: getGetAdminBrandsQueryKey() } });
  const approvedBrandNames = brands.filter(b => b.status !== "pending").map(b => b.name).sort((a, b) => a.localeCompare(b));
  const bannerWithFilter = banner as typeof banner & { brand_filter?: string | null };
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/banner"
      imageField="banner_mobile"
      linkField="mobile_link_url"
      aspectRatio="21:9"
      description="Shown above the nav on the map page for mobile visitors."
      currentImage={banner?.mobile_image_path ?? null}
      currentLink={banner?.mobile_link_url ?? null}
      currentNewTab={banner?.link_opens_new_tab}
      brandOptions={approvedBrandNames}
      currentBrandFilter={bannerWithFilter?.brand_filter ?? null}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetBannerQueryKey() })}
    />
  );
}

function MapPopupDesktopTab() {
  const queryClient = useQueryClient();
  const { data: popup, isLoading } = useGetAdminPopup({ query: { queryKey: getGetAdminPopupQueryKey() } });
  const { data: brands = [] } = useGetAdminBrands({ query: { queryKey: getGetAdminBrandsQueryKey() } });
  const approvedBrandNames = brands.filter(b => b.status !== "pending").map(b => b.name).sort((a, b) => a.localeCompare(b));
  const popupWithFilter = popup as typeof popup & { brand_filter?: string | null };
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/popup"
      imageField="image"
      linkField="link_url"
      aspectRatio="4:5"
      description="Session popup shown to desktop visitors on the map page. Toggle Active to enable/disable."
      currentImage={popup?.image_path ?? null}
      currentLink={popup?.link_url ?? null}
      showActiveToggle
      currentActive={popup?.is_active}
      currentNewTab={popup?.link_opens_new_tab}
      brandOptions={approvedBrandNames}
      currentBrandFilter={popupWithFilter?.brand_filter ?? null}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetAdminPopupQueryKey() })}
    />
  );
}

function MapPopupMobileTab() {
  const queryClient = useQueryClient();
  const { data: popup, isLoading } = useGetAdminPopup({ query: { queryKey: getGetAdminPopupQueryKey() } });
  const { data: brands = [] } = useGetAdminBrands({ query: { queryKey: getGetAdminBrandsQueryKey() } });
  const approvedBrandNames = brands.filter(b => b.status !== "pending").map(b => b.name).sort((a, b) => a.localeCompare(b));
  const popupWithFilter = popup as typeof popup & { brand_filter?: string | null };
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/popup"
      imageField="image_mobile"
      linkField="mobile_link_url"
      aspectRatio="9:16"
      description="Session popup shown to mobile visitors on the map page."
      currentImage={popup?.mobile_image_path ?? null}
      currentLink={popup?.mobile_link_url ?? null}
      currentNewTab={popup?.link_opens_new_tab}
      brandOptions={approvedBrandNames}
      currentBrandFilter={popupWithFilter?.brand_filter ?? null}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetAdminPopupQueryKey() })}
    />
  );
}

function DashBannerDesktopTab() {
  const queryClient = useQueryClient();
  const { data: b2b, isLoading } = useGetB2bBanner({ query: { queryKey: getGetB2bBannerQueryKey() } });
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/b2b-banner"
      imageField="banner"
      linkField="link_url"
      aspectRatio="8:1"
      description="Shown above the nav on the business dashboard for desktop visitors."
      currentImage={b2b?.image_path ?? null}
      currentLink={b2b?.link_url ?? null}
      currentNewTab={b2b?.link_opens_new_tab}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetB2bBannerQueryKey() })}
    />
  );
}

function DashBannerMobileTab() {
  const queryClient = useQueryClient();
  const { data: b2b, isLoading } = useGetB2bBanner({ query: { queryKey: getGetB2bBannerQueryKey() } });
  if (isLoading) return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <SlotUploader
      endpoint="/api/admin/b2b-banner"
      imageField="banner_mobile"
      linkField="mobile_link_url"
      aspectRatio="21:9"
      description="Shown above the nav on the business dashboard for mobile visitors."
      currentImage={b2b?.mobile_image_path ?? null}
      currentLink={b2b?.mobile_link_url ?? null}
      currentNewTab={b2b?.link_opens_new_tab}
      onSuccess={() => queryClient.invalidateQueries({ queryKey: getGetB2bBannerQueryKey() })}
    />
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "all", label: "All Listings", icon: Building },
  { id: "add-store", label: "Add Store", icon: MapPin },
  { id: "claims", label: "Claims", icon: Flag },
  { id: "brands", label: "Brands", icon: Tag },
  { id: "map-banner-d", label: "Map Banner · Desktop", icon: Monitor },
  { id: "map-banner-m", label: "Map Banner · Mobile", icon: Smartphone },
  { id: "map-popup-d", label: "Map Popup · Desktop", icon: Megaphone },
  { id: "map-popup-m", label: "Map Popup · Mobile", icon: Smartphone },
  { id: "dash-banner-d", label: "Dash Banner · Desktop", icon: Monitor },
  { id: "dash-banner-m", label: "Dash Banner · Mobile", icon: Smartphone },
];

export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const { data: claims = [] } = useGetAdminClaims({
    query: { queryKey: getGetAdminClaimsQueryKey() },
  });

  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) return <div className="p-12 text-center font-bold animate-pulse">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl text-[#99CC66]">Admin Panel</h1>
          <p className="text-muted-foreground font-bold mt-1">{user?.email} — Super Admin</p>
        </div>
        <Link href="/account-settings">
          <Button
            variant="outline"
            size="sm"
            className="font-bold border-2 shrink-0 mt-1"
            data-testid="button-account-settings"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Account Settings
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-border pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-[#99CC66]/50 hover:text-[#99CC66]"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "claims" && claims.length > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {claims.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "all" && <AllBusinessesTab />}
        {activeTab === "add-store" && <AddStoreTab />}
        {activeTab === "claims" && <ClaimsTab />}
        {activeTab === "brands" && <BrandsTab />}
        {activeTab === "map-banner-d" && <MapBannerDesktopTab />}
        {activeTab === "map-banner-m" && <MapBannerMobileTab />}
        {activeTab === "map-popup-d" && <MapPopupDesktopTab />}
        {activeTab === "map-popup-m" && <MapPopupMobileTab />}
        {activeTab === "dash-banner-d" && <DashBannerDesktopTab />}
        {activeTab === "dash-banner-m" && <DashBannerMobileTab />}
      </div>
    </div>
  );
}
