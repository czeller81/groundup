import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/lib/portal-auth";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";

const CALENDLY_URL = "https://calendly.com/groundupbjj";

export default function PortalBooking() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = usePortalAuth();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5EEBFF]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/portal/login");
    return null;
  }

  const prefill = user
    ? `&name=${encodeURIComponent((user.firstName || "") + " " + (user.lastName || ""))}&email=${encodeURIComponent(user.email || "")}`
    : "";

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <header className="bg-[#121826] border-b border-white/5 py-4 px-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" size="sm" className="mb-2 text-gray-400 hover:text-white hover:bg-white/5" asChild>
            <Link href="/portal/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <CalendarIcon className="h-5 w-5 text-[#5EEBFF]" />
            BOOK A SESSION
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div
          className="calendly-inline-widget rounded-2xl overflow-hidden border border-white/10"
          data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=121826&text_color=e2e8f0&primary_color=5eebff${prefill}`}
          style={{ minWidth: "320px", height: "700px" }}
        />
      </main>
    </div>
  );
}
