export function portalNavigationPaths(role?: string | null) {
  return [
    "/portal/dashboard",
    "/portal/schedule",
    "/portal/my-classes",
    ...(role === "coach" || role === "admin" ? ["/portal/coach"] : []),
    ...(role === "admin" ? ["/portal/class-admin", "/portal/admin"] : []),
  ];
}

export function localizedPortalPath(path: string, locale: "en" | "es") {
  return locale === "es" ? `/es${path}` : path;
}