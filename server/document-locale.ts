export type DocumentLocale = "en" | "es";

export function documentLocaleForPath(pathname: string): DocumentLocale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

export function applyDocumentLocale(html: string, pathname: string): string {
  return html.replace(
    /<html\s+lang="[^"]*">/i,
    `<html lang="${documentLocaleForPath(pathname)}">`,
  );
}