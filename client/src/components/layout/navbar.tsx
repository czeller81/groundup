import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/personal-training", label: "Training" },
    { path: "/schedule", label: "Schedule" },
    { path: "/coaches", label: "Coaches" },
    { path: "/pricing", label: "Programs" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B0F14]/95 backdrop-blur-md border-b border-white/5 shadow-lg"
          : "bg-transparent"
      }`}
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <Link href="/" className="flex items-center space-x-3 group" data-testid="navbar-logo">
            <div className="h-11 w-11 rounded-full border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110">
              <img src={logoImage} alt="Ground Up BJJ Logo" className="h-9 w-9 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
          </Link>

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
                data-testid={`nav-link-${item.path.slice(1) || "home"}`}
              >
                {item.label}
                {location === item.path && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#5EEBFF]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            <Link
              href="/portal/login"
              className="ml-2 px-4 py-2 text-sm font-medium tracking-wide uppercase text-gray-300 hover:text-white transition-colors"
              data-testid="nav-link-login"
            >
              Member Login
            </Link>
            <Link href="/book">
              <Button
                size="sm"
                className="ml-2 bg-[#FFB199] text-[#0B0F14] font-semibold hover:bg-[#FFB199]/90 uppercase tracking-wider text-xs"
                data-testid="nav-link-book"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-white/10"
              data-testid="mobile-menu-toggle"
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
              className="md:hidden overflow-hidden bg-[#121826] border-t border-white/5 rounded-b-xl"
              data-testid="mobile-menu"
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
                    data-testid={`mobile-nav-link-${item.path.slice(1) || "home"}`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/portal/login"
                  className="block px-4 py-3 text-sm font-medium tracking-wide uppercase text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-nav-link-login"
                >
                  Member Login
                </Link>
                <Link
                  href="/book"
                  className="block px-4 py-3 text-sm font-semibold tracking-wide uppercase text-[#0B0F14] bg-[#FFB199] rounded-lg text-center mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
