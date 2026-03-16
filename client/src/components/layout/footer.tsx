import { Link } from "wouter";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";

export default function Footer() {
  return (
    <footer className="bg-[#0B0F14] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img src={logoImage} alt="Ground Up BJJ" className="h-10 w-10" style={{ filter: "brightness(0) invert(1)" }} />
              <span className="text-lg font-bold text-white tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                GROUND UP
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Women's-only Brazilian Jiu-Jitsu & strength training in Oxnard, CA.
              Building confidence, strength, and community one roll at a time.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              QUICK LINKS
            </h4>
            <nav className="space-y-2">
              {[
                { href: "/personal-training", label: "Personal Training" },
                { href: "/coaches", label: "Coaches" },
                { href: "/pricing", label: "Programs" },
                { href: "/schedule", label: "Schedule" },
                { href: "/contact", label: "Contact" },
                { href: "/portal/login", label: "Member Portal" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              GET IN TOUCH
            </h4>
            <div className="space-y-3">
              <a href="tel:786-757-1175" className="flex items-center space-x-3 text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>(786) 757-1175</span>
              </a>
              <a href="mailto:raymin33@gmail.com" className="flex items-center space-x-3 text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>raymin33@gmail.com</span>
              </a>
              <div className="flex items-center space-x-3 text-gray-400 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Oxnard, CA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} Ground Up Women's BJJ. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#5EEBFF] transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
