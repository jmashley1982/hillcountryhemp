import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Map, MapPin, User, LogOut, LayoutDashboard, Search, Menu, X } from "lucide-react";
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
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded rotate-3 group-hover:-rotate-3 transition-transform">
              <MapPin className="h-6 w-6" />
            </div>
            <span className="font-display text-2xl tracking-wider text-primary">THC Finder</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">Find Shops</Link>
            <Link href="/advertise" className="text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors">Advertise</Link>
            
            <div className="h-6 w-px bg-border mx-2" />
            
            {!isLoading && (
              user ? (
                <div className="flex items-center gap-4">
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'}>
                    <Button variant="outline" className="font-bold border-2">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-bold uppercase hover:text-primary transition-colors">Login</Link>
                  <Link href="/register">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">List Your Business</Button>
                  </Link>
                </div>
              )
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 flex flex-col gap-4 absolute top-16 left-0 right-0 z-40 shadow-xl">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold uppercase tracking-wider block p-2">Find Shops</Link>
          <Link href="/advertise" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold uppercase tracking-wider block p-2">Advertise</Link>
          <hr className="border-border" />
          {!isLoading && (
            user ? (
              <>
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-start font-bold border-2" variant="outline">
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
                  <Button className="w-full font-bold">List Your Business</Button>
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
