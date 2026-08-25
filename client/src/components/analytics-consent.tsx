import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { captureAttribution, getConsent, setAnalyticsConsent, track } from "@/lib/analytics";
import { initializeMetaPixel, trackMetaPageView } from "@/lib/meta-pixel";

export default function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(getConsent() === null);
    if (getConsent() === "granted") {
      initializeMetaPixel();
      trackMetaPageView();
      captureAttribution();
      const path = window.location.pathname;
      track("page_view", path === "/adaptive-capacity" ? "adaptive_capacity" : "training");
    }
  }, []);
  if (!visible) return null;
  return (
    <aside className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#121826] p-5 text-white shadow-2xl" role="dialog" aria-label="Analytics choices">
      <p className="text-sm font-semibold">Help us understand what brings people here</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-400">Allow anonymous analytics and campaign attribution so we can improve the training and Adaptive Capacity journeys. You can decline and still use the site.</p>
      <div className="mt-4 flex gap-3">
        <Button onClick={() => { setAnalyticsConsent("granted"); initializeMetaPixel(); trackMetaPageView(); setVisible(false); const path = window.location.pathname; track("page_view", path === "/adaptive-capacity" ? "adaptive_capacity" : "training"); }} className="bg-[#FFB199] text-[#0B0F14]">Allow analytics</Button>
        <Button variant="outline" onClick={() => { setAnalyticsConsent("denied"); setVisible(false); }} className="border-white/20 bg-transparent text-white">Decline</Button>
      </div>
    </aside>
  );
}