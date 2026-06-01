import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetMe,
  useGetBrands,
  useCreateBusiness,
  useUpdateBusiness,
  useGetBusiness,
  useDeletePhoto,
  useDeleteCoupon,
  getGetOwnedBusinessesQueryKey,
  getGetBusinessQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Ticket,
  Loader2,
} from "lucide-react";

const ALL_CATEGORIES = [
  "Hemp Flower",
  "Edibles",
  "Topicals",
  "CBD Products",
  "Smoke Shop",
  "Vape Shop",
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Full address required"),
  phone: z.string().optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  hours: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).optional(),
  brand_ids: z.array(z.number()).optional(),
});
type FormData = z.infer<typeof schema>;

export default function AddEditBusiness() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const businessId = isEdit ? Number(params.id) : undefined;

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: brands = [] } = useGetBrands();
  const { data: existing } = useGetBusiness(businessId!, {
    query: {
      enabled: isEdit,
      queryKey: getGetBusinessQueryKey(businessId!),
    },
  });

  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const deletePhoto = useDeletePhoto();
  const deleteCoupon = useDeleteCoupon();

  const [uploading, setUploading] = useState<
    "logo" | "photo" | "coupon" | null
  >(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      website: "",
      hours: "",
      description: "",
      categories: [],
      brand_ids: [],
    },
  });

  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        address: existing.address,
        phone: existing.phone ?? "",
        website: existing.website ?? "",
        hours: existing.hours ?? "",
        description: existing.description ?? "",
        categories: existing.categories ?? [],
        brand_ids: existing.brands?.map((b) => b.id) ?? [],
      });
    }
  }, [existing, form]);

  const selectedCategories = form.watch("categories") ?? [];
  const selectedBrandIds = form.watch("brand_ids") ?? [];

  const toggleCategory = (cat: string) => {
    const current = form.getValues("categories") ?? [];
    form.setValue(
      "categories",
      current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat],
    );
  };

  const toggleBrand = (id: number) => {
    const current = form.getValues("brand_ids") ?? [];
    form.setValue(
      "brand_ids",
      current.includes(id)
        ? current.filter((b) => b !== id)
        : [...current, id],
    );
  };

  const onSubmit = (data: FormData) => {
    if (isEdit && businessId) {
      updateBusiness.mutate(
        { id: businessId, data },
        {
          onSuccess: () => {
            toast({ title: "Listing updated", description: "Changes saved." });
            queryClient.invalidateQueries({
              queryKey: getGetOwnedBusinessesQueryKey(),
            });
            setLocation("/dashboard");
          },
          onError: () => {
            toast({
              title: "Update failed",
              variant: "destructive",
            });
          },
        },
      );
    } else {
      createBusiness.mutate(
        { data },
        {
          onSuccess: () => {
            toast({
              title: "Listing submitted",
              description:
                "Your business has been submitted for review. We'll approve it within 1-2 business days.",
            });
            queryClient.invalidateQueries({
              queryKey: getGetOwnedBusinessesQueryKey(),
            });
            setLocation("/dashboard");
          },
          onError: () => {
            toast({ title: "Submission failed", variant: "destructive" });
          },
        },
      );
    }
  };

  const uploadFile = async (
    endpoint: string,
    field: string,
    file: File,
    extra?: Record<string, string>,
  ) => {
    const fd = new FormData();
    fd.append(field, file);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    }
    const res = await fetch(endpoint, { method: "POST", body: fd });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Upload failed");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading("logo");
    try {
      await uploadFile(
        `/api/businesses/${businessId}/logo`,
        "logo",
        e.target.files[0],
      );
      queryClient.invalidateQueries({
        queryKey: getGetBusinessQueryKey(businessId),
      });
      toast({ title: "Logo uploaded" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading("photo");
    try {
      await uploadFile(
        `/api/businesses/${businessId}/photos`,
        "photo",
        e.target.files[0],
      );
      queryClient.invalidateQueries({
        queryKey: getGetBusinessQueryKey(businessId),
      });
      toast({ title: "Photo uploaded" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleCouponUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading("coupon");
    try {
      await uploadFile(
        `/api/businesses/${businessId}/coupons`,
        "coupon",
        e.target.files[0],
      );
      queryClient.invalidateQueries({
        queryKey: getGetBusinessQueryKey(businessId),
      });
      toast({ title: "Coupon uploaded" });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const isPending = createBusiness.isPending || updateBusiness.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Link>

      <h1 className="text-4xl text-primary mb-2">
        {isEdit ? "Edit Listing" : "List Your Business"}
      </h1>
      <p className="text-muted-foreground font-medium mb-8">
        {isEdit
          ? "Update your business information."
          : "Fill in your details. Your listing will be reviewed before going live."}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">
                  Business Name *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="border-2 font-medium"
                    placeholder="Texas Hill Country Hemp Co."
                    data-testid="input-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">
                  Address *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="border-2 font-medium"
                    placeholder="123 Main St, Fredericksburg, TX 78624"
                    data-testid="input-address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">
                    Phone
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-2 font-medium"
                      placeholder="(830) 555-0100"
                      data-testid="input-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs tracking-wider">
                    Website
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-2 font-medium"
                      placeholder="https://yourbusiness.com"
                      data-testid="input-website"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">
                  Hours
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="border-2 font-medium"
                    rows={3}
                    placeholder={`Mon–Fri: 9am–7pm\nSat: 10am–6pm\nSun: Closed`}
                    data-testid="textarea-hours"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs tracking-wider">
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="border-2 font-medium"
                    rows={4}
                    placeholder="Tell customers what makes your shop special..."
                    data-testid="textarea-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categories */}
          <div>
            <p className="font-bold uppercase text-xs tracking-wider mb-3">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={
                    selectedCategories.includes(cat) ? "default" : "outline"
                  }
                  className={`cursor-pointer font-bold border-2 transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleCategory(cat)}
                  data-testid={`badge-cat-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Brands */}
          {brands.length > 0 && (
            <div>
              <p className="font-bold uppercase text-xs tracking-wider mb-3">
                Brands Carried
              </p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {brands.map((brand) => (
                  <Badge
                    key={brand.id}
                    variant={
                      selectedBrandIds.includes(brand.id)
                        ? "default"
                        : "outline"
                    }
                    className={`cursor-pointer font-bold border-2 transition-colors ${
                      selectedBrandIds.includes(brand.id)
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => toggleBrand(brand.id)}
                    data-testid={`badge-brand-${brand.id}`}
                  >
                    {brand.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full font-bold text-lg border-b-4 border-black/20"
            disabled={isPending}
            data-testid="button-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEdit ? "Saving..." : "Submitting..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Submit for Review"
            )}
          </Button>
        </form>
      </Form>

      {/* Upload section (only for edit) */}
      {isEdit && existing && (
        <div className="mt-10 space-y-8 border-t-2 border-border pt-8">
          <h2 className="text-2xl text-primary">Photos & Media</h2>

          {/* Logo */}
          <div>
            <p className="font-bold uppercase text-xs tracking-wider mb-3">
              Logo
            </p>
            {existing.logo_path && (
              <img
                src={`/api/uploads/${existing.logo_path}`}
                alt="Logo"
                className="w-24 h-24 object-cover rounded-xl border-2 border-border mb-3"
              />
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              className="border-2 font-bold"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
              data-testid="button-upload-logo"
            >
              {uploading === "logo" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {existing.logo_path ? "Replace Logo" : "Upload Logo"}
            </Button>
          </div>

          {/* Photos */}
          <div>
            <p className="font-bold uppercase text-xs tracking-wider mb-3">
              Photos{" "}
              <span className="normal-case font-medium text-muted-foreground">
                (max 6)
              </span>
            </p>
            {existing.photos && existing.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {existing.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border-2 border-border"
                    data-testid={`photo-${photo.id}`}
                  >
                    <img
                      src={`/api/uploads/${photo.photo_path}`}
                      alt="Photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        deletePhoto.mutate(
                          { id: businessId!, photoId: photo.id },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: getGetBusinessQueryKey(businessId!),
                              });
                              toast({ title: "Photo deleted" });
                            },
                          },
                        )
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-photo-${photo.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(!existing.photos || existing.photos.length < 6) && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  variant="outline"
                  className="border-2 font-bold"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading === "photo"}
                  data-testid="button-upload-photo"
                >
                  {uploading === "photo" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  Add Photo
                </Button>
              </>
            )}
          </div>

          {/* Coupons */}
          <div>
            <p className="font-bold uppercase text-xs tracking-wider mb-3">
              Coupons{" "}
              <span className="normal-case font-medium text-muted-foreground">
                (max 3)
              </span>
            </p>
            {existing.coupons && existing.coupons.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {existing.coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="relative group rounded-lg overflow-hidden border-2 border-dashed border-secondary/50"
                    data-testid={`coupon-${coupon.id}`}
                  >
                    <img
                      src={`/api/uploads/${coupon.image_path}`}
                      alt={coupon.title ?? "Coupon"}
                      className="w-full h-auto"
                    />
                    <button
                      onClick={() =>
                        deleteCoupon.mutate(
                          { id: businessId!, couponId: coupon.id },
                          {
                            onSuccess: () => {
                              queryClient.invalidateQueries({
                                queryKey: getGetBusinessQueryKey(businessId!),
                              });
                              toast({ title: "Coupon deleted" });
                            },
                          },
                        )
                      }
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-coupon-${coupon.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(!existing.coupons || existing.coupons.length < 3) && (
              <>
                <input
                  ref={couponInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCouponUpload}
                />
                <Button
                  variant="outline"
                  className="border-2 font-bold"
                  onClick={() => couponInputRef.current?.click()}
                  disabled={uploading === "coupon"}
                  data-testid="button-upload-coupon"
                >
                  {uploading === "coupon" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Ticket className="h-4 w-4 mr-2" />
                  )}
                  Add Coupon
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
