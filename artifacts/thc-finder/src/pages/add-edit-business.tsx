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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Ticket,
  Loader2,
} from "lucide-react";

const ALL_CATEGORIES = [
  "Flower",
  "Pre-Rolls",
  "Concentrates",
  "Edibles",
  "Drinks",
  "Topicals",
  "CBD Products",
  "Bongs/Pipes",
  "Cones/Papers",
  "Lighters/Torches",
  "Batteries/E-Devices",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayHours = { day: string; closed: boolean; open: string; close: string };

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hour12}:${m === 0 ? "00" : "30"} ${period}`);
    }
  }
  return out;
})();

function defaultHours(): DayHours[] {
  return DAYS.map((d) => ({
    day: d,
    closed: d === "Sunday",
    open: "9:00 AM",
    close: "7:00 PM",
  }));
}

function parseHoursJson(raw: string | null | undefined): DayHours[] {
  if (!raw) return defaultHours();
  try {
    const parsed = JSON.parse(raw) as DayHours[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultHours();
    return DAYS.map((d) => {
      const entry = parsed.find((p) => p.day === d);
      return entry
        ? {
            day: d,
            closed: !!entry.closed,
            open: entry.open || "9:00 AM",
            close: entry.close || "7:00 PM",
          }
        : { day: d, closed: false, open: "9:00 AM", close: "7:00 PM" };
    });
  } catch {
    return defaultHours();
  }
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  street: z.string().min(3, "Street address required"),
  city: z.string().min(2, "City required"),
  state: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Use the 2-letter state code (e.g. TX)"),
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.replace(/\D/g, "").length === 10,
      "Enter a 10-digit phone number",
    ),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  description: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  google_reviews_url: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
  categories: z.array(z.string()).optional(),
  brand_ids: z.array(z.number()).optional(),
  on_site_smoking_area: z.boolean().optional(),
  owner_authorized: z.boolean().optional(),
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
      street: "",
      city: "",
      state: "TX",
      zip: "",
      phone: "",
      website: "",
      description: "",
      instagram: "",
      facebook: "",
      google_reviews_url: "",
      categories: [],
      brand_ids: [],
      on_site_smoking_area: false,
      owner_authorized: false,
    },
  });

  const [hoursState, setHoursState] = useState<DayHours[]>(defaultHours());
  const [legacyHoursWarning, setLegacyHoursWarning] = useState(false);

  const updateDayHours = (
    day: string,
    patch: Partial<Omit<DayHours, "day">>,
  ) => {
    setHoursState((prev) =>
      prev.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    );
  };

  useEffect(() => {
    if (!userLoading && !user) setLocation("/login");
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (existing) {
      const ext = existing as typeof existing & {
        instagram?: string | null;
        facebook?: string | null;
        google_reviews_url?: string | null;
        street?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        hours_json?: string | null;
      };
      form.reset({
        name: existing.name,
        street: ext.street ?? (ext.street == null ? existing.address : ""),
        city: ext.city ?? "",
        state: ext.state ?? "TX",
        zip: ext.zip ?? "",
        phone: existing.phone ? formatPhoneInput(existing.phone) : "",
        website: existing.website ?? "",
        description: existing.description ?? "",
        instagram: ext.instagram ?? "",
        facebook: ext.facebook ?? "",
        google_reviews_url: ext.google_reviews_url ?? "",
        categories: existing.categories ?? [],
        brand_ids: existing.brands?.map((b) => b.id) ?? [],
        on_site_smoking_area: !!(existing as { on_site_smoking_area?: number }).on_site_smoking_area,
      });
      setHoursState(parseHoursJson(ext.hours_json));
      setLegacyHoursWarning(!ext.hours_json && !!existing.hours);
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
    if (!isEdit && !data.owner_authorized) {
      form.setError("owner_authorized", {
        type: "manual",
        message: "You must confirm you are the owner or authorized representative.",
      });
      return;
    }

    const payload = { ...data, hours_json: JSON.stringify(hoursState) };
    if (isEdit && businessId) {
      updateBusiness.mutate(
        { id: businessId, data: payload },
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
        { data: payload },
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
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { error?: string } } })?.response
                ?.data?.error ?? "Submission failed";
            toast({ title: msg, variant: "destructive" });
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-[#99CC66] mb-6 transition-colors text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Link>

        <h1 className="text-4xl text-[#99CC66] mb-2">
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

            <div className="space-y-4 p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <p className="font-bold uppercase text-xs tracking-wider">
                Address *
              </p>
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                      Street Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-2 font-medium"
                        placeholder="123 Main St"
                        data-testid="input-street"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                          City
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-2 font-medium"
                            placeholder="Fredericksburg"
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                          State
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            maxLength={2}
                            className="border-2 font-medium uppercase"
                            placeholder="TX"
                            data-testid="input-state"
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                          ZIP
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="numeric"
                            maxLength={5}
                            className="border-2 font-medium"
                            placeholder="78624"
                            data-testid="input-zip"
                            onChange={(e) =>
                              field.onChange(
                                e.target.value.replace(/\D/g, "").slice(0, 5),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

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
                        inputMode="tel"
                        className="border-2 font-medium"
                        placeholder="(830) 555-0100"
                        data-testid="input-phone"
                        onChange={(e) =>
                          field.onChange(formatPhoneInput(e.target.value))
                        }
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

            {/* Hours */}
            <div className="space-y-3 p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <p className="font-bold uppercase text-xs tracking-wider">
                Business Hours
              </p>
              {legacyHoursWarning && (
                <p
                  className="text-xs font-medium text-[#FE4A49] bg-[#FE4A49]/10 border border-[#FE4A49]/30 rounded-lg px-3 py-2"
                  data-testid="text-legacy-hours-warning"
                >
                  Please review and set your hours for each day below before
                  saving — your previous hours need to be re-entered in this new
                  format.
                </p>
              )}
              <div className="space-y-2">
                {hoursState.map((d) => (
                  <div
                    key={d.day}
                    className="grid grid-cols-12 items-center gap-2"
                    data-testid={`hours-row-${d.day.toLowerCase()}`}
                  >
                    <span className="col-span-4 sm:col-span-3 text-sm font-bold">
                      {d.day}
                    </span>
                    {d.closed ? (
                      <span className="col-span-5 sm:col-span-6 text-sm font-medium text-muted-foreground">
                        Closed
                      </span>
                    ) : (
                      <div className="col-span-5 sm:col-span-6 flex items-center gap-1.5">
                        <select
                          value={d.open}
                          onChange={(e) =>
                            updateDayHours(d.day, { open: e.target.value })
                          }
                          className="flex-1 min-w-0 border-2 border-border rounded-lg bg-background px-2 py-1.5 text-xs font-medium"
                          data-testid={`select-open-${d.day.toLowerCase()}`}
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-muted-foreground">to</span>
                        <select
                          value={d.close}
                          onChange={(e) =>
                            updateDayHours(d.day, { close: e.target.value })
                          }
                          className="flex-1 min-w-0 border-2 border-border rounded-lg bg-background px-2 py-1.5 text-xs font-medium"
                          data-testid={`select-close-${d.day.toLowerCase()}`}
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <label className="col-span-3 flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.closed}
                        onChange={(e) =>
                          updateDayHours(d.day, { closed: e.target.checked })
                        }
                        className="w-4 h-4 rounded accent-[#FE4A49] cursor-pointer"
                        data-testid={`checkbox-closed-${d.day.toLowerCase()}`}
                      />
                      Closed
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4 p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <p className="font-bold uppercase text-xs tracking-wider">Social & Reviews</p>
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                      Instagram
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center border-2 border-border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                        <span className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50 whitespace-nowrap">
                          instagram.com/
                        </span>
                        <input
                          {...field}
                          className="flex-1 min-w-0 px-3 py-2 text-sm font-medium bg-transparent outline-none"
                          placeholder="yourshop"
                          data-testid="input-instagram"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                      Facebook
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center border-2 border-border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                        <span className="px-3 py-2 text-sm font-medium text-muted-foreground bg-muted/50 whitespace-nowrap">
                          facebook.com/
                        </span>
                        <input
                          {...field}
                          className="flex-1 min-w-0 px-3 py-2 text-sm font-medium bg-transparent outline-none"
                          placeholder="yourshop"
                          data-testid="input-facebook"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="google_reviews_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold uppercase text-xs tracking-wider text-muted-foreground">
                      Google Reviews URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-2 font-medium"
                        placeholder="https://g.page/r/yourshop/review"
                        data-testid="input-google-reviews"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      placeholder="Tell customers what makes your store special..."
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* On-site smoking area */}
            <div className="flex items-center gap-3 p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
              <input
                type="checkbox"
                id="on_site_smoking_area"
                className="w-5 h-5 rounded accent-[#84C7D0] cursor-pointer"
                checked={form.watch("on_site_smoking_area") ?? false}
                onChange={(e) => form.setValue("on_site_smoking_area", e.target.checked)}
                data-testid="checkbox-smoking-area"
              />
              <label htmlFor="on_site_smoking_area" className="cursor-pointer">
                <p className="font-bold uppercase text-xs tracking-wider text-foreground">On-Site Smoking Area</p>
                <p className="text-xs text-muted-foreground mt-0.5">Check this if your store has a designated area for customers to smoke on-premises.</p>
              </label>
            </div>

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
                    className={`cursor-pointer font-bold border-2 rounded-full transition-all ${
                      selectedCategories.includes(cat)
                        ? "bg-[#84C7D0] text-black border-[#84C7D0]"
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
                      className={`cursor-pointer font-bold border-2 rounded-full transition-all ${
                        selectedBrandIds.includes(brand.id)
                          ? "bg-[#99CC66] text-black border-[#99CC66]"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleBrand(brand.id)}
                      data-testid={`badge-brand-${brand.id}`}
                    >
                      {(brand as { logo_path?: string | null }).logo_path && (
                        <img
                          src={`/api/uploads/${(brand as { logo_path?: string | null }).logo_path}`}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover mr-1 inline-block"
                        />
                      )}
                      {brand.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!isEdit && (
              <FormField
                control={form.control}
                name="owner_authorized"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 p-4 bg-card border-2 border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-owner-authorized"
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-bold text-sm cursor-pointer">
                        I confirm that I am the owner of this business, or am authorized to manage this listing on behalf of the owner.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full font-bold text-lg border-b-4 border-black/20 bg-primary hover:bg-primary/90"
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
            <h2 className="text-2xl text-[#99CC66]">Photos & Media</h2>

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
              <p className="font-bold uppercase text-xs tracking-wider mb-1">
                Photos{" "}
                <span className="normal-case font-medium text-muted-foreground">
                  (up to 3)
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
              {(!existing.photos || existing.photos.length < 3) && (
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
                      className="relative group rounded-lg overflow-hidden border-2 border-dashed border-[#99CC66]/50"
                      data-testid={`coupon-${coupon.id}`}
                    >
                      {coupon.image_path.toLowerCase().endsWith(".pdf") ? (
                        <a
                          href={`/api/uploads/${coupon.image_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-2 p-6 bg-muted/40 text-center min-h-[120px]"
                        >
                          <Ticket className="h-8 w-8 text-[#FE4A49]" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {coupon.title ?? "PDF Coupon"}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            View PDF
                          </span>
                        </a>
                      ) : (
                        <img
                          src={`/api/uploads/${coupon.image_path}`}
                          alt={coupon.title ?? "Coupon"}
                          className="w-full h-auto"
                        />
                      )}
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
                    accept="image/*,application/pdf"
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
    </div>
  );
}
