import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = "Ground Up Jiu-Jitsu & Fitness";
const BASE_URL = "https://www.groundupbjj.com";
const DEFAULT_OG_IMAGE = "/og-image.jpg";

const HREFLANG_PAIRS: Record<string, { en?: string; es?: string; xDefault?: string }> = {
  "/": { en: "/", es: "/es", xDefault: "/" },
  "/es": { en: "/", es: "/es", xDefault: "/" },
  "/pricing": { en: "/pricing", es: "/es/programas" },
  "/es/programas": { en: "/pricing", es: "/es/programas" },
  "/schedule": { en: "/schedule", es: "/es/horario" },
  "/es/horario": { en: "/schedule", es: "/es/horario" },
  "/book": { en: "/book", es: "/es/reservar" },
  "/es/reservar": { en: "/book", es: "/es/reservar" },
  "/contact": { en: "/contact", es: "/es/contacto" },
  "/es/contacto": { en: "/contact", es: "/es/contacto" },
  "/privacy": { en: "/privacy", es: "/es/privacidad" },
  "/es/privacidad": { en: "/privacy", es: "/es/privacidad" },
};

export default function SEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
  const routePath = typeof window !== "undefined" ? window.location.pathname : canonical || "/";
  const alternates = HREFLANG_PAIRS[routePath] || {
    [routePath.startsWith("/es") ? "es" : "en"]: canonical || routePath,
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {alternates.en && <link rel="alternate" hrefLang="en" href={`${BASE_URL}${alternates.en}`} />}
      {alternates.es && <link rel="alternate" hrefLang="es" href={`${BASE_URL}${alternates.es}`} />}
      {alternates.xDefault && <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${alternates.xDefault}`} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={`${BASE_URL}${ogImage === "/og-image.jpg" ? "/og-image.svg" : ogImage}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE_URL}${ogImage}`} />

      <meta name="keywords" content="women-only BJJ Oxnard, women's Brazilian Jiu-Jitsu, women's self-defense Oxnard CA, beginner BJJ, girls BJJ Oxnard, martial arts Oxnard" />
      <meta name="geo.region" content="US-CA" />
      <meta name="geo.placename" content="Oxnard" />
    </Helmet>
  );
}
