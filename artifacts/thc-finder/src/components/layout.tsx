import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetBanner } from "@workspace/api-client-react";
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import logoUrl from "@assets/magnific_a-logo-for-an-app-called-_TeJK7kKVNR_1780364254574.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const { data: banner } = useGetBanner();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      {/* Top banner — above everything */}
      {banner?.image_path && (
        <a
          href={banner.link_url || "#"}
          className="block w-full bg-black"
          target={banner.link_url ? "_blank" : undefined}
          rel="noopener noreferrer"
          data-testid="banner-ad"
        >
          <img
            src={`/api/uploads/${banner.image_path}`}
            alt="Advertisement"
            className="w-full h-auto block opacity-90 hover:opacity-100 transition-opacity"
          />
        </a>
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
              className="h-[51px] w-auto group-hover:opacity-90 transition-opacity"
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
                    <Button className="bg-[#99CC66] hover:bg-[#82B54F] text-black font-bold shadow-md">List Your Business</Button>
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
        <div className="md:hidden border-b border-border bg-[#111] p-4 flex flex-col gap-4 absolute top-16 left-0 right-0 z-40 shadow-xl">
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
                  <Button className="w-full font-bold bg-[#99CC66] text-black hover:bg-[#82B54F]">List Your Business</Button>
                </Link>
              </>
            )
          )}
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
