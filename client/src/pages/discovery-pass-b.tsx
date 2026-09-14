import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Clock3, Dumbbell, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SEO from "@/components/seo";
import { apiRequest } from "@/lib/queryClient";
import { captureAttribution, track, trackEvent } from "@/lib/analytics";
import { localizedPortalEntryPath } from "@/lib/portal-navigation";
import { useLocale } from "@/lib/locale";
import { TurnstileField } from "@/components/turnstile";

const CLICK_ID_KEYS = ["fbclid", "gclid", "ttclid"] as const;

const COPY = {
  en: {
    seoTitle: "Claim Your Free Discovery Pass | Ground Up BJJ",
    seoDescription: "Claim a free seven-day Ground Up Discovery Pass, then create your secure member account.",
    eyebrow: "GROUND UP · DISCOVERY PASS",
    title: "Start with one simple step.",
    intro: "Claim your free Discovery Pass now. We’ll use your details to prefill secure account setup—no account, password, pass, or timer is created yet.",
    firstName: "First name",
    email: "Email",
    phone: "Phone (optional)",
    submit: "Continue",
    submitting: "Saving…",
    required: "First name and email are required.",
    invalid: "Please enter a valid email address.",
    failed: "We couldn’t save that yet. Please try again.",
    successEyebrow: "CLAIM SAVED",
    successTitle: "Your next step is secure account setup.",
    successBody: "Your Discovery Pass is not active yet. Create or log in to your member account, complete the required forms, activate the pass, and then book one SKILL class and one STRENGTH class.",
    continue: "Continue to account setup",
    already: "Already have an account?",
    login: "Log in",
    trust: ["One SKILL class", "One STRENGTH class", "Seven days after activation"],
  },
  es: {
    seoTitle: "Reclama tu Discovery Pass gratis | Ground Up BJJ",
    seoDescription: "Reclama un Discovery Pass gratis de siete días y después crea tu cuenta segura.",
    eyebrow: "GROUND UP · DISCOVERY PASS",
    title: "Comienza con un paso sencillo.",
    intro: "Reclama tu Discovery Pass gratis. Usaremos tus datos para completar la configuración segura de tu cuenta; todavía no se crea una cuenta, contraseña, pase ni temporizador.",
    firstName: "Nombre",
    email: "Correo electrónico",
    phone: "Teléfono (opcional)",
    submit: "Continuar",
    submitting: "Guardando…",
    required: "El nombre y el correo son obligatorios.",
    invalid: "Escribe un correo electrónico válido.",
    failed: "No pudimos guardar la información. Inténtalo de nuevo.",
    successEyebrow: "RECLAMO GUARDADO",
    successTitle: "Tu siguiente paso es configurar tu cuenta segura.",
    successBody: "Tu Discovery Pass todavía no está activo. Crea o inicia sesión en tu cuenta, completa los formularios requeridos, activa el pase y después reserva una clase de SKILL y una de STRENGTH.",
    continue: "Continuar a la cuenta",
    already: "¿Ya tienes una cuenta?",
    login: "Iniciar sesión",
    trust: ["Una clase de SKILL", "Una clase de STRENGTH", "Siete días después de activarlo"],
  },
} as const;

function accountHref(locale: "en" | "es") {
  const destination = localizedPortalEntryPath("/portal/signup", locale);
  const [pathname, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("intent", "discovery-pass");
  if (typeof window !== "undefined") {
    const current = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", ...CLICK_ID_KEYS]) {
      const value = current.get(key);
      if (value) params.set(key, value.slice(0, 200));
    }
  }
  return `${pathname}?${params.toString()}`;
}

function loginHref(locale: "en" | "es") {
  const destination = localizedPortalEntryPath("/portal/login", locale);
  const [pathname, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("intent", "discovery-pass");
  return `${pathname}?${params.toString()}`;
}

function safeAttribution() {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ttclid"]) {
    const value = new URLSearchParams(window.location.search).get(key);
    if (value) result[key] = value.slice(0, 200);
  }
  return { ...result, ...captureAttribution() };
}

export default function DiscoveryPassB() {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const [form, setForm] = useState({ firstName: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formStartedAt] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const started = useRef(false);

  useEffect(() => {
    window.localStorage.setItem("groundup-discovery-variant", "B");
    captureAttribution();
    trackEvent("discovery_page_view", { locale, variant: "B" });
    track("discovery_page_view", "training", { funnel_kind: "discovery_pass", locale, variant: "B" });
  }, [locale]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackEvent("discovery_claim_started", { locale, variant: "B" });
    track("discovery_claim_started", "training", { funnel_kind: "discovery_pass", locale, variant: "B" });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    markStarted();
    setError("");
    if (!form.firstName.trim() || !form.email.trim()) return setError(copy.required);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError(copy.invalid);
    setLoading(true);
    try {
      const honeypot = (((event.currentTarget as HTMLFormElement).elements.namedItem("website")) as HTMLInputElement | null)?.value || "";
      await apiRequest("POST", "/api/discovery-pass/claim", {
        ...form,
        locale,
        attribution: safeAttribution(),
        website: honeypot,
        formStartedAt,
        turnstileToken,
      });
      setSubmitted(true);
      trackEvent("discovery_claim_submitted", { locale, variant: "B" });
      track("discovery_claim_submitted", "training", { funnel_kind: "discovery_pass", locale, variant: "B" });
    } catch {
      setError(copy.failed);
    } finally {
      setLoading(false);
    }
  };

  const continueToAccount = () => {
    trackEvent("discovery_continue_to_account", { locale, variant: "B" });
    track("discovery_continue_to_account", "training", { funnel_kind: "discovery_pass", locale, variant: "B" });
    void fetch("/api/discovery-pass/continue", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  };

  return (
    <>
      <SEO title={copy.seoTitle} description={copy.seoDescription} canonical={locale === "es" ? "/es/discovery-pass-b" : "/discovery-pass-b"} />
      <main className="min-h-[calc(100vh-5rem)] bg-[#0B0F14] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5EEBFF]">{copy.eyebrow}</p>
            <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">{copy.title}</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-300">{copy.intro}</p>
            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {copy.trust.map((item, index) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  {index === 0 ? <Dumbbell className="h-5 w-5 text-[#5EEBFF]" /> : index === 1 ? <ShieldCheck className="h-5 w-5 text-[#D0A0FF]" /> : <Clock3 className="h-5 w-5 text-[#FFB199]" />}
                  <p className="mt-3 text-sm font-bold leading-5 text-white">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-[#121826] p-6 shadow-2xl sm:p-8">
            {!submitted ? (
              <form onSubmit={submit} className="space-y-5">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[10000px] h-px w-px opacity-0" aria-hidden="true" />
                <div>
                  <h2 className="text-2xl font-black">{copy.submit}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{copy.intro}</p>
                </div>
                <div>
                  <Label htmlFor="discovery-b-first-name" className="text-gray-200">{copy.firstName}</Label>
                  <Input id="discovery-b-first-name" required maxLength={80} value={form.firstName} onFocus={markStarted} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-2 min-h-12 border-white/15 bg-white/5 text-white" autoComplete="given-name" />
                </div>
                <div>
                  <Label htmlFor="discovery-b-email" className="text-gray-200">{copy.email}</Label>
                  <Input id="discovery-b-email" required type="email" maxLength={254} value={form.email} onFocus={markStarted} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 min-h-12 border-white/15 bg-white/5 text-white" autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="discovery-b-phone" className="text-gray-200">{copy.phone}</Label>
                  <Input id="discovery-b-phone" type="tel" maxLength={30} value={form.phone} onFocus={markStarted} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 min-h-12 border-white/15 bg-white/5 text-white" autoComplete="tel" />
                </div>
                {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
                <TurnstileField onToken={setTurnstileToken} />
                <Button type="submit" disabled={loading} className="min-h-14 w-full bg-[#FFB199] text-sm font-black uppercase tracking-[0.12em] text-[#0B0F14] hover:bg-[#FFCDB9]">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{copy.submitting}</> : <>{copy.submit}<ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
              </form>
            ) : (
              <div>
                <CheckCircle2 className="h-10 w-10 text-[#5EEBFF]" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-[#5EEBFF]">{copy.successEyebrow}</p>
                <h2 className="mt-3 text-3xl font-black leading-tight">{copy.successTitle}</h2>
                <p className="mt-5 text-sm leading-7 text-gray-300">{copy.successBody}</p>
                <Button asChild onClick={continueToAccount} className="mt-7 min-h-14 w-full bg-[#FFB199] text-sm font-black uppercase tracking-[0.08em] text-[#0B0F14] hover:bg-[#FFCDB9]">
                  <Link href={accountHref(locale)}>{copy.continue}<ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <p className="mt-4 text-center text-sm text-gray-400">
                  {copy.already}{" "}
                  <Link href={loginHref(locale)} className="font-bold text-[#5EEBFF] hover:underline">{copy.login}</Link>
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}