import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { usePortalAuth } from "@/lib/portal-auth";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";

export default function PortalNavbar() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, isCoach, isStaff } = usePortalAuth();

  const handleLogout = async () => {
    await logout();
    setLocation("/portal/login");
  };

  const navItems = [
    { path: "/portal/dashboard", label: "Dashboard" },
    { path: "/portal/booking", label: "Book" },
    { path: "/portal/schedule", label: "Schedule" },
    ...(isCoach || isAdmin ? [{ path: "/portal/coach", label: "Coach Center" }] : []),
    ...(isAdmin ? [{ path: "/portal/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#121826]/95 backdrop-blur-md border-b border-white/5 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center space-x-3 group" title="Back to main site">
              <div className="h-9 w-9 rounded-full border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110">
                <img src={logoImage} alt="Ground Up BJJ Logo" className="h-7 w-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-white tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                  GROUND UP
                </span>
                <span className="ml-2 text-xs font-medium text-[#B06CFF] uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
                  Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`relative px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors ${
                  location === item.path
                    ? "text-[#5EEBFF]"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {item.label}
                {location === item.path && (
                  <motion.div
                    layoutId="portal-nav-indicator"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#5EEBFF]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}

            <Link href="/">
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-gray-400 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Main Site
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="ml-2 border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden bg-[#0B0F14] border-t border-white/5 rounded-b-xl"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`block px-4 py-3 text-sm font-medium tracking-wide uppercase transition-colors rounded-lg ${
                      location === item.path
                        ? "text-[#5EEBFF] bg-white/5"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium tracking-wide uppercase text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Main Site
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-medium tracking-wide uppercase text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
