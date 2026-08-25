import { useEffect } from "react";
import { useLocation } from "wouter";
import { hasAnalyticsConsent } from "@/lib/analytics";
import { initializeMetaPixel, trackMetaPageView } from "@/lib/meta-pixel";

export default function MetaPixel() {
  const [location] = useLocation();

  useEffect(() => {
    if (hasAnalyticsConsent()) initializeMetaPixel();
  }, []);

  useEffect(() => {
    if (hasAnalyticsConsent()) {
      initializeMetaPixel();
      trackMetaPageView();
    }
  }, [location]);

  return null;
}