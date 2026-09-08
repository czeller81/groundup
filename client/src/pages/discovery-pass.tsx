import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Dumbbell, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import { captureAttribution, trackEvent } from "@/lib/analytics";
import { localizedPortalEntryPath } from "@/lib/portal-navigation";
import { useLocale } from "@/lib/locale";
import discoveryHeroImg from "@assets/womens-team-1.jpg";
import discoveryTrainingImg from "@assets/facility-mat.jpg";

const ATTRIBUTION_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ttclid",
] as const;

const DISCOVERY_COPY = {
  en: {
    seoTitle: "Free Discovery Pass | Ground Up BJJ Oxnard",
    seoDescription: "Try Ground Up with a free seven-day Discovery Pass including one SKILL class and one STRENGTH class. Beginner-friendly coaching in Oxnard.",
    eyebrow: "Women-only training · Oxnard, CA",
    title: "Try Ground Up Free",
    intro: "Experience Ground Up with a complimentary Discovery Pass and see what training can feel like when coaching, community, and confidence come first.",
    cta: "Get my free Discovery Pass",
    secondaryCta: "See how it works",
    noCommitment: "No membership commitment required to get started.",
    offerLabel: "Your Discovery Pass",
    offerHeadline: "Two ways to move",
    offerBody: "One week to experience the training floor, meet the community, and find the sessions that fit you.",
    sevenDays: "7 days to experience Ground Up",
    includedEyebrow: "Simple by design",
    includedTitle: "Your pass includes",
    includedDescription: "Start with a clear, low-pressure introduction to Ground Up.",
    skillTitle: "1 SKILL class",
    skillBody: "Learn Brazilian Jiu-Jitsu and practical self-defense in a coached, beginner-friendly setting.",
    strengthTitle: "1 STRENGTH class",
    strengthBody: "Build useful strength and movement capacity with a focused small-group session.",
    daysTitle: "7 days",
    daysBody: "Your pass is active for seven days after activation, giving you time to experience both sessions.",
    expectEyebrow: "Your first visit",
    expectTitle: "A place to learn, not perform",
    expectBody: "Walking into a martial arts gym for the first time can feel like a big step. Ground Up is built to make that first step feel clear, welcoming, and at your pace.",
    expectPoints: [
      "Beginner-friendly coaching with no prior experience required.",
      "A women-only space centered on safety, learning, and confidence.",
      "Small-group sessions where you can ask questions and get personal attention.",
    ],
    howEyebrow: "Your next steps",
    howTitle: "Start where you are",
    steps: [
      ["01", "Claim your pass", "Create your Ground Up account through the secure member portal."],
      ["02", "Complete your waivers", "Review the required forms so you can train safely and confidently."],
      ["03", "Activate and book", "Activate your pass, choose one SKILL class and one STRENGTH class, then reserve your spots."],
      ["04", "Show up and train", "Arrive ready to learn. We’ll help you understand what comes next."],
    ],
    finalEyebrow: "Your first step starts here",
    finalTitle: "Come experience Ground Up",
    finalBody: "A free Discovery Pass is a simple way to meet the coaches, try the training, and decide what feels right for you.",
    finalCta: "Get my free Discovery Pass",
    languageNote: "Already have an account? You can log in and continue your Discovery Pass journey.",
    trust: ["Coached sessions", "Women-only community", "Beginner friendly"],
  },
  es: {
    seoTitle: "Discovery Pass gratis | Ground Up BJJ Oxnard",
    seoDescription: "Prueba Ground Up con un Discovery Pass gratis de siete días que incluye una clase de SKILL y una clase de STRENGTH. Coaching para principiantes en Oxnard.",
    eyebrow: "Entrenamiento solo para mujeres · Oxnard, CA",
    title: "Prueba Ground Up gratis",
    intro: "Conoce Ground Up con un Discovery Pass gratuito y descubre cómo se siente entrenar cuando el coaching, la comunidad y la confianza son lo primero.",
    cta: "Obtener mi Discovery Pass gratis",
    secondaryCta: "Ver cómo funciona",
    noCommitment: "No necesitas comprometerte con una membresía para comenzar.",
    offerLabel: "Tu Discovery Pass",
    offerHeadline: "Dos formas de moverte",
    offerBody: "Una semana para conocer el espacio, la comunidad y las sesiones que mejor se adaptan a ti.",
    sevenDays: "7 días para conocer Ground Up",
    includedEyebrow: "Simple por diseño",
    includedTitle: "Tu pase incluye",
    includedDescription: "Comienza con una introducción clara y sin presión a Ground Up.",
    skillTitle: "1 clase de SKILL",
    skillBody: "Aprende jiu-jitsu brasileño y defensa personal práctica en un ambiente guiado y para principiantes.",
    strengthTitle: "1 clase de STRENGTH",
    strengthBody: "Desarrolla fuerza útil y capacidad de movimiento en una sesión enfocada para grupos pequeños.",
    daysTitle: "7 días",
    daysBody: "Tu pase está activo durante siete días después de activarlo para que puedas probar ambas sesiones.",
    expectEyebrow: "Tu primera visita",
    expectTitle: "Un lugar para aprender, no para demostrar",
    expectBody: "Entrar por primera vez a un gimnasio de artes marciales puede sentirse como un gran paso. Ground Up está diseñado para que ese primer paso sea claro, acogedor y a tu ritmo.",
    expectPoints: [
      "Coaching para principiantes; no necesitas experiencia previa.",
      "Un espacio solo para mujeres enfocado en seguridad, aprendizaje y confianza.",
      "Sesiones en grupos pequeños donde puedes hacer preguntas y recibir atención personal.",
    ],
    howEyebrow: "Tus próximos pasos",
    howTitle: "Comienza donde estás",
    steps: [
      ["01", "Solicita tu pase", "Crea tu cuenta de Ground Up en el portal seguro de miembros."],
      ["02", "Completa tus exenciones", "Revisa los formularios requeridos para entrenar con seguridad y confianza."],
      ["03", "Activa y reserva", "Activa tu pase, elige una clase de SKILL y una de STRENGTH, y reserva tus lugares."],
      ["04", "Ven a entrenar", "Llega con ganas de aprender. Te ayudaremos a entender qué sigue."],
    ],
    finalEyebrow: "Tu primer paso comienza aquí",
    finalTitle: "Ven a conocer Ground Up",
    finalBody: "Un Discovery Pass gratis es una forma sencilla de conocer a los coaches, probar el entrenamiento y decidir qué es adecuado para ti.",
    finalCta: "Obtener mi Discovery Pass gratis",
    languageNote: "¿Ya tienes una cuenta? Inicia sesión y continúa tu experiencia con el Discovery Pass.",
    trust: ["Sesiones guiadas", "Comunidad solo para mujeres", "Para principiantes"],
  },
} as const;

function discoveryLoginHref(locale: "en" | "es") {
  const destination = localizedPortalEntryPath("/portal/login", locale);
  const [pathname, query = ""] = destination.split("?");
  const params = new URLSearchParams(query);
  params.set("intent", "discovery-pass");

  if (typeof window !== "undefined") {
    const current = new URLSearchParams(window.location.search);
    for (const key of ATTRIBUTION_QUERY_KEYS) {
      const value = current.get(key);
      if (value) params.set(key, value.slice(0, 200));
    }
  }

  return `${pathname}?${params.toString()}`;
}

export default function DiscoveryPass() {
  const { locale } = useLocale();
  const copy = DISCOVERY_COPY[locale];
  const ctaHref = discoveryLoginHref(locale);
  const canonical = locale === "es" ? "/es/discovery-pass" : "/discovery-pass";

  useEffect(() => {
    captureAttribution();
    trackEvent("discovery_page_view", { locale });
  }, [locale]);

  const handleCta = () => {
    trackEvent("discovery_cta_click", { locale });
  };

  return (
    <>
      <SEO title={copy.seoTitle} description={copy.seoDescription} canonical={canonical} />
      <main className="overflow-hidden bg-[#0B0F14] text-white">
        <section className="relative isolate min-h-[680px] overflow-hidden border-b border-white/10">
          <img
            src={discoveryHeroImg}
            alt="Ground Up women training together"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(11,15,20,0.98)_0%,rgba(11,15,20,0.88)_42%,rgba(11,15,20,0.52)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(11,15,20,0.96)_0%,transparent_35%,rgba(11,15,20,0.25)_100%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-28">
            <div className="max-w-2xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#5EEBFF]">{copy.eyebrow}</p>
              <h1 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">{copy.title}</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-gray-200 sm:text-xl">{copy.intro}</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="min-h-14 bg-[#FFB199] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#0B0F14] shadow-[0_0_30px_rgba(255,177,153,0.2)] hover:bg-[#FFCDB9]">
                  <Link href={ctaHref} onClick={handleCta}>
                    {copy.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <a href="#included" className="inline-flex min-h-11 items-center justify-center text-sm font-bold uppercase tracking-wider text-white/80 transition-colors hover:text-[#5EEBFF]">
                  {copy.secondaryCta}
                </a>
              </div>
              <p className="mt-5 text-sm text-gray-300">{copy.noCommitment}</p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:ml-auto">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#5EEBFF]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#121826]/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5EEBFF]">{copy.offerLabel}</p>
                    <h2 className="mt-3 text-3xl font-black leading-tight text-white">{copy.offerHeadline}</h2>
                  </div>
                  <Sparkles className="h-8 w-8 shrink-0 text-[#FFB199]" aria-hidden="true" />
                </div>
                <p className="mt-5 text-sm leading-6 text-gray-300">{copy.offerBody}</p>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#5EEBFF]/25 bg-[#5EEBFF]/10 p-4">
                    <Dumbbell className="h-5 w-5 text-[#5EEBFF]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-black uppercase tracking-wide text-white">1 SKILL</p>
                  </div>
                  <div className="rounded-2xl border border-[#B06CFF]/25 bg-[#B06CFF]/10 p-4">
                    <ShieldCheck className="h-5 w-5 text-[#D0A0FF]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-black uppercase tracking-wide text-white">1 STRENGTH</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Clock3 className="h-5 w-5 text-[#FFB199]" aria-hidden="true" />
                  <p className="text-sm font-bold text-white">{copy.sevenDays}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="included" className="scroll-mt-20 border-b border-white/10 bg-[#101620] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5EEBFF]">{copy.includedEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">{copy.includedTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-gray-400">{copy.includedDescription}</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { icon: Dumbbell, title: copy.skillTitle, body: copy.skillBody, accent: "text-[#5EEBFF] border-[#5EEBFF]/20 bg-[#5EEBFF]/[0.06]" },
                { icon: ShieldCheck, title: copy.strengthTitle, body: copy.strengthBody, accent: "text-[#D0A0FF] border-[#B06CFF]/20 bg-[#B06CFF]/[0.06]" },
                { icon: CalendarDays, title: copy.daysTitle, body: copy.daysBody, accent: "text-[#FFB199] border-[#FFB199]/20 bg-[#FFB199]/[0.06]" },
              ].map(({ icon: Icon, title, body, accent }) => (
                <div key={title} className={`rounded-2xl border p-6 ${accent}`}>
                  <Icon className="h-7 w-7" aria-hidden="true" />
                  <h3 className="mt-7 text-2xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              <img src={discoveryTrainingImg} alt="Training space at Ground Up" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14]/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 flex items-center gap-3 text-sm font-bold text-white">
                <Users className="h-5 w-5 text-[#5EEBFF]" aria-hidden="true" />
                <span>{copy.trust[1]}</span>
              </div>
            </div>
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FFB199]">{copy.expectEyebrow}</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">{copy.expectTitle}</h2>
              <p className="mt-5 text-lg leading-8 text-gray-400">{copy.expectBody}</p>
              <ul className="mt-7 space-y-4">
                {copy.expectPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-base leading-7 text-gray-200">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#5EEBFF]" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#101620] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5EEBFF]">{copy.howEyebrow}</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-white sm:text-5xl">{copy.howTitle}</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {copy.steps.map(([number, title, body]) => (
                <div key={number} className="relative rounded-2xl border border-white/10 bg-[#121826] p-6">
                  <span className="text-sm font-black tracking-[0.2em] text-[#FFB199]">{number}</span>
                  <h3 className="mt-8 text-xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-gray-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B06CFF]/10 blur-3xl" />
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FFB199]">{copy.finalEyebrow}</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">{copy.finalTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">{copy.finalBody}</p>
            <Button asChild size="lg" className="mt-8 min-h-14 bg-[#FFB199] px-7 text-sm font-black uppercase tracking-[0.12em] text-[#0B0F14] hover:bg-[#FFCDB9]">
              <Link href={ctaHref} onClick={handleCta}>
                {copy.finalCta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-5 text-sm text-gray-500">{copy.languageNote}</p>
          </div>
        </section>
      </main>
    </>
  );
}