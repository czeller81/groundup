import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LogIn, LogOut, Menu, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePortalAuth } from "@/lib/portal-auth";
import { useLocale } from "@/lib/locale";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, logout } = usePortalAuth();
  const { locale, copy, publicCopy } = useLocale();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const navItems = locale === "es"
    ? [
        { path: "/es", label: publicCopy.home },
        { path: "/es/programas", label: publicCopy.training },
        { path: "/es/programas", label: publicCopy.selfDefense },
        { path: "/es/programas", label: publicCopy.girlsMothers },
        { path: "/es/horario", label: publicCopy.schedule },
        { path: "/es/programas", label: publicCopy.coaches },
        { path: "/es/programas", label: publicCopy.programs },
      ]
    : [
        { path: "/", label: publicCopy.home },
        { path: "/personal-training", label: publicCopy.training },
        { path: "/womens-self-defense", label: publicCopy.selfDefense },
        { path: "/girls", label: publicCopy.girlsMothers },
        { path: "/schedule", label: publicCopy.schedule },
        { path: "/coaches", label: publicCopy.coaches },
        { path: "/pricing", label: publicCopy.programs },
      ];
  const accountPath = isAuthenticated
    ? (locale === "es" ? "/es/portal/dashboard" : "/portal/dashboard")
    : (locale === "es" ? "/es/portal/login" : "/portal/login");
  const firstVisitPath = locale === "es" ? "/es/reservar" : "/book";

  const closeMenu = () => setMobileMenuOpen(false);
  const handleLogout = async () => {
    await logout();
    closeMenu();
    setLocation(locale === "es" ? "/es" : "/");
  };

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-white/5 bg-[#0B0F14]/95 shadow-lg backdrop-blur-md" : "bg-transparent"
      }`}
      data-testid="navbar"
      aria-label={publicCopy.mainNavigation}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          <Link href={locale === "es" ? "/es" : "/"} className="flex flex-shrink-0 items-center space-x-3 group" data-testid="navbar-logo">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 transition-transform group-hover:scale-105">
              <img src={logoImage} alt="Ground Up" className="h-9 w-9 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
          </Link>

          <div className="hidden min-w-0 items-center gap-1 md:flex">
            {navItems.map((item, index) => (
              <Link
                key={`${item.path}-${item.label}-${index}`}
                href={item.path}
                className={`relative whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  location === item.path ? "text-[#5EEBFF]" : "text-gray-300 hover:text-white"
                }`}
                data-testid={`nav-link-${item.path.slice(1) || "home"}`}
              >
                {item.label}
                {location === item.path && (
                  <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#5EEBFF]" />
                )}
              </Link>
            ))}
            <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
              <Link
                href={accountPath}
                className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-300 transition-colors hover:text-white"
                data-testid="nav-link-account"
              >
                <UserRound className="h-3.5 w-3.5 text-[#B06CFF]" />
                {isAuthenticated ? user?.firstName || publicCopy.account : publicCopy.login}
              </Link>
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 text-gray-400 hover:bg-white/5 hover:text-white" aria-label={copy.logout}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Link href={locale === "es" ? "/" : "/es"} className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-[#5EEBFF] hover:text-white" data-testid="nav-link-es">
                  {locale === "es" ? publicCopy.english : publicCopy.spanish}
                </Link>
              )}
              <Link href={firstVisitPath}>
                <Button size="sm" className="bg-[#FFB199] font-semibold uppercase tracking-wider text-[#0B0F14] hover:bg-[#FFB199]/90">
                  {publicCopy.freeFirstVisit}
                </Button>
              </Link>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((open) => !open)}
             aria-label={mobileMenuOpen ? publicCopy.closeMenu : publicCopy.openMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="text-white hover:bg-white/10 md:hidden"
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              id="mobile-navigation"
              className="overflow-hidden rounded-b-xl border-t border-white/5 bg-[#121826] md:hidden"
            >
              <div className="space-y-1 px-2 pb-4 pt-3">
                {navItems.map((item, index) => (
                  <Link
                    key={`${item.path}-${item.label}-${index}`}
                    href={item.path}
                    onClick={closeMenu}
                    className={`block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                      location === item.path ? "bg-white/5 text-[#5EEBFF]" : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href={accountPath}
                  onClick={closeMenu}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-300 hover:bg-white/5 hover:text-white"
                >
                  {isAuthenticated ? <UserRound className="h-4 w-4 text-[#B06CFF]" /> : <LogIn className="h-4 w-4 text-[#B06CFF]" />}
                  {isAuthenticated ? `${publicCopy.account} · ${user?.firstName || ""}` : publicCopy.login}
                </Link>
                  {isAuthenticated ? (
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-red-300 hover:bg-red-400/10">
                    <LogOut className="h-4 w-4" />{copy.logout}
                  </button>
                ) : (
                  <Link href={locale === "es" ? "/" : "/es"} onClick={closeMenu} className="block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#5EEBFF] hover:bg-white/5 hover:text-white">
                    {locale === "es" ? publicCopy.english : publicCopy.spanish}
                  </Link>
                )}
                <Link href={firstVisitPath} onClick={closeMenu} className="mt-2 block rounded-lg bg-[#FFB199] px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-[#0B0F14]">
                  {publicCopy.freeFirstVisit}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}