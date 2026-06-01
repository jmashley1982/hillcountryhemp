import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { MapPin, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
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
      {/* Navbar — gradient from deep green to black */}
      <header className="sticky top-0 z-50 w-full border-b border-border shadow-lg"
        style={{ background: "linear-gradient(135deg, #0e2410 0%, #1A3E1E 45%, #000000 100%)" }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="bg-[#D4AF37] text-black p-1.5 rounded-lg rotate-3 group-hover:-rotate-3 transition-transform shadow-md">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-2xl tracking-wider text-[#D4AF37]">THC Finder</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 hidden sm:block">
                Find Hemp in the Hill Country
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-bold uppercase tracking-wider text-white/80 hover:text-[#D4AF37] transition-colors">Find Shops</Link>
            <Link href="/advertise" className="text-sm font-bold uppercase tracking-wider text-white/80 hover:text-[#D4AF37] transition-colors">Advertise</Link>

            <div className="h-6 w-px bg-white/20 mx-2" />

            {!isLoading && (
              user ? (
                <div className="flex items-center gap-4">
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                    <Button variant="outline" className="font-bold border-2 border-[#D4AF37]/50 text-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]">
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
                  <Link href="/login" className="text-sm font-bold uppercase text-white/80 hover:text-[#D4AF37] transition-colors">Login</Link>
                  <Link href="/register">
                    <Button className="bg-[#D4AF37] hover:bg-[#c49f2a] text-black font-bold shadow-md">List Your Business</Button>
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
                  <Button className="w-full justify-start font-bold border-2 border-[#D4AF37]/50 text-[#D4AF37] bg-transparent hover:bg-[#D4AF37]/10" variant="outline">
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
                  <Button className="w-full font-bold bg-[#D4AF37] text-black hover:bg-[#c49f2a]">List Your Business</Button>
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
