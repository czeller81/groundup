import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import SEO from "@/components/seo";
import { localizedPublicPath, useLocale } from "@/lib/locale";

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-white transition-colors"
      >
        <span className={`text-sm font-medium leading-snug transition-colors ${open ? "text-white" : "text-gray-300"}`}>{question}</span>
        {open ? <ChevronUp className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-400 text-sm leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MEMBERSHIP_PLANS = [
  {
    name: "Ground Up 2",
    spanishName: "Ground Up 2",
    price: "$139",
    description: "Two adult group sessions per week.",
    spanishDescription: "Dos sesiones grupales para adultas por semana.",
    accent: "#5EEBFF",
  },
  {
    name: "Ground Up 3",
    spanishName: "Ground Up 3",
    price: "$159",
    description: "Three adult group sessions per week.",
    spanishDescription: "Tres sesiones grupales para adultas por semana.",
    accent: "#B06CFF",
  },
  {
    name: "Ground Up Personal",
    spanishName: "Ground Up Personal",
    price: "$250",
    description: "One private coaching session per week. Group classes are not included.",
    spanishDescription: "Una sesión privada de coaching por semana. No incluye clases grupales.",
    accent: "#FFB199",
  },
  {
    name: "Girls Program",
    spanishName: "Programa para niñas",
    price: "$119",
    description: "Two girls’ classes per week for an approved minor participant.",
    spanishDescription: "Dos clases para niñas por semana para una participante menor aprobada.",
    accent: "#5EEBFF",
  },
] as const;

const PLAN_FIT_GUIDANCE = [
  ["Ground Up 2", "A clear fit if you want two adult group sessions each week.", "#5EEBFF"],
  ["Ground Up 3", "A clear fit if you want three adult group sessions each week.", "#B06CFF"],
  ["Ground Up Personal", "For one private coaching session each week. Group classes are not included.", "#FFB199"],
  ["Girls Program", "For an approved minor participant attending two girls’ classes each week.", "#5EEBFF"],
] as const;

const TRUST_POINTS = [
  "Coach Raymi is a Purple Belt, 3rd Degree.",
  "Training is promoted under the Gracie Barra lineage.",
  "Classes are kept small, with a maximum of six students.",
] as const;

const SPANISH_PLAN_FIT = [
  ["Ground Up 2", "Para quienes quieren dos sesiones grupales para adultas cada semana.", "#5EEBFF"],
  ["Ground Up 3", "Para quienes quieren tres sesiones grupales para adultas cada semana.", "#B06CFF"],
  ["Ground Up Personal", "Para una sesión privada de coaching cada semana. No incluye clases grupales.", "#FFB199"],
  ["Programa para niñas", "Para una participante menor aprobada que asiste a dos clases para niñas cada semana.", "#5EEBFF"],
] as const;

export default function Pricing() {
  const { locale } = useLocale();
  if (locale === "es") return <SpanishPricing />;
  const discoveryPassPath = localizedPublicPath("/discovery-pass", "en");
  return (
    <div className="flex flex-col bg-[#0B0F14] min-h-screen">
      <SEO
        title="Women-Only Training Programs in Oxnard | Ground Up"
        description="Explore women-only Brazilian Jiu-Jitsu, practical self-defense, strength, movement, and personal coaching at Ground Up in Oxnard. Beginner-friendly and no experience required."
        canonical="/pricing"
      />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#5EEBFF]/5 blur-[80px] rounded-full pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h1 className="break-words text-3xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: 'var(--font-display)' }}>
            Start Your Training<br />at <span className="text-[#5EEBFF]">Ground Up</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            A women-only training center for Brazilian Jiu-Jitsu, practical self-defense, strength, movement, and personal coaching. Beginners are welcome, and no prior experience is required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
              <Link href={discoveryPassPath}>Get Your Free Discovery Pass <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 px-8 uppercase tracking-wider">
              <Link href="/schedule">View Schedule</Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {["Beginner friendly", "Small classes", "Safe, supportive coaching"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-gray-400">
                <CheckCircle className="h-3.5 w-3.5 text-[#5EEBFF]" />{t}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Membership pricing</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
              Clear monthly <span className="text-[#5EEBFF]">options</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
              Memberships are billed monthly. Access and weekly session limits depend on the plan; youth eligibility is confirmed before enrollment.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERSHIP_PLANS.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <div className="mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: plan.accent }} />
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <p className="mt-4 text-3xl font-black text-white">{plan.price}<span className="text-sm font-normal text-gray-500"> / month</span></p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{plan.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLAN FIT ── */}
      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Choose your starting point</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
              Which plan <span className="text-[#B06CFF]">fits?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
              Each plan is built around a specific weekly rhythm. Contact us if you want help confirming the right option before enrolling.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_FIT_GUIDANCE.map(([title, description, accent], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <div className="mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Before you enroll</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
              What’s <span className="text-[#5EEBFF]">included</span>
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Monthly plan access", "Memberships are billed monthly, with access determined by the plan you choose."],
              ["Weekly session limits", "Ground Up 2, Ground Up 3, Ground Up Personal, and Girls Program each have the weekly rhythm shown above."],
              ["Eligibility confirmed", "Girls Program participation is confirmed before enrollment. Contact us with questions about youth availability."],
              ["Private training by contact", "Ground Up Personal availability is coordinated around your goals and confirmed before booking."],
            ].map(([title, description], index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="flex h-full gap-3 rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5EEBFF]" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/5">
              <Link href="/contact">Questions about fit or availability? Contact us</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="border-t border-white/5 bg-[#121826] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Real coaching, real community</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
              Train with <span className="text-[#FFB199]">confidence</span>
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {TRUST_POINTS.map((point, index) => (
              <Reveal key={point} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#0B0F14] p-5">
                  <CheckCircle className="mb-4 h-5 w-5 text-[#FFB199]" />
                  <p className="text-sm leading-relaxed text-gray-300">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Who We Serve</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Training Built Around <span className="text-[#5EEBFF]">You</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {[
               { icon: "🥋", title: "Women", desc: "A safe, empowering space built specifically for women of all skill levels.", href: discoveryPassPath, cta: "Get Your Free Discovery Pass" },
               { icon: "⭐", title: "Girls / Female Youth", desc: "Ask about the current girls program and family participation options.", href: "/contact", cta: "Ask About Eligibility" },
               { icon: "👋", title: "Beginners", desc: "No experience needed — ever. We guide you from day one.", href: discoveryPassPath, cta: "Get Your Free Discovery Pass" },
               { icon: "💪", title: "Strength & Conditioning", desc: "Functional fitness training designed for athletes and everyday movers.", href: discoveryPassPath, cta: "Get Your Free Discovery Pass" },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.07}>
                <div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826] hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5">
                  <span className="text-2xl mb-4">{card.icon}</span>
                  <h3 className="text-white font-bold text-base mb-2">{card.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-5">{card.desc}</p>
                  <Button asChild size="sm" variant="ghost" className="w-full border border-white/8 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-semibold uppercase tracking-wider">
                     <Link href={card.href}>{card.cta}</Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR PROGRAMS ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-10">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Programs</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Our <span className="text-[#B06CFF]">Core Programs</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
             {[
              {
                title: "Women's Jiu-Jitsu & Self-Defense",
                desc: "Practical jiu-jitsu and self-defense taught in a welcoming, women-only environment. Build skill, confidence, and community.",
                note: "8-week self-defense program available · Women-only classes weekly",
                accent: "#B06CFF",
                 href: discoveryPassPath,
                 cta: "Get Your Free Discovery Pass",
              },
              {
                 title: "Girls / Mother + Daughter",
                 desc: "A women-centered youth path for girls and female youth. Ask about current eligibility, guardian requirements, and mother-daughter participation.",
                 note: "Eligibility confirmed before booking",
                accent: "#FFB199",
                  href: "/contact",
                  cta: "Ask About Eligibility",
              },
              {
                title: "Strength & Conditioning",
                 desc: "Useful strength, mobility, and movement for women at every starting point. Build capability without a bodybuilding or fight-gym atmosphere.",
                 note: "Beginner-friendly · Women-only",
                accent: "#5EEBFF",
                  href: discoveryPassPath,
                  cta: "Get Your Free Discovery Pass",
              },
            ].map((prog, i) => (
              <Reveal key={prog.title} delay={i * 0.09}>
                <div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826] hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="w-1 h-8 rounded-full mb-4" style={{ backgroundColor: prog.accent }} />
                  <h3 className="text-white font-bold text-base mb-3 leading-snug">{prog.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4">{prog.desc}</p>
                  <p className="text-xs mb-5" style={{ color: prog.accent }}>{prog.note}</p>
                  <Button asChild size="sm" className="w-full font-bold text-[#0B0F14] hover:opacity-90 text-xs uppercase tracking-wider" style={{ backgroundColor: prog.accent }}>
                     <Link href={prog.href}>{prog.cta}</Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED STARTING POINT ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="relative rounded-3xl border border-[#B06CFF]/25 bg-gradient-to-br from-[#B06CFF]/8 via-[#121826] to-[#121826] p-8 sm:p-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#B06CFF]/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs text-[#B06CFF] uppercase tracking-widest font-semibold mb-4">Best Place to Start</p>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  Women's Self-Defense<br />8-Week Program
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 max-w-lg">
                  This program was designed for women who want practical, real-world skills and genuine confidence — not just fitness. In 8 weeks you'll build awareness, technique, and the kind of calm that comes from knowing you can handle yourself.
                </p>
                <div className="space-y-2.5 mb-7">
                  {["No experience needed — complete beginners welcome", "16 sessions over 8 weeks, 2 classes per week", "Women-only environment — safe, supportive, judgment-free"].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-[#B06CFF] flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold uppercase tracking-wider hover:bg-[#B06CFF]/90">
                   <Link href={discoveryPassPath}>Get Your Free Discovery Pass <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal className="mb-10">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Zero Pressure</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
               How the Free Discovery Pass <span className="text-[#FFB199]">Works</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {[
              { num: "01", title: "Create an account", desc: "Start through the secure member portal.", color: "#5EEBFF" },
              { num: "02", title: "Complete forms", desc: "Finish the required forms before activation.", color: "#B06CFF" },
              { num: "03", title: "Activate and book", desc: "Book one eligible SKILL class and one STRENGTH class.", color: "#FFB199" },
              { num: "04", title: "Use it in 7 days", desc: "Arrive ready to learn and use both entitlements before the pass expires.", color: "#5EEBFF" },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 0.1}>
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: `${step.color}15`, color: step.color, border: `1px solid ${step.color}25` }}>
                    {step.num}
                  </div>
                  <h3 className="text-white font-bold text-base">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
           <p className="text-gray-500 text-sm italic mb-6">No membership commitment is required to start the pass.</p>
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
               <Link href={discoveryPassPath}>Get Your Free Discovery Pass <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Common <span className="text-[#5EEBFF]">Questions</span>
            </h2>
          </Reveal>
          <Reveal>
            <div className="bg-[#121826] rounded-2xl border border-white/8 px-6">
              {[
                { question: "Do I need experience to join?",         answer: "Not at all. Every program is built for beginners. You'll start from the basics in a safe, supportive environment — no prior experience required." },
                 { question: "How does the Free Discovery Pass work?", answer: "Create an account, complete the required forms, activate the pass, then book one eligible SKILL class and one eligible STRENGTH class. Use both within seven days of activation." },
                { question: "Who are your classes designed for?",    answer: "Ground Up is a women-only training center. Women of all experience levels are welcome, including complete beginners. Ask us about current girls/female-youth availability and mother-daughter options." },
                 { question: "What should I wear?",                   answer: "Comfortable workout clothes work great for your first class. We'll guide you on any gear you might need once you've chosen a program." },
                 { question: "How do I know which program is right?", answer: "Review the live schedule and contact us if you need help choosing an eligible class. The Discovery Pass is for one SKILL class and one STRENGTH class." },
                { question: "Do you offer girls or mother-daughter training?", answer: "Youth availability and age eligibility are confirmed before booking so we do not give families outdated information. Contact us to ask about the current girls/female-youth and mother-daughter options." },
              ].map((faq, i) => <FAQ key={i} question={faq.question} answer={faq.answer} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-4 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#5EEBFF]/4 blur-[100px] rounded-full pointer-events-none" />
        <Reveal className="relative z-10 max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to <span className="text-[#FFB199]">Begin?</span>
          </h2>
          <p className="text-gray-400 text-base mb-8">
             Get your free Discovery Pass and follow the four steps online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
               <Link href={discoveryPassPath}>Get Your Free Discovery Pass <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-white hover:bg-white/5 px-8 uppercase tracking-wider">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
           <p className="text-gray-600 text-xs mt-6">Women-only training · Beginner-friendly · Oxnard, CA</p>
        </Reveal>
      </section>

    </div>
  );
}

function SpanishPricingDetails({ contactPath }: { contactPath: string }) {
  return (
    <>
      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Elige tu punto de partida</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">¿Qué plan <span className="text-[#B06CFF]">te queda?</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">Cada plan está diseñado para un ritmo semanal específico. Contáctanos si quieres confirmar la opción correcta antes de inscribirte.</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SPANISH_PLAN_FIT.map(([title, description, accent], i) => (
              <Reveal key={title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <div className="mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Antes de inscribirte</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">¿Qué <span className="text-[#5EEBFF]">incluye?</span></h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Acceso al plan mensual", "Las membresías se cobran mensualmente y el acceso depende del plan que elijas."],
              ["Límites semanales", "Cada plan tiene el ritmo semanal mostrado arriba."],
              ["Elegibilidad confirmada", "La participación en el Programa para niñas se confirma antes de inscribirse. Contáctanos sobre disponibilidad juvenil."],
              ["Entrenamiento personal por contacto", "La disponibilidad de Ground Up Personal se coordina según tus objetivos y se confirma antes de reservar."],
            ].map(([title, description], i) => (
              <Reveal key={title} delay={i * 0.06}>
                <div className="flex h-full gap-3 rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5EEBFF]" />
                  <div><h3 className="text-sm font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-gray-400">{description}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8 text-center">
            <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/5">
              <Link href={contactPath}>¿Preguntas sobre el plan o la disponibilidad? Contáctanos</Link>
            </Button>
          </Reveal>
        </div>
      </section>
      <section className="border-t border-white/5 bg-[#121826] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Coaching y comunidad reales</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Entrena con <span className="text-[#FFB199]">confianza</span></h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Coach Raymi es cinturón morado, tercer grado.", "Entrenamiento bajo el linaje Gracie Barra.", "Clases pequeñas, con un máximo de seis estudiantes."].map((point, i) => (
              <Reveal key={point} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#0B0F14] p-5"><CheckCircle className="mb-4 h-5 w-5 text-[#FFB199]" /><p className="text-sm leading-relaxed text-gray-300">{point}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SpanishPricing() {
  const discoveryPassPath = localizedPublicPath("/discovery-pass", "es");
  const bookPath = discoveryPassPath;
  const schedulePath = localizedPublicPath("/schedule", "es");
  const contactPath = localizedPublicPath("/contact", "es");
  const faqs = [
    ["¿Necesito experiencia para unirme?", "Para nada. Todos los programas están hechos para principiantes y comenzarás con lo básico en un ambiente seguro y comprensivo."],
    ["¿Cómo funciona el Discovery Pass gratis?", "Crea una cuenta, completa los formularios requeridos, activa el pase y reserva una clase elegible de SKILL y una de STRENGTH. Usa ambas dentro de los siete días posteriores a la activación."],
    ["¿Para quién están diseñadas las clases?", "Ground Up es un centro de entrenamiento solo para mujeres. Pregunta por disponibilidad actual para niñas, jóvenes femeninas y opciones madre-hija."],
    ["¿Qué debo usar?", "La ropa deportiva cómoda funciona muy bien para tu primera clase. Te orientaremos sobre el equipo después."],
    ["¿Cómo sé qué programa es adecuado?", "Consulta el horario en vivo y contáctanos si necesitas ayuda para elegir una clase elegible. El Discovery Pass incluye una clase de SKILL y una de STRENGTH."],
  ];
  const audience = [
    ["🥋", "Mujeres", "Un espacio seguro y empoderador creado para mujeres de todos los niveles."],
    ["⭐", "Niñas / jóvenes femeninas", "Pregunta por el programa actual y las opciones de participación familiar."],
    ["👋", "Principiantes", "Nunca necesitas experiencia. Te guiamos desde el primer día."],
    ["💪", "Fuerza y acondicionamiento", "Entrenamiento funcional para atletas y personas que quieren moverse mejor."],
  ];
  const programs = [
    ["Jiu-jitsu y defensa personal para mujeres", "Jiu-jitsu y defensa personal prácticos en un ambiente acogedor solo para mujeres.", "Programa de defensa personal de 8 semanas · Clases semanales", "#B06CFF"],
    ["Niñas / madre + hija", "Un camino juvenil centrado en mujeres para niñas y jóvenes femeninas. Pregunta por elegibilidad y requisitos de tutoría.", "Elegibilidad confirmada antes de reservar", "#FFB199"],
    ["Fuerza y acondicionamiento", "Fuerza, movilidad y movimiento útiles para mujeres en cualquier punto de partida.", "Para principiantes · Solo para mujeres", "#5EEBFF"],
  ];
  return (
    <div className="flex flex-col bg-[#0B0F14] min-h-screen">
      <SEO title="Programas de Entrenamiento Solo para Mujeres en Oxnard | Ground Up" description="Explora jiu-jitsu brasileño, defensa personal práctica, fuerza, movimiento y coaching personal solo para mujeres en Ground Up, Oxnard." canonical="/es/pricing" />
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="break-words text-3xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: "var(--font-display)" }}>Comienza tu entrenamiento<br />en <span className="text-[#5EEBFF]">Ground Up</span></h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">Un centro de entrenamiento solo para mujeres para jiu-jitsu brasileño, defensa personal práctica, fuerza, movimiento y coaching personal. Las principiantes son bienvenidas.</p>
           <div className="flex flex-col sm:flex-row gap-3 justify-center">
               <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider"><Link href={discoveryPassPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="ghost" size="lg" className="border border-white/10 text-gray-300"><Link href={schedulePath}>Ver horario</Link></Button>
          </div>
        </div>
      </section>
      <SpanishPricingDetails contactPath={contactPath} />
      <section className="border-t border-white/5 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Precios de membresía</p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Opciones mensuales <span className="text-[#5EEBFF]">claras</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">Las membresías se cobran mensualmente. El acceso y los límites semanales dependen del plan; la elegibilidad juvenil se confirma antes de inscribirse.</p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERSHIP_PLANS.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 0.06}>
                <div className="h-full rounded-2xl border border-white/8 bg-[#121826] p-5">
                  <div className="mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: plan.accent }} />
                  <h3 className="text-base font-bold text-white">{plan.spanishName}</h3>
                  <p className="mt-4 text-3xl font-black text-white">{plan.price}<span className="text-sm font-normal text-gray-500"> / mes</span></p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{plan.spanishDescription}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 px-4 border-t border-white/5"><div className="max-w-4xl mx-auto"><Reveal className="text-center mb-10"><p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">A quién servimos</p><h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Entrenamiento hecho para <span className="text-[#5EEBFF]">ti</span></h2></Reveal><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{audience.map(([icon, title, desc], i) => <Reveal key={title} delay={i * .07}><div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826]"><span className="text-2xl mb-4">{icon}</span><h3 className="text-white font-bold text-base mb-2">{title}</h3><p className="text-gray-400 text-sm leading-relaxed flex-1">{desc}</p><Button asChild size="sm" variant="ghost" className="mt-5 border border-white/8 text-gray-300"><Link href={title.startsWith("Niñas") ? contactPath : bookPath}>{title.startsWith("Niñas") ? "Pregunta sobre elegibilidad" : "Obtén tu Discovery Pass"}</Link></Button></div></Reveal>)}</div></div></section>
       <section className="py-16 px-4 border-t border-white/5"><div className="max-w-4xl mx-auto"><Reveal className="text-center mb-10"><p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Programas</p><h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Nuestros <span className="text-[#B06CFF]">programas principales</span></h2></Reveal><div className="grid sm:grid-cols-3 gap-5">{programs.map(([title, desc, note, accent], i) => <Reveal key={title} delay={i * .09}><div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826]"><div className="w-1 h-8 rounded-full mb-4" style={{ backgroundColor: accent }} /><h3 className="text-white font-bold text-base mb-3">{title}</h3><p className="text-gray-400 text-sm leading-relaxed flex-1">{desc}</p><p className="text-xs my-5" style={{ color: accent }}>{note}</p><Button asChild size="sm" className="w-full font-bold text-[#0B0F14]" style={{ backgroundColor: accent }}><Link href={title.startsWith("Niñas") ? contactPath : bookPath}>{title.startsWith("Niñas") ? "Pregunta sobre elegibilidad" : "Obtén tu Discovery Pass"}</Link></Button></div></Reveal>)}</div></div></section>
       <section className="py-16 px-4 border-t border-white/5"><div className="max-w-3xl mx-auto"><Reveal><div className="rounded-3xl border border-[#B06CFF]/25 bg-[#121826] p-8 sm:p-10"><p className="text-xs text-[#B06CFF] uppercase tracking-widest font-semibold mb-4">Mejor lugar para comenzar</p><h2 className="text-2xl sm:text-3xl font-black text-white uppercase leading-none mb-4">Programa de defensa personal para mujeres de 8 semanas</h2><p className="text-gray-300 text-sm leading-relaxed mb-5">Desarrolla conciencia, técnica y la calma que nace de saber que puedes cuidarte. Sin experiencia previa y sin ambiente de pelea.</p><div className="space-y-2.5 mb-7">{["No se necesita experiencia · Principiantes bienvenidas", "16 sesiones durante 8 semanas", "Ambiente solo para mujeres · Seguro y sin juicios"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle className="h-4 w-4 text-[#B06CFF]" /><span className="text-gray-300 text-sm">{item}</span></div>)}</div><Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold uppercase tracking-wider"><Link href={bookPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></Reveal></div></section>
       <section className="py-16 px-4 border-t border-white/5"><div className="max-w-3xl mx-auto"><Reveal className="text-center mb-8"><p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Sin presión</p><h2 className="text-2xl font-black text-white uppercase tracking-tight">Cómo funciona el <span className="text-[#FFB199]">Discovery Pass gratis</span></h2></Reveal><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">{[["01", "Crea una cuenta", "Comienza en el portal seguro de miembros."], ["02", "Completa los formularios", "Termina los formularios requeridos antes de activar."], ["03", "Activa y reserva", "Reserva una clase elegible de SKILL y una de STRENGTH."], ["04", "Úsalo en 7 días", "Llega lista para aprender y usa ambos beneficios antes de que venza."]].map(([num, title, desc]) => <div key={num} className="text-center"><div className="mx-auto mb-3 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-[#FFB199] bg-[#FFB199]/10">{num}</div><h3 className="text-white font-bold">{title}</h3><p className="text-gray-400 text-sm mt-2">{desc}</p></div>)}</div><p className="text-gray-500 text-sm italic text-center mb-6">No necesitas comprometerte con una membresía para comenzar el pase.</p><div className="text-center"><Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider"><Link href={bookPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></section>
      <section className="py-16 px-4 border-t border-white/5"><div className="max-w-2xl mx-auto"><Reveal className="text-center mb-8"><h2 className="text-2xl font-black text-white uppercase tracking-tight">Preguntas <span className="text-[#5EEBFF]">frecuentes</span></h2></Reveal><div className="bg-[#121826] rounded-2xl border border-white/8 px-6">{faqs.map(([question, answer], i) => <FAQ key={i} question={question} answer={answer} />)}</div><div className="text-center mt-8"><Button asChild variant="outline" className="border-white/15 text-white"><Link href={contactPath}>¿Todavía tienes preguntas? Contáctanos</Link></Button></div></div></section>
    </div>
  );
}
