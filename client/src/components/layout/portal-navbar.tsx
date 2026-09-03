import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Languages, LogOut, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePortalAuth } from "@/lib/portal-auth";
import { useLocale } from "@/lib/locale";
import { apiRequest } from "@/lib/queryClient";
import { portalNavigationPaths } from "@/lib/portal-navigation";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";

export default function PortalNavbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, isCoach } = usePortalAuth();
  const { locale, copy, setLocale } = useLocale();

  const labels: Record<string, string> = {
    "/portal/dashboard": copy.dashboard,
    "/portal/schedule": copy.schedule,
    "/portal/my-classes": copy.myClasses,
    "/portal/coach": copy.coachCenter,
    "/portal/class-admin": copy.classAdmin,
    "/portal/admin": copy.admin,
  };
  const navItems = portalNavigationPaths(user?.role).map((path) => ({
    path,
    href: locale === "es" ? `/es${path}` : path,
    label: labels[path],
  }));

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    closeMobileMenu();
    setLocation(locale === "es" ? "/es" : "/");
  };

  const switchLocale = () => {
    const nextLocale = locale === "en" ? "es" : "en";
    setLocale(nextLocale);
    if (user) void apiRequest("PATCH", "/api/portal/me/locale", { locale: nextLocale });
    setLocation(nextLocale === "es" ? `/es${location}` : location.replace(/^\/es/, ""));
  };

  return (
    <nav
      aria-label={copy.portalLabel}
      className="sticky top-0 z-50 border-b border-white/5 bg-[#121826]/95 shadow-lg backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href={locale === "es" ? "/es" : "/"}
            className="flex min-w-0 items-center gap-3 group"
            aria-label="Ground Up"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 transition-transform group-hover:scale-105">
              <img
                src={logoImage}
                alt="Ground Up"
                className="h-7 w-7 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <span className="block truncate text-base font-bold tracking-wider text-white" style={{ fontFamily: "var(--font-display)" }}>
                GROUND UP
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#B06CFF]" style={{ fontFamily: "var(--font-display)" }}>
                {copy.account}
              </span>
            </div>
          </Link>

          <div className="hidden min-w-0 items-center gap-1 md:flex">
            {navItems.map((item) => {
                  const active = location === item.href || (item.path === "/portal/schedule" && (location === item.href.replace(/\/schedule$/, "/booking") || location === "/portal/booking"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active ? "text-[#5EEBFF]" : "text-gray-300 hover:text-white"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="portal-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#5EEBFF]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
              <button
                type="button"
                onClick={switchLocale}
                className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
                aria-label={`${copy.language}: ${locale === "en" ? copy.spanish : copy.english}`}
              >
                <Languages className="h-3.5 w-3.5" />
                {locale === "en" ? "ES" : "EN"}
              </button>
              <span className="hidden items-center gap-1.5 text-xs text-gray-500 lg:flex" title={user?.email || undefined}>
                <UserRound className="h-3.5 w-3.5 text-[#B06CFF]" />
                {user?.firstName || copy.account}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {copy.logout}
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? copy.closeNavigation : copy.openNavigation}
            aria-expanded={mobileMenuOpen}
            aria-controls="portal-mobile-navigation"
             className="min-h-11 min-w-11 text-white hover:bg-white/10 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="portal-mobile-navigation"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/5 bg-[#0B0F14] md:hidden"
            >
              <div className="space-y-1 px-2 pb-4 pt-3">
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <UserRound className="h-4 w-4 text-[#B06CFF]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
                    <p className="truncate text-xs text-gray-500">{user?.role === "admin" ? copy.administrator : user?.role === "coach" ? copy.coach : copy.member}</p>
                  </div>
                </div>
                {navItems.map((item) => {
                  const active = location === item.href || (item.path === "/portal/schedule" && (location === item.href.replace(/\/schedule$/, "/booking") || location === "/portal/booking"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                        active ? "bg-white/5 text-[#5EEBFF]" : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={switchLocale}
                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <Languages className="h-4 w-4" />
                    {locale === "en" ? copy.spanish : copy.english}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {copy.logout}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}