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
import { useLocation, Link } from "wouter";
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
} from "lucide-react";

type Tab = "pending" | "all" | "brands" | "banner" | "popup";

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
                queryClient.invalidateQueries({
                  queryKey: getGetPendingBusinessesQueryKey(),
                });
                queryClient.invalidateQueries({
                  queryKey: getGetAllBusinessesQueryKey(),
                });
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
            {reject.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Confirm Reject"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="font-bold"
            onClick={onDone}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

function BusinessCard({
  biz,
  showApprove,
}: {
  biz: {
    id: number;
    name: string;
    address: string;
    owner_email: string;
    status: string;
    is_featured: number;
    phone?: string | null;
    website?: string | null;
    description?: string | null;
  };
  showApprove: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const approve = useApproveBusiness();
  const toggleFeature = useToggleFeatureBusiness();
  const deleteBiz = useDeleteBusiness();
  const [showReject, setShowReject] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: getGetPendingBusinessesQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getGetAllBusinessesQueryKey(),
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div
      className="bg-card border-2 border-border rounded-xl p-5"
      data-testid={`admin-card-${biz.id}`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-xl text-primary">{biz.name}</h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[biz.status] ?? "bg-gray-100 text-gray-800"}`}
            >
              {biz.status}
            </span>
            {biz.is_featured === 1 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                Featured
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {biz.address}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Owner: {biz.owner_email}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showApprove && (
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white font-bold"
              onClick={() =>
                approve.mutate(
                  { id: biz.id },
                  {
                    onSuccess: () => {
                      toast({ title: "Approved" });
                      invalidateAll();
                    },
                  },
                )
              }
              disabled={approve.isPending}
              data-testid={`button-approve-${biz.id}`}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          )}

          {!showReject ? (
            <Button
              size="sm"
              variant="destructive"
              className="font-bold"
              onClick={() => setShowReject(true)}
              data-testid={`button-reject-${biz.id}`}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            className={`font-bold border-2 ${biz.is_featured === 1 ? "border-yellow-400 text-yellow-700" : ""}`}
            onClick={() =>
              toggleFeature.mutate(
                { id: biz.id },
                {
                  onSuccess: () => {
                    toast({
                      title:
                        biz.is_featured === 1
                          ? "Removed from featured"
                          : "Marked as featured",
                    });
                    invalidateAll();
                  },
                },
              )
            }
            data-testid={`button-feature-${biz.id}`}
          >
            <Star
              className={`h-3.5 w-3.5 mr-1 ${biz.is_featured === 1 ? "fill-yellow-500 text-yellow-500" : ""}`}
            />
            {biz.is_featured === 1 ? "Unfeature" : "Feature"}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="font-bold text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirm(`Delete "${biz.name}"?`)) return;
              deleteBiz.mutate(
                { id: biz.id },
                {
                  onSuccess: () => {
                    toast({ title: "Deleted" });
                    invalidateAll();
                  },
                },
              );
            }}
            data-testid={`button-delete-${biz.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showReject && (
        <RejectDialog businessId={biz.id} onDone={() => setShowReject(false)} />
      )}
    </div>
  );
}

function PendingTab() {
  const { data: pending = [], isLoading } = useGetPendingBusinesses({
    query: { queryKey: getGetPendingBusinessesQueryKey() },
  });
  if (isLoading)
    return (
      <div className="p-8 text-center font-bold animate-pulse">Loading...</div>
    );
  if (pending.length === 0)
    return (
      <div className="p-8 text-center text-muted-foreground font-bold">
        No pending submissions.
      </div>
    );
  return (
    <div className="space-y-4">
      {pending.map((b) => (
        <BusinessCard key={b.id} biz={b} showApprove />
      ))}
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
      b.owner_email.toLowerCase().includes(search.toLowerCase()),
  );
  if (isLoading)
    return (
      <div className="p-8 text-center font-bold animate-pulse">Loading...</div>
    );
  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or owner..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border-2"
        data-testid="input-search-businesses"
      />
      <p className="text-sm font-bold text-muted-foreground">
        {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
      </p>
      {filtered.map((b) => (
        <BusinessCard
          key={b.id}
          biz={b}
          showApprove={b.status === "pending"}
        />
      ))}
    </div>
  );
}

function BrandsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands = [], isLoading } = useGetBrands({
    query: { queryKey: getGetBrandsQueryKey() },
  });
  const createBrand = useCreateBrand();
  const deleteBrand = useDeleteBrand();
  const toggleFeature = useToggleFeatureBrand();

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
        onError: () => {
          toast({
            title: "Brand already exists",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onAddBrand)}
          className="flex gap-3 items-end"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="font-bold uppercase text-xs tracking-wider">
                  Add Brand
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="border-2"
                    placeholder="Brand name"
                    data-testid="input-brand-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="font-bold"
            disabled={createBrand.isPending}
            data-testid="button-add-brand"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </form>
      </Form>

      {isLoading ? (
        <div className="animate-pulse font-bold">Loading brands...</div>
      ) : (
        <div className="space-y-2">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center justify-between p-4 bg-card border-2 border-border rounded-xl"
              data-testid={`brand-row-${brand.id}`}
            >
              <span className="font-bold text-lg">
                {brand.name}
                {brand.is_featured === 1 && (
                  <Star className="inline h-4 w-4 ml-2 fill-yellow-500 text-yellow-500" />
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`font-bold border-2 ${brand.is_featured === 1 ? "border-yellow-400 text-yellow-700" : ""}`}
                  onClick={() =>
                    toggleFeature.mutate(
                      { id: brand.id },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries({
                            queryKey: getGetBrandsQueryKey(),
                          });
                          toast({
                            title:
                              brand.is_featured === 1
                                ? "Unfeatured"
                                : "Featured",
                          });
                        },
                      },
                    )
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
                    deleteBrand.mutate(
                      { id: brand.id },
                      {
                        onSuccess: () => {
                          toast({ title: "Deleted" });
                          queryClient.invalidateQueries({
                            queryKey: getGetBrandsQueryKey(),
                          });
                        },
                      },
                    );
                  }}
                  data-testid={`button-delete-brand-${brand.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
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
  onSuccess,
}: {
  label: string;
  endpoint: string;
  field: string;
  currentImage?: string | null;
  currentLink?: string | null;
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
      if (endpoint.includes("popup")) fd.append("is_active", String(isActive));
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
      if (endpoint.includes("popup")) fd.append("is_active", String(isActive));
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
        <div className="border-2 border-border rounded-xl overflow-hidden max-w-lg">
          <img
            src={`/api/uploads/${currentImage}`}
            alt={label}
            className="w-full h-auto"
          />
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="border-2 flex-1"
          placeholder="https://link-url.com"
          data-testid={`input-${field}-link`}
        />
        {endpoint.includes("popup") && (
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={upload}
        />
        <Button
          className="font-bold"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          data-testid={`button-upload-${field}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {currentImage ? "Replace Image" : "Upload Image"}
        </Button>
      </div>
    </div>
  );
}

function BannerTab() {
  const queryClient = useQueryClient();
  const { data: banner, isLoading } = useGetBanner({
    query: { queryKey: getGetBannerQueryKey() },
  });
  if (isLoading)
    return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <AdUploader
      label="Banner Ad"
      endpoint="/api/admin/banner"
      field="banner"
      currentImage={banner?.image_path ?? null}
      currentLink={banner?.link_url ?? null}
      onSuccess={() =>
        queryClient.invalidateQueries({ queryKey: getGetBannerQueryKey() })
      }
    />
  );
}

function PopupTab() {
  const queryClient = useQueryClient();
  const { data: popup, isLoading } = useGetAdminPopup({
    query: { queryKey: getGetAdminPopupQueryKey() },
  });
  if (isLoading)
    return <div className="animate-pulse font-bold p-4">Loading...</div>;
  return (
    <AdUploader
      label="Popup Ad"
      endpoint="/api/admin/popup"
      field="image"
      currentImage={popup?.image_path ?? null}
      currentLink={popup?.link_url ?? null}
      onSuccess={() =>
        queryClient.invalidateQueries({
          queryKey: getGetAdminPopupQueryKey(),
        })
      }
    />
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "pending", label: "Pending", icon: Clock },
  { id: "all", label: "All Listings", icon: Building },
  { id: "brands", label: "Brands", icon: Tag },
  { id: "banner", label: "Banner Ad", icon: Image },
  { id: "popup", label: "Popup Ad", icon: Megaphone },
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

  if (userLoading)
    return (
      <div className="p-12 text-center font-bold animate-pulse">
        Loading...
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl text-primary">Admin Panel</h1>
        <p className="text-muted-foreground font-bold mt-1">
          {user?.email} — Super Admin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-border pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider border-2 transition-all ${
              activeTab === id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary hover:text-primary"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "all" && <AllBusinessesTab />}
        {activeTab === "brands" && <BrandsTab />}
        {activeTab === "banner" && <BannerTab />}
        {activeTab === "popup" && <PopupTab />}
      </div>
    </div>
  );
}
