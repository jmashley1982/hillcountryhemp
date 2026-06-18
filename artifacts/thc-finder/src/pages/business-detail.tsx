import { useGetBusiness, useClaimBusiness, useVerifyClaimOtp } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Mail, Globe, Clock, Star, ArrowLeft, RefreshCw, Wind, ExternalLink, Ticket, Flag, Loader2, Pencil } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
import { Badge } from "@/components/ui/badge";
import { ALL_CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

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

type BrandWithLogo = { id: number; name: string; logo_path?: string | null; is_featured?: number };

export default function BusinessDetail() {
  const params = useParams<{ id: string }>();
  const { data: biz, isLoading, error } = useGetBusiness(Number(params.id));
  const { toast } = useToast();
  const claimBusiness = useClaimBusiness();
  const verifyOtp = useVerifyClaimOtp();
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [claimStep, setClaimStep] = useState<"idle" | "email" | "otp" | "document" | "done">("idle");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [doneStatus, setDoneStatus] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null));
  }, []);

  if (isLoading) {
    return <div className="p-12 text-center font-bold text-xl animate-pulse">Loading store details...</div>;
  }

  if (error || !biz) {
    return <div className="p-12 text-center font-bold text-xl text-destructive">Store not found.</div>;
  }

  const lastUpdated = (biz as { last_updated?: string }).last_updated;
  const onSiteSmokingArea = (biz as { on_site_smoking_area?: number }).on_site_smoking_area;
  const ownerId = (biz as { owner_id?: number | null }).owner_id;
  const isUnclaimed = ownerId == null;
  const showClaimSection = currentUser?.role === "business";

  const socialUrl = (handle: string | null | undefined, host: string) => {
    if (!handle) return null;
    if (/^https?:\/\//i.test(handle)) return handle;
    return `https://${host}/${handle.replace(/^@/, "")}`;
  };
  const instagram = socialUrl(
    (biz as { instagram?: string | null }).instagram,
    "instagram.com",
  );
  const facebook = socialUrl(
    (biz as { facebook?: string | null }).facebook,
    "facebook.com",
  );
  const googleReviewsUrl = (biz as { google_reviews_url?: string | null }).google_reviews_url;

  const handleInitiateClaim = () => {
    claimBusiness.mutate(
      { id: Number(params.id), data: { email: claimEmail.trim(), phone: claimPhone.trim() || undefined } },
      {
        onSuccess: (data) => {
          setDoneStatus("");
          if (data.method === "otp") {
            setClaimStep("otp");
          } else {
            setClaimStep("document");
          }
        },
        onError: (err: unknown) => {
          const resp = (err as { response?: { data?: { error?: string; status?: string; claimId?: number } } })?.response?.data;
          if (resp?.status === "AWAITING_OTP") { setClaimStep("otp"); }
          else if (resp?.status === "AWAITING_DOCUMENT") { setClaimStep("document"); }
          else { toast({ title: resp?.error ?? "Failed to initiate claim", variant: "destructive" }); }
        },
      },
    );
  };

  const handleVerifyOtp = () => {
    setOtpError("");
    verifyOtp.mutate(
      { id: Number(params.id), data: { code: otpCode.trim() } },
      {
        onSuccess: (data) => {
          setDoneStatus(data.status ?? "APPROVED");
          setClaimStep("done");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setOtpError(msg ?? "Invalid code. Please try again.");
        },
      },
    );
  };

  const handleDocUpload = async () => {
    if (!docFile) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("document", docFile);
      const r = await fetch(`/api/businesses/${params.id}/claim/upload-document`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string };
        toast({ title: body.error ?? "Upload failed", variant: "destructive" });
      } else {
        setDoneStatus("PENDING_MANUAL_REVIEW");
        setClaimStep("done");
      }
    } catch {
      toast({ title: "Upload failed. Please try again.", variant: "destructive" });
    } finally {
      setDocUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider hover:text-[#99CC66] mb-6 transition-colors text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Map
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl text-[#99CC66] mb-2 flex items-center gap-3">
                {biz.name}
                {biz.is_featured === 1 && <Star className="h-8 w-8 fill-[#D4AF37] text-[#D4AF37]" />}
              </h1>
              {isUnclaimed && (
                <button
                  onClick={() => document.getElementById("claim-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="inline-flex items-center gap-1.5 bg-orange-900/30 border border-orange-700/50 text-orange-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3 hover:bg-orange-900/50 transition-colors cursor-pointer"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Claim This Business
                </button>
              )}
              {(() => {
                const validCats = new Set(ALL_CATEGORIES);
                const cats = (biz.categories?.filter(cat => validCats.has(cat)) ?? []).sort((a, b) => a.localeCompare(b));
                return cats.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cats.map(cat => (
                      <Badge key={cat} className="bg-primary/20 text-[#99CC66] hover:bg-primary/30 font-bold border border-primary/40 rounded-full">{cat}</Badge>
                    ))}
                  </div>
                ) : null;
              })()}
              {currentUser?.role === "admin" && (
                <div className="mt-3">
                  <Link
                    href={`/dashboard/edit/${params.id}`}
                    className="inline-flex items-center gap-1.5 bg-[#84C7D0]/15 border border-[#84C7D0]/50 text-[#84C7D0] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full hover:bg-[#84C7D0]/25 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit Listing
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="prose prose-invert prose-lg">
            <p className="font-medium leading-relaxed text-foreground">{biz.description}</p>
          </div>

          {biz.photos && biz.photos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#99CC66]">Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {biz.photos.map(photo => (
                  <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden border-2 border-border shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
                    <img src={`/api/uploads/${photo.photo_path}`} alt="Store photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {biz.brands && biz.brands.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl text-[#99CC66]">Featured Brands</h3>
              <div className="flex flex-wrap gap-3">
                {[...(biz.brands as BrandWithLogo[])].sort((a, b) => (b.is_featured ?? 0) - (a.is_featured ?? 0) || a.name.localeCompare(b.name)).map(brand => (
                  <div
                    key={brand.id}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold border-2 shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all hover:border-[#99CC66]/50 ${
                      brand.is_featured
                        ? "bg-card border-[#D4AF37]/40"
                        : brand.logo_path ? "bg-card border-[#99CC66]/30" : "bg-card border-border"
                    }`}
                  >
                    {brand.logo_path && (
                      <img
                        src={`/api/uploads/${brand.logo_path}`}
                        alt={brand.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-[#99CC66]/40"
                      />
                    )}
                    <span className="text-sm">{brand.name}</span>
                    {!!brand.is_featured && (
                      <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37] shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 self-start sticky top-8">
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
            <h3 className="text-xl text-[#99CC66] mb-4 pb-3 border-b-2 border-border font-heading">Store Info</h3>

            {/* Action buttons */}
            <div className={`grid gap-3 mb-6 ${biz.phone ? "grid-cols-2" : "grid-cols-1"}`}>
              {biz.phone && (
                <a
                  href={`tel:${biz.phone}`}
                  className="flex items-center justify-center gap-2 bg-[#99CC66] hover:bg-[#88bb55] text-black font-black text-xs uppercase tracking-wide px-4 py-3.5 rounded-xl transition-colors shadow-md"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  Call
                </a>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(biz.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#84C7D0]/20 hover:bg-[#84C7D0]/30 border-2 border-[#84C7D0]/60 text-[#84C7D0] font-black text-xs uppercase tracking-wide px-4 py-3.5 rounded-xl transition-colors"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                Directions
              </a>
            </div>

            <div className="space-y-4 font-medium">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{biz.address}</span>
              </div>

              {biz.lat != null && biz.lng != null && (
                <div className="rounded-xl overflow-hidden border-2 border-border" style={{ height: "144px" }}>
                  <MapContainer
                    center={[biz.lat, biz.lng]}
                    zoom={15}
                    style={{ height: "144px", width: "100%" }}
                    scrollWheelZoom={false}
                    dragging={false}
                    zoomControl={false}
                    keyboard={false}
                    touchZoom={false}
                    doubleClickZoom={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[biz.lat, biz.lng]} />
                  </MapContainer>
                </div>
              )}

              {biz.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${biz.phone}`} className="hover:text-[#99CC66] transition-colors text-sm">{formatPhone(biz.phone)}</a>
                </div>
              )}

              {safeHref(biz.website) && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <a href={safeHref(biz.website)} target="_blank" rel="noopener noreferrer" className="hover:text-[#99CC66] transition-colors line-clamp-1 text-sm">{biz.website!.replace(/^https?:\/\//, "")}</a>
                </div>
              )}

              {(biz as { email?: string | null }).email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <a href={`mailto:${(biz as { email?: string | null }).email}`} className="hover:text-[#99CC66] transition-colors line-clamp-1 text-sm">{(biz as { email?: string | null }).email}</a>
                </div>
              )}

              {biz.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line text-sm">{biz.hours}</span>
                </div>
              )}

              {!!onSiteSmokingArea && (
                <div className="flex items-center gap-3 bg-[#84C7D0]/10 border border-[#84C7D0]/30 rounded-xl px-3 py-2">
                  <Wind className="h-4 w-4 text-[#84C7D0] shrink-0" />
                  <span className="text-xs font-bold text-[#84C7D0] uppercase tracking-wider">On-site smoking area</span>
                </div>
              )}

              {(instagram || facebook || googleReviewsUrl) && (
                <div className="pt-2 border-t border-border space-y-2">
                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-pink-500 hover:text-pink-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Instagram
                    </a>
                  )}
                  {facebook && (
                    <a
                      href={facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Facebook
                    </a>
                  )}
                  {safeGoogleReviewsUrl(googleReviewsUrl) && (
                    <a
                      href={safeGoogleReviewsUrl(googleReviewsUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#99CC66]/15 border border-[#99CC66]/40 text-sm font-bold text-[#99CC66] hover:bg-[#99CC66]/25 transition-colors"
                    >
                      <Star className="h-4 w-4 shrink-0 fill-[#99CC66]" />
                      Google Reviews
                    </a>
                  )}
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

          {(isUnclaimed || showClaimSection) && (
            <div id="claim-section" className="bg-orange-950/30 border-2 border-orange-700/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-orange-400 shrink-0" />
                <h3 className="font-heading text-lg text-orange-300">
                  {isUnclaimed ? "Is this your business?" : "Contest Ownership"}
                </h3>
              </div>

              {/* Idle — show start button */}
              {claimStep === "idle" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {isUnclaimed
                      ? "This listing hasn't been claimed yet. If you own this business, start a verification — we'll either send a code to your business email or ask for a supporting document."
                      : "Think you own this business? Start a verification to contest the current owner listing."}
                  </p>
                  {currentUser?.role === "business" ? (
                    <Button
                      className="w-full font-bold bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => setClaimStep("email")}
                      data-testid="button-claim-business"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {isUnclaimed ? "Claim This Business" : "Contest Ownership"}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <Link href="/login" className="text-[#99CC66] hover:underline font-bold">Log in</Link> with a business account to claim this listing.
                    </p>
                  )}
                </>
              )}

              {/* Step 1 — email + phone form */}
              {claimStep === "email" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Enter your business email. If it matches the business's domain we'll send a verification code; otherwise we'll ask for a supporting document.
                  </p>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Business Email *</label>
                    <input
                      type="email"
                      value={claimEmail}
                      onChange={(e) => setClaimEmail(e.target.value)}
                      placeholder="owner@yourbusiness.com"
                      className="w-full bg-background border-2 border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#99CC66]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Phone (optional)</label>
                    <input
                      type="tel"
                      value={claimPhone}
                      onChange={(e) => setClaimPhone(e.target.value)}
                      placeholder="(555) 555-5555"
                      className="w-full bg-background border-2 border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#99CC66]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 font-bold bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={handleInitiateClaim}
                      disabled={claimBusiness.isPending || !claimEmail.trim()}
                    >
                      {claimBusiness.isPending
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                        : "Continue"}
                    </Button>
                    <Button variant="outline" onClick={() => setClaimStep("idle")} disabled={claimBusiness.isPending}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Step 2a — OTP entry */}
              {claimStep === "otp" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A 6-digit verification code was sent to <strong className="text-foreground">{claimEmail}</strong>. Enter it below — it expires in 15 minutes.
                  </p>
                  {otpError && (
                    <p className="text-sm font-bold text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">{otpError}</p>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-2xl font-mono bg-background border-2 border-border rounded-xl px-3 py-3 focus:outline-none focus:border-[#99CC66] tracking-[0.5em]"
                    data-testid="otp-input"
                  />
                  <Button
                    className="w-full font-bold bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtp.isPending || otpCode.length !== 6}
                  >
                    {verifyOtp.isPending
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                      : "Verify Code"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the code? Check your spam folder or{" "}
                    <button className="text-[#99CC66] hover:underline font-bold" onClick={() => setClaimStep("email")}>go back</button>{" "}
                    to re-enter your email.
                  </p>
                </div>
              )}

              {/* Step 2b — document upload */}
              {claimStep === "document" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your email domain doesn't match this business's website. Please upload a document proving ownership — a business license, utility bill, or official correspondence showing your name and business address.
                  </p>
                  <div className="border-2 border-dashed border-orange-700/40 rounded-xl p-4 text-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="claim-doc-input"
                    />
                    <label htmlFor="claim-doc-input" className="cursor-pointer block">
                      {docFile ? (
                        <span className="text-sm font-bold text-[#99CC66]">
                          {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : (
                        <>
                          <div className="text-2xl mb-1">📎</div>
                          <div className="text-sm font-bold text-muted-foreground">Tap to choose a file</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Image or PDF · max 5 MB</div>
                        </>
                      )}
                    </label>
                  </div>
                  <Button
                    className="w-full font-bold bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={handleDocUpload}
                    disabled={!docFile || docUploading}
                  >
                    {docUploading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                      : "Submit Document"}
                  </Button>
                </div>
              )}

              {/* Step 3 — done */}
              {claimStep === "done" && (
                <div className="space-y-2">
                  {doneStatus === "APPROVED" && (
                    <div className="flex items-center gap-2 text-sm font-bold text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Ownership verified — this business is now linked to your account.
                    </div>
                  )}
                  {doneStatus === "PENDING_OWNER_REVIEW" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-orange-300">
                        <CheckCircle className="h-4 w-4" />
                        Identity verified
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The current owner has been notified and has 72 hours to respond. An admin will reach out once the review is complete.
                      </p>
                    </div>
                  )}
                  {(doneStatus === "PENDING_MANUAL_REVIEW" || (!["APPROVED","PENDING_OWNER_REVIEW"].includes(doneStatus) && doneStatus)) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-orange-300">
                        <CheckCircle className="h-4 w-4" />
                        Document received
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Our team will review your document and reach out within 2–3 business days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {biz.coupons && biz.coupons.length > 0 && (
            <div className="bg-[#99CC66]/10 border-2 border-[#99CC66]/40 rounded-2xl p-6">
              <h3 className="text-xl mb-4 text-[#99CC66] font-heading">Exclusive Deals</h3>
              <div className="space-y-4">
                {biz.coupons.map(coupon => (
                  coupon.image_path.toLowerCase().endsWith('.pdf') ? (
                    <a
                      key={coupon.id}
                      href={`/api/uploads/${coupon.image_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-card rounded-xl border-2 border-dashed border-[#99CC66]/40 p-4 hover:border-[#99CC66] transition-colors"
                    >
                      <Ticket className="h-7 w-7 text-[#FE4A49] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{coupon.title || 'PDF Coupon'}</p>
                        <p className="text-xs text-muted-foreground">Tap to view PDF</p>
                      </div>
                    </a>
                  ) : (
                  <div key={coupon.id} className="bg-card rounded-xl overflow-hidden border-2 border-dashed border-[#99CC66]/40 relative group cursor-pointer hover:border-[#99CC66] transition-colors">
                    <img src={`/api/uploads/${coupon.image_path}`} alt={coupon.title || 'Coupon'} className="w-full h-auto" />
                    {coupon.title && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white p-2 text-center font-bold text-sm">
                        {coupon.title}
                      </div>
                    )}
                  </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
