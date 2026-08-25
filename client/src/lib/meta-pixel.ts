const META_PIXEL_ID = "1056772796937894";
const SCRIPT_ID = "groundup-meta-pixel";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: Window["fbq"];
  }
}

export function initializeMetaPixel() {
  if (typeof window === "undefined" || window.fbq) return;

  const queue: unknown[][] = [];
  const fbq = Object.assign((...args: unknown[]) => {
    queue.push(args);
  }, {
    queue,
    loaded: true,
    version: "2.0",
  });
  window.fbq = fbq;
  window._fbq = fbq;

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("init", META_PIXEL_ID);
}

export function trackMetaPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}