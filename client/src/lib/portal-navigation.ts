export function portalNavigationPaths(role?: string | null) {
  return [
    "/portal/dashboard",
    "/portal/billing",
    "/portal/schedule",
    "/portal/my-classes",
    ...(role === "coach" || role === "admin" ? ["/portal/coach"] : []),
    ...(role === "admin" ? ["/portal/class-admin", "/portal/admin"] : []),
  ];
}

export function localizedPortalPath(path: string, locale: "en" | "es") {
  return locale === "es" ? `/es${path}` : path;
}

export function localizedPortalEntryPath(path: "/portal/login" | "/portal/signup" | "/portal/reset-password", locale: "en" | "es") {
  return locale === "es" ? `/es${path}` : `${path}?locale=en`;
}