import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetBanner, useGetB2bBanner, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import logoUrl from "@assets/magnific_a-logo-for-an-app-called-_TeJK7kKVNR_1780364254574.png";

const DASHBOARD_ROUTES = ["/dashboard", "/add-business", "/admin"];

function BannerSlot({ imagePath, mobileImagePath, linkUrl, mobileLinkUrl, linkOpensNewTab, brandFilter }: {
  imagePath: string | null | undefined;
  mobileImagePath: string | null | undefined;
  linkUrl: string | null | undefined;
  mobileLinkUrl: string | null | undefined;
  linkOpensNewTab?: number | null;
  brandFilter?: string | null;
}) {
  const [, setLocation] = useLocation();

  const hasDesktop = !!imagePath;
  const hasMobile = !!mobileImagePath;
  if (!hasDesktop && !hasMobile) return null;

  const newTab = linkOpensNewTab !== 0;
  const imgClass = "w-full h-auto block opacity-90 hover:opacity-100 transition-opacity";
  const brandPath = brandFilter ? `/?brand=${encodeURIComponent(brandFilter)}` : null;
  const onBrand = brandPath
    ? (e: React.MouseEvent) => { e.preventDefault(); setLocation(brandPath); }
    : undefined;

  if (hasDesktop && hasMobile) {
    return (
      <>
        <a href={brandPath || linkUrl || "#"} onClick={onBrand} className="hidden md:block w-full bg-black"
          target={!brandFilter && linkUrl && newTab ? "_blank" : undefined} rel="noopener noreferrer" data-testid="banner-ad-desktop">
          <img src={`/api/uploads/${imagePath}`} alt="Advertisement" className={imgClass} />
        </a>
        <a href={brandPath || mobileLinkUrl || linkUrl || "#"} onClick={onBrand} className="block md:hidden w-full bg-black"
          target={!brandFilter && (mobileLinkUrl || linkUrl) && newTab ? "_blank" : undefined} rel="noopener noreferrer" data-testid="banner-ad-mobile">
          <img src={`/api/uploads/${mobileImagePath}`} alt="Advertisement" className={imgClass} />
        </a>
      </>
    );
  }

  const src = imagePath ?? mobileImagePath!;
  const href = brandPath || (imagePath ? linkUrl : mobileLinkUrl) || "#";
  const hasLink = !!(brandFilter || (imagePath ? linkUrl : mobileLinkUrl));
  return (
    <a href={href} onClick={onBrand} className="block w-full bg-black"
      target={!brandFilter && hasLink && newTab ? "_blank" : undefined} rel="noopener noreferrer" data-testid="banner-ad">
      <img src={`/api/uploads/${src}`} alt="Advertisement" className={imgClass} />
    </a>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const { data: banner } = useGetBanner();
  const { data: dashBanner } = useGetB2bBanner();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboardRoute = DASHBOARD_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/"),
  );

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), undefined);
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Top banner — route-aware: dashboard banner on business/admin pages, main banner everywhere else */}
      {isDashboardRoute ? (
        <BannerSlot
          imagePath={dashBanner?.image_path}
          mobileImagePath={dashBanner?.mobile_image_path}
          linkUrl={dashBanner?.link_url}
          mobileLinkUrl={dashBanner?.mobile_link_url}
          linkOpensNewTab={dashBanner?.link_opens_new_tab}
        />
      ) : (
        <BannerSlot
          imagePath={banner?.image_path}
          mobileImagePath={banner?.mobile_image_path}
          linkUrl={banner?.link_url}
          mobileLinkUrl={banner?.mobile_link_url}
          linkOpensNewTab={banner?.link_opens_new_tab}
          brandFilter={banner?.brand_filter}
        />
      )}

      {/* Navbar — iron-grey brand gradient */}
      <header className="sticky top-0 z-50 w-full border-b border-border shadow-lg"
        style={{ background: "linear-gradient(135deg, #1a2226 0%, #2c3a40 45%, #0a1012 100%)" }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center group shrink-0">
            <img
              src={logoUrl}
              alt="Texas Hill Country Hemp Finder"
              className="h-[56px] w-auto group-hover:opacity-90 transition-opacity"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-bold uppercase tracking-wider text-white/80 hover:text-[#99CC66] transition-colors">Find Shops</Link>
            <Link href="/advertise" className="text-sm font-bold uppercase tracking-wider text-white/80 hover:text-[#99CC66] transition-colors">Advertise</Link>

            <div className="h-6 w-px bg-white/20 mx-2" />

            {!isLoading && (
              user ? (
                <div className="flex items-center gap-4">
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                    <Button variant="outline" className="font-bold border-2 border-[#99CC66]/50 text-[#99CC66] bg-transparent hover:bg-[#99CC66]/10 hover:border-[#99CC66]">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-white/60 hover:text-white">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-bold uppercase text-white/80 hover:text-[#99CC66] transition-colors">Login</Link>
                  <Link href="/register">
                    <span className="relative inline-block">
                      <Button className="bg-[#99CC66] hover:bg-[#82B54F] text-black font-bold shadow-md">List Your Business</Button>
                      <span className="absolute -top-2.5 -right-2.5 bg-[#FE4A49] text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shadow-md rotate-12 leading-none pointer-events-none select-none">FREE!</span>
                    </span>
                  </Link>
                </div>
              )
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-[#111] p-4 flex flex-col gap-4 absolute top-16 left-0 right-0 z-[1100] shadow-xl">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold uppercase tracking-wider block p-2 text-white">Find Shops</Link>
          <Link href="/advertise" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold uppercase tracking-wider block p-2 text-white">Advertise</Link>
          <hr className="border-border" />
          {!isLoading && (
            user ? (
              <>
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-start font-bold border-2 border-[#99CC66]/50 text-[#99CC66] bg-transparent hover:bg-[#99CC66]/10" variant="outline">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full font-bold border-2">Login</Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <span className="relative inline-block w-full">
                    <Button className="w-full font-bold bg-[#99CC66] text-black hover:bg-[#82B54F]">List Your Business</Button>
                    <span className="absolute -top-2.5 -right-2.5 bg-[#FE4A49] text-white text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full shadow-md rotate-12 leading-none pointer-events-none select-none">FREE!</span>
                  </span>
                </Link>
              </>
            )
          )}
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {children}
      </main>

      <footer className="border-t border-border/50 bg-[#0d1518] py-4 px-6 shrink-0">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Texas Hill Country Hemp Finder. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#99CC66] transition-colors font-bold uppercase tracking-wider">Privacy</Link>
            <Link href="/terms" className="hover:text-[#99CC66] transition-colors font-bold uppercase tracking-wider">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
