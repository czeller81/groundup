import { Link } from "wouter";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";
import logoImage from "@assets/Ground_up_Logo_1772941267349.png";
import { useLocale } from "@/lib/locale";

export default function Footer() {
  const { locale, publicCopy } = useLocale();
  const prefix = locale === "es" ? "/es" : "";
  const links = locale === "es"
    ? [
        { href: `${prefix}/personal-training`, label: publicCopy.personalTraining },
        { href: `${prefix}/coaches`, label: publicCopy.coaches },
        { href: `${prefix}/pricing`, label: publicCopy.programs },
        { href: `${prefix}/adaptive-capacity`, label: publicCopy.adaptiveCapacity },
        { href: `${prefix}/horario`, label: publicCopy.schedule },
        { href: `${prefix}/contacto`, label: publicCopy.contact },
        { href: `${prefix}/privacidad`, label: publicCopy.privacyPolicy },
        { href: "/es/portal/login", label: publicCopy.memberPortal },
      ]
    : [
        { href: "/personal-training", label: publicCopy.personalTraining },
        { href: "/coaches", label: publicCopy.coaches },
        { href: "/pricing", label: publicCopy.programs },
        { href: "/adaptive-capacity", label: publicCopy.adaptiveCapacity },
        { href: "/schedule", label: publicCopy.schedule },
        { href: "/contact", label: publicCopy.contact },
        { href: "/privacy", label: publicCopy.privacyPolicy },
        { href: "/portal/login", label: publicCopy.memberPortal },
      ];
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
              {publicCopy.footerDescription}
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {publicCopy.quickLinks}
            </h4>
            <nav className="space-y-2">
              {links.map((link, index) => (
                <Link
                  key={`${link.href}-${link.label}-${index}`}
                  href={link.href}
                  className="flex min-h-11 items-center text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {publicCopy.getInTouch}
            </h4>
            <div className="space-y-3">
              <a href="tel:786-757-1175" className="flex min-h-11 items-center space-x-3 text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>(786) 757-1175</span>
              </a>
              <a href="mailto:info@groundupbjj.com" className="flex min-h-11 items-center space-x-3 text-gray-400 hover:text-[#5EEBFF] text-sm transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>info@groundupbjj.com</span>
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
             &copy; {new Date().getFullYear()} Ground Up Women's BJJ. {publicCopy.allRightsReserved}
          </p>
          <div className="flex items-center space-x-4">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-[#5EEBFF] transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
