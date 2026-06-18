import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useGetMe,
  useGetPendingBusinesses,
  useGetAllBusinesses,
  useGetAdminBrands,
  useGetAdminPopup,
  useGetBanner,
  useGetB2bBanner,
  useGetAdminClaims,
  useGetAdminAuditLog,
  useGetFlaggedIps,
  useClearFlaggedIp,
  useGetAdminImages,
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
  useDeleteAdminImage,
  useBulkDeleteAdminImages,
  useForceDeleteAdminImage,
  useGetCategories,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
  useReorderCategories,
  useGetCities,
  useCreateCity,
  useRenameCity,
  useDeleteCity,
  getGetPendingBusinessesQueryKey,
  getGetAllBusinessesQueryKey,
  getGetAdminBrandsQueryKey,
  getGetBannerQueryKey,
  getGetB2bBannerQueryKey,
  getGetAdminPopupQueryKey,
  getGetAdminClaimsQueryKey,
  getGetAdminAuditLogQueryKey,
  getGetFlaggedIpsQueryKey,
  getGetAdminImagesQueryKey,
  getGetCategoriesQueryKey,
  getGetCitiesQueryKey,
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
  GripVertical,
  Shield,
} from "lucide-react";

type Tab = "pending" | "all" | "brands" | "add-store" | "claims" | "categories" | "cities" | "map-banner-d" | "map-banner-m" | "map-popup-d" | "map-popup-m" | "dash-banner-d" | "dash-banner-m" | "images";

/** Return the URL only when its scheme is http or https; undefined otherwise. */
function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }
  return url;
}

/** Return the URL only when it points to a known Google-owned host. */
function safeGoogleReviewsUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    const h = hostname.toLowerCase();
    if (h !== "google.com" && !h.endsWith(".google.com") && h !== "g.page" && h !== "goo.gl" && h !== "maps.app.goo.gl") return undefined;
  } catch {
    return undefined;
  }
  return url;
}

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
        {safeHref(biz.website) && (
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Website</p>
            <a href={safeHref(biz.website)} target="_blank" rel="noopener noreferrer" className="text-[#99CC66] hover:underline flex items-center gap-1">
              {biz.website!.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
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
  email: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});
type AddStoreForm = z.infer<typeof addStoreSchema>;

function AddStoreTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBusiness = useAdminCreateBusiness();
  const { data: categoryOptions = [] } = useGetCategories({ query: { queryKey: getGetCategoriesQueryKey() } });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const form = useForm<AddStoreForm>({
    resolver: zodResolver(addStoreSchema),
    defaultValues: { name: "", street: "", city: "", state: "TX", zip: "", phone: "", email: "", website: "", description: "" },
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">Email</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-2" type="email" placeholder="hello@store.com" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
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
              {categoryOptions.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => toggleCategory(cat.name)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${
                    selectedCategories.includes(cat.name)
                      ? "bg-[#99CC66]/20 border-[#99CC66] text-[#99CC66]"
                      : "border-border text-muted-foreground hover:border-[#99CC66]/50"
                  }`}
                >
                  {cat.name}
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  AWAITING_OTP:          { label: "Awaiting OTP",    cls: "bg-blue-900/40 text-blue-300 border-blue-700/40" },
  AWAITING_DOCUMENT:     { label: "Awaiting Doc",    cls: "bg-yellow-900/40 text-yellow-300 border-yellow-700/40" },
  PENDING_MANUAL_REVIEW: { label: "Manual Review",   cls: "bg-orange-900/40 text-orange-300 border-orange-700/40" },
  PENDING_OWNER_REVIEW:  { label: "Owner Contest",   cls: "bg-purple-900/40 text-purple-300 border-purple-700/40" },
  PENDING_EMAIL_CHECK:   { label: "Email Check",     cls: "bg-cyan-900/40 text-cyan-300 border-cyan-700/40" },
  pending:               { label: "Pending",         cls: "bg-orange-900/40 text-orange-300 border-orange-700/40" },
};

function AuditLogViewer({ businessId }: { businessId: number }) {
  const { data: logs = [], isLoading } = useGetAdminAuditLog(businessId, {
    query: { queryKey: getGetAdminAuditLogQueryKey(businessId) },
  });
  if (isLoading) return <p className="text-xs text-muted-foreground animate-pulse py-2">Loading audit log…</p>;
  if (logs.length === 0) return <p className="text-xs text-muted-foreground py-2">No audit events yet.</p>;
  return (
    <div className="space-y-1 max-h-48 overflow-y-auto border-t border-border pt-3 mt-1">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Audit Log</p>
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2 text-xs">
          <span className="text-muted-foreground shrink-0 whitespace-nowrap">
            {new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
            {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-bold text-[#99CC66] shrink-0">{log.action_type}</span>
          {log.client_ip && <span className="text-muted-foreground font-mono truncate">{log.client_ip}</span>}
        </div>
      ))}
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
  const clearIp = useClearFlaggedIp();
  const { data: flaggedIps = [], isLoading: ipsLoading } = useGetFlaggedIps({
    query: { queryKey: getGetFlaggedIpsQueryKey() },
  });

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingAuditBiz, setViewingAuditBiz] = useState<number | null>(null);

  const handleApprove = (id: number) => {
    resolve.mutate(
      { id, data: { status: "approved" } },
      {
        onSuccess: () => {
          toast({ title: "Claim approved — business linked to owner" });
          queryClient.invalidateQueries({ queryKey: getGetAdminClaimsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAllBusinessesQueryKey() });
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to approve";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleReject = (id: number) => {
    if (!rejectReason.trim()) {
      toast({ title: "A rejection reason is required.", variant: "destructive" });
      return;
    }
    resolve.mutate(
      { id, data: { status: "rejected", reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Claim rejected" });
          setRejectingId(null);
          setRejectReason("");
          queryClient.invalidateQueries({ queryKey: getGetAdminClaimsQueryKey() });
        },
        onError: () => toast({ title: "Failed to reject claim", variant: "destructive" }),
      },
    );
  };

  const handleClearIp = (id: number) => {
    clearIp.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "IP flag cleared" });
          queryClient.invalidateQueries({ queryKey: getGetFlaggedIpsQueryKey() });
        },
        onError: () => toast({ title: "Failed to clear IP", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="p-8 text-center font-bold animate-pulse">Loading...</div>;

  return (
    <div className="space-y-10">
      {/* ── Active claims ─────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-sm font-bold text-muted-foreground">
          {claims.length} active claim{claims.length !== 1 ? "s" : ""} awaiting review
        </p>

        {claims.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-bold">No active claim requests.</div>
        ) : (
          claims.map((claim) => {
            const badge = STATUS_BADGE[claim.status ?? "pending"] ?? { label: claim.status ?? "Unknown", cls: "bg-muted text-muted-foreground border-border" };
            const isContested = !!claim.contest_deadline;
            // Use the protected admin endpoint — /api/uploads/ blocks claim-doc-* files
            const documentUrl = claim.document_path ? `/api/admin/claims/${claim.id}/document` : null;
            const isRejecting = rejectingId === claim.id;
            const isShowingAudit = viewingAuditBiz === claim.business_id;

            return (
              <div
                key={claim.id}
                className="bg-card border-2 border-orange-800/40 rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] space-y-4"
                data-testid={`claim-card-${claim.id}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-orange-400 shrink-0" />
                      <h3 className="font-heading text-lg text-[#99CC66]">{claim.business_name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {claim.verification_method && (
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          via {claim.verification_method === "domain_otp" ? "Domain OTP" : "Document"}
                        </span>
                      )}
                      {isContested && (
                        <span className="text-xs font-bold text-purple-300 bg-purple-900/30 border border-purple-700/40 px-2 py-0.5 rounded-full">
                          Owner Contest · deadline {new Date(claim.contest_deadline!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Claimant: <span className="text-foreground font-bold">{claim.claimant_email ?? claim.user_email}</span>
                    </p>
                    {claim.otp_locked_until && new Date(claim.otp_locked_until) > new Date() && (
                      <p className="text-xs text-orange-400 font-bold">
                        OTP locked until {new Date(claim.otp_locked_until).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {claim.otp_attempts != null && ` (${claim.otp_attempts} failed attempt${claim.otp_attempts !== 1 ? "s" : ""})`}
                      </p>
                    )}
                    {documentUrl && (
                      <a href={documentUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#84C7D0] hover:underline">
                        <ExternalLink className="h-3 w-3" /> View Document
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-800 text-white font-bold"
                      onClick={() => handleApprove(claim.id)}
                      disabled={resolve.isPending}
                      data-testid={`button-approve-claim-${claim.id}`}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    {!isRejecting && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="font-bold"
                        onClick={() => { setRejectingId(claim.id); setRejectReason(""); }}
                        disabled={resolve.isPending}
                        data-testid={`button-reject-claim-${claim.id}`}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-[#99CC66] font-bold transition-colors"
                      onClick={() => setViewingAuditBiz(isShowingAudit ? null : claim.business_id)}
                    >
                      {isShowingAudit ? "Hide Log" : "Audit Log"}
                    </button>
                  </div>
                </div>

                {/* Reject reason inline form */}
                {isRejecting && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rejection Reason (required)</p>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain why this claim is being rejected…"
                      className="text-sm min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="font-bold"
                        onClick={() => handleReject(claim.id)}
                        disabled={resolve.isPending || !rejectReason.trim()}
                      >
                        {resolve.isPending
                          ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Rejecting...</>
                          : "Confirm Rejection"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline audit log */}
                {isShowingAudit && <AuditLogViewer businessId={claim.business_id} />}
              </div>
            );
          })
        )}
      </div>

      {/* ── Flagged IPs ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-heading text-xl text-[#99CC66] flex items-center gap-2 border-t-2 border-border pt-6">
          <Shield className="h-5 w-5" /> Flagged IPs
        </h3>
        {ipsLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse font-bold text-center p-4">Loading…</p>
        ) : flaggedIps.length === 0 ? (
          <p className="text-sm text-muted-foreground font-bold text-center p-4">No flagged IPs.</p>
        ) : (
          <div className="space-y-2">
            {flaggedIps.map((ip) => (
              <div
                key={ip.id}
                className={`flex items-center justify-between gap-4 bg-card border-2 rounded-xl px-4 py-3 ${ip.cleared_at ? "border-border opacity-60" : "border-red-800/40"}`}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-sm font-bold">{ip.ip}</p>
                  <p className="text-xs text-muted-foreground">{ip.flagged_reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Flagged {new Date(ip.flagged_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {ip.cleared_at && (
                    <p className="text-xs font-bold text-green-400">
                      Cleared {new Date(ip.cleared_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                {!ip.cleared_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold shrink-0"
                    onClick={() => handleClearIp(ip.id)}
                    disabled={clearIp.isPending}
                  >
                    Clear
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function ImagesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: images = [], isLoading } = useGetAdminImages({
    query: { queryKey: getGetAdminImagesQueryKey() },
  });
  const deleteImage = useDeleteAdminImage();
  const forceDeleteImage = useForceDeleteAdminImage();
  const bulkDelete = useBulkDeleteAdminImages();
  const [filter, setFilter] = useState<"all" | "live" | "unlisted">("all");

  const live = images.filter((i) => i.live);
  const unlisted = images.filter((i) => !i.live);
  const filtered = filter === "live" ? live : filter === "unlisted" ? unlisted : images;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminImagesQueryKey() });

  const handleDelete = (filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    deleteImage.mutate(
      { filename },
      {
        onSuccess: () => { toast({ title: "Image deleted" }); invalidate(); },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      },
    );
  };

  const handleForceDelete = (img: { filename: string; contexts: string[] }) => {
    const ctxList = img.contexts.join(", ");
    if (
      !confirm(
        `⚠️ WARNING: "${img.filename}" is CURRENTLY LIVE.\n\nIt is used by: ${ctxList}\n\nDeleting it will IMMEDIATELY BREAK those placements until a replacement is uploaded.\n\nAre you absolutely sure you want to delete this live image?`,
      )
    )
      return;
    forceDeleteImage.mutate(
      { filename: img.filename },
      {
        onSuccess: () => { toast({ title: "Live image force-deleted" }); invalidate(); },
        onError: () => toast({ title: "Force delete failed", variant: "destructive" }),
      },
    );
  };

  const handleBulkDelete = () => {
    if (
      !confirm(
        `Permanently delete all ${unlisted.length} unlisted image${unlisted.length !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;
    bulkDelete.mutate(
      { data: { filenames: unlisted.map((i) => i.filename) } },
      {
        onSuccess: () => {
          toast({ title: `Deleted ${unlisted.length} unlisted image${unlisted.length !== 1 ? "s" : ""}` });
          invalidate();
        },
        onError: () => toast({ title: "Bulk delete failed", variant: "destructive" }),
      },
    );
  };

  if (isLoading) return <div className="p-8 text-center font-bold animate-pulse">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-5 text-sm font-bold">
          <span className="text-muted-foreground">{images.length} total</span>
          <span className="text-green-400">{live.length} live</span>
          <span className="text-orange-400">{unlisted.length} unlisted</span>
        </div>
        {unlisted.length > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="font-bold"
            onClick={handleBulkDelete}
            disabled={bulkDelete.isPending}
          >
            {bulkDelete.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Delete All Unlisted ({unlisted.length})
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(["all", "live", "unlisted"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider border-2 transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-[#99CC66]/50"
            }`}
          >
            {f === "all" ? `All (${images.length})` : f === "live" ? `Live (${live.length})` : `Unlisted (${unlisted.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground font-bold py-8">
          {filter === "unlisted" ? "No unlisted images." : "No images found."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((img) => (
            <div
              key={img.filename}
              className={`bg-card border-2 rounded-xl overflow-hidden ${img.live ? "border-green-800/60" : "border-border"}`}
            >
              <a href={`/api/uploads/${img.filename}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={`/api/uploads/${img.filename}`}
                  alt={img.filename}
                  className="w-full aspect-square object-cover bg-muted"
                  loading="lazy"
                />
              </a>
              <div className="p-2 space-y-1.5">
                <p
                  className="text-[10px] font-mono text-muted-foreground truncate"
                  title={img.filename}
                >
                  {img.filename}
                </p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>{formatBytes(img.size)}</span>
                  {img.last_modified && (
                    <span title={img.last_modified}>{formatUploadDate(img.last_modified)}</span>
                  )}
                </div>
                {img.live ? (
                  <div className="flex flex-wrap gap-1">
                    {img.contexts.slice(0, 2).map((ctx) => (
                      <span
                        key={ctx}
                        className="text-[9px] font-bold bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded-full leading-none truncate max-w-full"
                        title={ctx}
                      >
                        {ctx}
                      </span>
                    ))}
                    {img.contexts.length > 2 && (
                      <span className="text-[9px] font-bold bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded-full leading-none">
                        +{img.contexts.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-block text-[9px] font-bold bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded-full leading-none">
                    Unlisted
                  </span>
                )}
                {img.live ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 font-bold text-xs mt-1"
                    onClick={() => handleForceDelete(img)}
                    disabled={forceDeleteImage.isPending}
                    title="This image is live — deleting it will break its placements"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Force Delete
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-destructive hover:text-destructive font-bold text-xs mt-1"
                    onClick={() => handleDelete(img.filename)}
                    disabled={deleteImage.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableRow({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NameListTab({
  title,
  singularLabel,
  items,
  isLoading,
  onCreate,
  onRename,
  onDelete,
  isPendingCreate,
  isPendingRename,
  isPendingDelete,
  sortable,
  onReorder,
}: {
  title: string;
  singularLabel: string;
  items: { id: number; name: string }[];
  isLoading: boolean;
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
  isPendingCreate: boolean;
  isPendingRename: boolean;
  isPendingDelete: boolean;
  sortable?: boolean;
  onReorder?: (ids: number[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => { setLocalItems(items); }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      onReorder?.(reordered.map((i) => i.id));
      return reordered;
    });
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
  };

  const startEdit = (id: number, name: string) => { setEditingId(id); setEditingName(name); };
  const cancelEdit = () => { setEditingId(null); setEditingName(""); };
  const saveEdit = () => {
    if (!editingName.trim() || editingId === null) return;
    onRename(editingId, editingName.trim());
    setEditingId(null);
    setEditingName("");
  };

  const displayItems = sortable ? localItems : items;

  const renderRow = (item: { id: number; name: string }) => (
    <div
      key={item.id}
      className="flex items-center justify-between p-3 bg-card border-2 border-border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
    >
      {editingId === item.id ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            autoFocus
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="flex-1 min-w-0 bg-background border-2 border-[#84C7D0] rounded-lg px-3 py-1 text-sm font-bold focus:outline-none"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#99CC66] hover:text-[#99CC66]" onClick={saveEdit} disabled={isPendingRename}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <span className="font-bold text-sm">{item.name}</span>
      )}
      {editingId !== item.id && (
        <div className="flex gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => startEdit(item.id, item.name)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            disabled={isPendingDelete}
            onClick={() => {
              if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
              onDelete(item.id, item.name);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <p className="font-bold uppercase text-xs tracking-wider mb-2">{`Add ${singularLabel}`}</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="border-2"
            placeholder={`${singularLabel} name`}
          />
        </div>
        <Button className="font-bold" onClick={handleAdd} disabled={isPendingCreate || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse font-bold">Loading {title.toLowerCase()}...</div>
      ) : displayItems.length === 0 ? (
        <p className="text-muted-foreground font-bold text-center py-8">No {title.toLowerCase()} yet.</p>
      ) : sortable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {displayItems.map((item) => (
                <SortableRow key={item.id} id={item.id}>
                  {renderRow(item)}
                </SortableRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => renderRow(item))}
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useGetCategories({ query: { queryKey: getGetCategoriesQueryKey() } });
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const reorder = useReorderCategories();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });

  return (
    <NameListTab
      title="Products"
      singularLabel="Product"
      items={categories}
      isLoading={isLoading}
      isPendingCreate={create.isPending}
      isPendingRename={rename.isPending}
      isPendingDelete={remove.isPending}
      sortable
      onReorder={(ids) =>
        reorder.mutate({ data: { ids } }, {
          onError: () => { toast({ title: "Reorder failed", variant: "destructive" }); invalidate(); },
        })
      }
      onCreate={(name) =>
        create.mutate({ data: { name } }, {
          onSuccess: () => { toast({ title: "Product category added" }); invalidate(); },
          onError: () => toast({ title: "Category already exists", variant: "destructive" }),
        })
      }
      onRename={(id, name) =>
        rename.mutate({ id, data: { name } }, {
          onSuccess: () => { toast({ title: "Category renamed" }); invalidate(); },
          onError: () => toast({ title: "Name already in use", variant: "destructive" }),
        })
      }
      onDelete={(id) =>
        remove.mutate({ id }, {
          onSuccess: () => { toast({ title: "Category deleted" }); invalidate(); },
          onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
        })
      }
    />
  );
}

function CitiesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cities = [], isLoading } = useGetCities({ query: { queryKey: getGetCitiesQueryKey() } });
  const create = useCreateCity();
  const rename = useRenameCity();
  const remove = useDeleteCity();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCitiesQueryKey() });

  return (
    <NameListTab
      title="Cities"
      singularLabel="City"
      items={cities}
      isLoading={isLoading}
      isPendingCreate={create.isPending}
      isPendingRename={rename.isPending}
      isPendingDelete={remove.isPending}
      onCreate={(name) =>
        create.mutate({ data: { name } }, {
          onSuccess: () => { toast({ title: "City added" }); invalidate(); },
          onError: () => toast({ title: "City already exists", variant: "destructive" }),
        })
      }
      onRename={(id, name) =>
        rename.mutate({ id, data: { name } }, {
          onSuccess: () => { toast({ title: "City renamed" }); invalidate(); },
          onError: () => toast({ title: "Name already in use", variant: "destructive" }),
        })
      }
      onDelete={(id) =>
        remove.mutate({ id }, {
          onSuccess: () => { toast({ title: "City deleted" }); invalidate(); },
          onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
        })
      }
    />
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "all", label: "All Listings", icon: Building },
  { id: "add-store", label: "Add Store", icon: MapPin },
  { id: "claims", label: "Claims", icon: Flag },
  { id: "brands", label: "Brands", icon: Tag },
  { id: "categories", label: "Products", icon: Briefcase },
  { id: "cities", label: "Cities", icon: MapPin },
  { id: "map-banner-d", label: "Map Banner · Desktop", icon: Monitor },
  { id: "map-banner-m", label: "Map Banner · Mobile", icon: Smartphone },
  { id: "map-popup-d", label: "Map Popup · Desktop", icon: Megaphone },
  { id: "map-popup-m", label: "Map Popup · Mobile", icon: Smartphone },
  { id: "dash-banner-d", label: "Dash Banner · Desktop", icon: Monitor },
  { id: "dash-banner-m", label: "Dash Banner · Mobile", icon: Smartphone },
  { id: "images", label: "Images", icon: Image },
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
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "cities" && <CitiesTab />}
        {activeTab === "map-banner-d" && <MapBannerDesktopTab />}
        {activeTab === "map-banner-m" && <MapBannerMobileTab />}
        {activeTab === "map-popup-d" && <MapPopupDesktopTab />}
        {activeTab === "map-popup-m" && <MapPopupMobileTab />}
        {activeTab === "dash-banner-d" && <DashBannerDesktopTab />}
        {activeTab === "dash-banner-m" && <DashBannerMobileTab />}
        {activeTab === "images" && <ImagesTab />}
      </div>
    </div>
  );
}
