import { Link } from "wouter";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import {
  Shield, CheckCircle, ArrowRight, Star, Clock, Calendar,
  Heart, Lock, Users, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { SCHEDULE, CATEGORY_CONFIG } from "@/lib/schedule-data";
import selfDefenseFeaturedImg from "@assets/womens-sparring-3.jpg";
import { localizedPublicPath, useLocale } from "@/lib/locale";

const facilityFrame7 = "/images/facility/frame_07.jpg";
const facilityFrame1 = "/images/facility/frame_01.jpg";

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white text-sm">{question}</span>
        {open ? <ChevronUp className="h-5 w-5 text-[#FF6B8A] flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-5 text-gray-400 leading-relaxed text-sm">{answer}</p>
      </motion.div>
    </div>
  );
}

// Discovery Pass visitors need one eligible SKILL and one eligible STRENGTH
// class, so this page must show the same canonical options as the booking flow.
const womenClasses = SCHEDULE.filter((c) =>
  (c.category === "jiu-jitsu" || c.category === "strength") && !c.advanced
);

const DAY_LABELS: Record<string, string> = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

export default function WomensSelfDefense() {
  const { locale } = useLocale();
  if (locale === "es") return <SpanishWomensSelfDefense />;
  const discoveryPassPath = localizedPublicPath("/discovery-pass", locale);
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title="Women's Self-Defense Program — 8 Weeks in Oxnard, CA | Ground Up BJJ"
        description="An 8-week Women's Self-Defense program in Oxnard, CA. Learn practical techniques, build confidence, and train in a supportive women-only environment. Start with a free Discovery Pass."
        canonical="/womens-self-defense"
      />

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#1A0B1A] to-[#0B0F14]" />
        <div className="absolute inset-0">
          <img
            src={selfDefenseFeaturedImg}
            alt="Women's Self-Defense Training"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/60 to-[#0B0F14]/40" />
        </div>
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#FF6B8A]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#B06CFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF6B8A]/30 bg-[#FF6B8A]/10 text-[#FF6B8A] text-xs font-semibold uppercase tracking-wider mb-6">
              <Shield className="h-3.5 w-3.5" /> Women's Program · Oxnard, CA
            </div>

            <h1 className="break-words text-4xl font-bold leading-[0.9] mb-6 tracking-tight sm:text-5xl md:text-6xl lg:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
              <span className="text-white">8 WEEKS TO</span>
              <br />
              <span style={{ color: "#FF6B8A" }}>REAL</span>
              <br />
              <span className="text-white">SELF-DEFENSE</span>
            </h1>

            <p className="text-lg text-gray-300 mb-4 leading-relaxed max-w-xl">
              Practical techniques you'll actually use. A welcoming, women-only space. And a coach who makes sure you leave every class feeling capable.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {["No experience needed", "Women-only class", "Free Discovery Pass"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6B8A]/10 text-[#FF6B8A] border border-[#FF6B8A]/20">
                  <CheckCircle className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-base font-bold uppercase tracking-wider"
                style={{ backgroundColor: "#FF6B8A", color: "#0B0F14" }}
              >
                <Link href={discoveryPassPath}>
                  Get Your Free Discovery Pass <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-8 text-base border-white/20 text-white hover:bg-white/10 bg-transparent uppercase tracking-wider"
              >
                <Link href="/schedule">See Class Times</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHAT YOU'LL LEARN */}
      <Section className="py-24 bg-[#121826]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF6B8A]/20 bg-[#FF6B8A]/5 text-[#FF6B8A] text-xs font-semibold uppercase tracking-wider mb-4">
              Curriculum
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              WHAT YOU'LL <span style={{ color: "#FF6B8A" }}>LEARN</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              Every technique is chosen because it works in real situations — not competition or sport. You learn to protect yourself, not to fight.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: "Awareness & Prevention",
                desc: "Recognize threats before they escalate. Situational awareness is your first and most powerful defense.",
              },
              {
                icon: Lock,
                title: "Breaking Grips & Escaping",
                desc: "Step-by-step techniques to break wrist grabs, bear hugs, and chokes — regardless of size difference.",
              },
              {
                icon: Heart,
                title: "Ground Defense",
                desc: "What to do if you end up on the ground. BJJ-based techniques to create distance and get back to your feet safely.",
              },
              {
                icon: Users,
                title: "Confident Body Language",
                desc: "How to project confidence and awareness so you're less likely to be targeted in the first place.",
              },
              {
                icon: Shield,
                title: "Controlled Striking",
                desc: "Basic palm strikes and defensive strikes used to create space and opportunity to escape — not to brawl.",
              },
              {
                icon: CheckCircle,
                title: "Scenario Practice",
                desc: "Realistic role-play scenarios so the techniques become instinct, not just memory. You drill it until you own it.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="p-6 rounded-2xl border border-white/5 bg-[#0B0F14] hover:border-[#FF6B8A]/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[#FF6B8A]/10">
                  <item.icon className="h-5 w-5 text-[#FF6B8A]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2" style={{ fontFamily: "var(--font-display)" }}>{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* PROGRAM DETAILS */}
      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-xs font-semibold uppercase tracking-wider mb-6">
                Program Structure
              </div>
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-display)" }}>
                8 WEEKS. <span className="text-[#B06CFF]">STRUCTURED</span> FOR BEGINNERS.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8 text-sm">
                Every class builds on the last. You won't just memorize moves — you'll understand why they work and feel confident using them.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { label: "Program length", value: "8 weeks" },
                  { label: "Classes per week", value: "2 classes" },
                  { label: "Total classes", value: "16 sessions" },
                  { label: "Class size", value: "Max 6 students" },
                  { label: "Location", value: "Oxnard, CA" },
                  { label: "What to wear", value: "Comfortable athletic clothing" },
                  { label: "Gear needed", value: "None for your first class" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b border-white/5">
                    <span className="text-gray-500 text-sm">{row.label}</span>
                    <span className="text-white font-semibold text-sm">{row.value}</span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                size="lg"
                className="h-12 px-8 font-bold uppercase tracking-wider"
                style={{ backgroundColor: "#FF6B8A", color: "#0B0F14" }}
              >
                <Link href={discoveryPassPath}>
                  Get Your Free Discovery Pass <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#FF6B8A]/10 to-[#B06CFF]/10 rounded-2xl blur-xl" />
              <img
                src={facilityFrame7}
                alt="Women training together"
                className="relative rounded-2xl w-full aspect-[4/3] object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* CLASS SCHEDULE */}
      <Section className="py-24 bg-[#121826]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-wider mb-4">
              <Calendar className="h-3.5 w-3.5" /> Weekly Schedule
            </div>
            <h2 className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              FIND A TIME <span className="text-[#5EEBFF]">THAT WORKS</span>
            </h2>
          </div>

          <div className="space-y-3">
            {womenClasses.map((cls, i) => {
              const cfg = CATEGORY_CONFIG[cls.category];
              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                   className={`flex flex-col items-start gap-3 p-4 rounded-xl border ${cfg.border} bg-[#0B0F14] sm:flex-row sm:items-center`}
                >
                   <div className={`w-2 h-10 rounded-full flex-shrink-0 ${cfg.bg}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{cls.title}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                       <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                         <Calendar className="h-3 w-3" /> {cls.day}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                        <Clock className="h-3 w-3" /> {cls.startTime}{cls.endTime ? `–${cls.endTime}` : ""}
                      </span>
                    </div>
                  </div>
                   <Link href={discoveryPassPath} className="self-stretch sm:self-auto">
                    <Button size="sm" className="text-xs font-semibold uppercase tracking-wide flex-shrink-0 bg-[#FF6B8A]/10 text-[#FF6B8A] border border-[#FF6B8A]/20 hover:bg-[#FF6B8A]/20">
                      Book
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* TESTIMONIAL */}
      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center text-[#FF6B8A] mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}
          </div>
          <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-8" style={{ fontFamily: "var(--font-display)" }}>
            "I came in knowing absolutely nothing. The first class we did stance drills and learned how to fall safely — by the end I had real technique. Coach Raymi makes sure you never feel left behind."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-[#FF6B8A]/20 text-[#FF6B8A] border border-[#FF6B8A]/30">M</div>
            <div className="text-left">
              <div className="text-white font-semibold text-sm">Maria G.</div>
              <div className="text-gray-500 text-xs">Women's Self-Defense, Oxnard CA</div>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="py-24 bg-[#121826]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: "var(--font-display)" }}>
            COMMON <span style={{ color: "#FF6B8A" }}>QUESTIONS</span>
          </h2>
          <div className="space-y-3">
            <FAQ question="Do I need any martial arts experience?" answer="None at all. The program is designed from the ground up for complete beginners. Every technique is introduced step by step." />
            <FAQ question="Is it a women-only class?" answer="Yes. All Women's Self-Defense sessions are women-only spaces. The goal is for you to feel completely comfortable and focused on learning." />
            <FAQ question="What should I wear to my first class?" answer="Comfortable athletic clothing — leggings, shorts, a t-shirt. No shoes on the mat. You don't need a gi or any special gear for your trial class." />
            <FAQ question="Will I have to spar or fight anyone?" answer="No. Especially not in your first class. You'll drill techniques with a partner in a controlled, collaborative way — never competitive sparring until you're ready." />
            <FAQ question="What if I miss a class during the 8 weeks?" answer="Life happens. Coach Raymi works with students individually to make up missed material. The small class size makes this possible." />
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B8A]/5 via-transparent to-[#B06CFF]/5" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
             FREE DISCOVERY PASS <span style={{ color: "#FF6B8A" }}>START HERE</span>
          </h2>
          <p className="text-gray-400 mb-10 max-w-md mx-auto">
             Create an account, complete the required forms, activate your pass, then book one eligible SKILL class and one eligible STRENGTH class. Use it within seven days of activation.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 px-12 text-base font-bold uppercase tracking-wider"
            style={{ backgroundColor: "#FF6B8A", color: "#0B0F14" }}
          >
            <Link href={discoveryPassPath}>
               Get Your Free Discovery Pass <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-gray-600 text-xs mt-4">No credit card required · Oxnard, CA · (786) 757-1175</p>
        </div>
      </Section>
    </div>
  );
}

function SpanishWomensSelfDefense() {
  const schedulePath = localizedPublicPath("/schedule", "es");
  const contactPath = localizedPublicPath("/contact", "es");
  const discoveryPassPath = localizedPublicPath("/discovery-pass", "es");
  const curriculum = [
    ["Conciencia y prevención", "Reconoce las amenazas antes de que escalen. La conciencia situacional es tu primera y más poderosa defensa."],
    ["Romper agarres y escapar", "Técnicas paso a paso para soltarte de agarres de muñeca, abrazos y estrangulamientos, sin importar la diferencia de tamaño."],
    ["Defensa en el suelo", "Qué hacer si terminas en el suelo. Técnicas basadas en BJJ para crear distancia y volver a ponerte de pie."],
    ["Lenguaje corporal seguro", "Cómo proyectar confianza y atención para reducir la posibilidad de ser elegida como objetivo."],
    ["Golpes controlados", "Golpes básicos con la palma para crear espacio y una oportunidad de escapar, no para pelear."],
    ["Práctica con escenarios", "Situaciones realistas para que las técnicas se vuelvan instinto, no solo memoria. Practica hasta hacerlas tuyas."],
  ];
  return (
    <div className="flex flex-col bg-[#0B0F14]">
       <SEO title="Programa de Defensa Personal para Mujeres — 8 Semanas en Oxnard | Ground Up" description="Aprende técnicas prácticas de defensa personal en un ambiente comprensivo solo para mujeres en Oxnard. Comienza con un Discovery Pass gratis." canonical="/es/womens-self-defense" />
      <section className="relative min-h-[80vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#1A0B1A] to-[#0B0F14]" /><img src={selfDefenseFeaturedImg} alt="Entrenamiento de defensa personal para mujeres" className="absolute inset-0 w-full h-full object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/70 to-[#0B0F14]/40" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full"><div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF6B8A]/30 bg-[#FF6B8A]/10 text-[#FF6B8A] text-xs font-semibold uppercase tracking-wider mb-6"><Shield className="h-3.5 w-3.5" /> Programa para mujeres · Oxnard, CA</div>
          <h1 className="break-words text-4xl font-bold leading-[.9] mb-6 sm:text-5xl md:text-6xl lg:text-7xl" style={{ fontFamily: "var(--font-display)" }}><span className="text-white">8 SEMANAS PARA</span><br /><span className="text-[#FF6B8A]">DEFENDERTE</span><br /><span className="text-white">EN LA VIDA REAL</span></h1>
          <p className="text-lg text-gray-300 mb-8 leading-relaxed">Técnicas prácticas que realmente usarás. Un espacio acogedor solo para mujeres y una coach que se asegura de que salgas de cada clase sintiéndote capaz.</p>
           <div className="flex flex-col sm:flex-row gap-4"><Button asChild size="lg" className="h-14 px-8 font-bold uppercase tracking-wider bg-[#FF6B8A] text-[#0B0F14]"><Link href={discoveryPassPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-5 w-5" /></Link></Button><Button asChild variant="outline" size="lg" className="h-14 border-white/20 text-white bg-transparent"><Link href={schedulePath}>Ver horarios</Link></Button></div>
        </div></div>
      </section>
      <Section className="py-24 bg-[#121826]"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-14"><div className="inline-flex px-4 py-1.5 rounded-full border border-[#FF6B8A]/20 bg-[#FF6B8A]/5 text-[#FF6B8A] text-xs font-semibold uppercase tracking-wider mb-4">Plan de estudios</div><h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>LO QUE <span className="text-[#FF6B8A]">APRENDERÁS</span></h2><p className="text-gray-400 max-w-lg mx-auto text-sm">Cada técnica se elige porque funciona en situaciones reales, no para competir. Aprendes a protegerte, no a pelear.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{curriculum.map(([title, desc], i) => { const icons = [Shield, Lock, Heart, Users, Shield, CheckCircle]; const Icon = icons[i]; return <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 rounded-2xl border border-white/5 bg-[#0B0F14]"><div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[#FF6B8A]/10"><Icon className="h-5 w-5 text-[#FF6B8A]" /></div><h3 className="text-white font-bold text-sm mb-2">{title}</h3><p className="text-gray-500 text-xs leading-relaxed">{desc}</p></motion.div>; })}</div></div></Section>
       <Section className="py-24 bg-[#0B0F14]"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid lg:grid-cols-2 gap-12 items-center"><div><div className="inline-flex px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-xs font-semibold uppercase tracking-wider mb-6">Estructura del programa</div><h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-display)" }}>8 SEMANAS. <span className="text-[#B06CFF]">DISEÑADAS</span> PARA PRINCIPIANTES.</h2><p className="text-gray-400 leading-relaxed mb-8 text-sm">Cada clase se construye sobre la anterior. No solo memorizarás movimientos: entenderás por qué funcionan y ganarás confianza para usarlos.</p><div className="space-y-4 mb-8">{[["Duración", "8 semanas"], ["Clases por semana", "2 clases"], ["Clases totales", "16 sesiones"], ["Tamaño de clase", "Máximo 6 estudiantes"], ["Ubicación", "Oxnard, CA"], ["Qué usar", "Ropa deportiva cómoda"], ["Equipo", "Ninguno para tu primera clase"]].map(([label, value]) => <div key={label} className="flex items-center justify-between py-3 border-b border-white/5"><span className="text-gray-500 text-sm">{label}</span><span className="text-white font-semibold text-sm">{value}</span></div>)}</div><Button asChild size="lg" className="bg-[#FF6B8A] text-[#0B0F14] font-bold uppercase tracking-wider"><Link href={discoveryPassPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><img src={facilityFrame7} alt="Mujeres entrenando juntas" className="rounded-2xl w-full aspect-[4/3] object-cover border border-white/10" /></div></div></Section>
       <Section className="py-24 bg-[#121826]">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-12">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-wider mb-4">
               <Calendar className="h-3.5 w-3.5" /> Horarios elegibles
             </div>
             <h2 className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
               ELIGE UN HORARIO <span className="text-[#5EEBFF]">PARA TI</span>
             </h2>
             <p className="text-gray-400 text-sm mt-4 max-w-xl mx-auto">
               El Discovery Pass incluye una clase de SKILL y una de STRENGTH dentro de los siete días de activación. La disponibilidad se confirma en el calendario en vivo.
             </p>
           </div>
           <div className="space-y-3">
             {womenClasses.map((cls) => {
               const cfg = CATEGORY_CONFIG[cls.category];
               return (
                 <div key={cls.id} className={`flex flex-col items-start gap-3 p-4 rounded-xl border ${cfg.border} bg-[#0B0F14] sm:flex-row sm:items-center`}>
                   <div className={`w-2 h-10 rounded-full flex-shrink-0 ${cfg.bg}`} />
                   <div className="flex-1 min-w-0">
                     <div className="text-white font-semibold text-sm">{cls.title}</div>
                     <div className="flex items-center gap-3 mt-0.5">
                       <span className={`flex items-center gap-1 text-xs ${cfg.color}`}><Calendar className="h-3 w-3" /> {DAY_LABELS[cls.day]}</span>
                       <span className={`flex items-center gap-1 text-xs ${cfg.color}`}><Clock className="h-3 w-3" /> {cls.startTime}{cls.endTime ? `–${cls.endTime}` : ""}</span>
                     </div>
                   </div>
                   <Link href={discoveryPassPath} className="self-stretch sm:self-auto">
                     <Button size="sm" className="w-full text-xs font-semibold uppercase tracking-wide bg-[#FF6B8A]/10 text-[#FF6B8A] border border-[#FF6B8A]/20 hover:bg-[#FF6B8A]/20">Reservar</Button>
                   </Link>
                 </div>
               );
             })}
           </div>
         </div>
       </Section>
       <Section className="py-24 bg-[#0B0F14]">
         <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <div className="flex justify-center text-[#FF6B8A] mb-6">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
           <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-8" style={{ fontFamily: "var(--font-display)" }}>
             “Llegué sin saber absolutamente nada. En la primera clase aprendí a moverme y caer de forma segura. Coach Raymi hizo que me sintiera capaz desde el primer día.”
           </blockquote>
           <div className="text-white font-semibold text-sm">María G.</div>
           <div className="text-gray-500 text-xs mt-1">Defensa personal para mujeres, Oxnard</div>
         </div>
       </Section>
       <Section className="py-24 bg-[#121826]">
         <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: "var(--font-display)" }}>PREGUNTAS <span className="text-[#FF6B8A]">COMUNES</span></h2>
           <div className="space-y-3">
             <FAQ question="¿Necesito experiencia en artes marciales?" answer="No. El programa está diseñado desde cero para principiantes y cada técnica se enseña paso a paso." />
             <FAQ question="¿Las clases son solo para mujeres?" answer="Sí. Son espacios solo para mujeres, diseñados para que entrenes con comodidad y concentración." />
             <FAQ question="¿Qué debo llevar?" answer="Ropa deportiva cómoda. No necesitas uniforme, zapatos en el tatami ni equipo especial para tu primera clase." />
             <FAQ question="¿Tendré que pelear o hacer sparring?" answer="No. Practicarás con una compañera de forma controlada y colaborativa, sin sparring competitivo." />
             <FAQ question="¿Qué pasa si no puedo ir a una clase?" answer="Habla con Coach Raymi para revisar el material y elegir el siguiente paso disponible." />
           </div>
         </div>
       </Section>
       <Section className="py-24 bg-[#0B0F14] relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B8A]/5 via-transparent to-[#B06CFF]/5" />
         <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>DISCOVERY PASS <span className="text-[#FF6B8A]">GRATIS</span></h2>
           <p className="text-gray-400 mb-10 max-w-md mx-auto">Crea tu cuenta, completa los formularios, activa tu pase y reserva una clase elegible de SKILL y otra de STRENGTH dentro de siete días.</p>
           <Button asChild size="lg" className="h-14 px-12 text-base font-bold uppercase tracking-wider bg-[#FF6B8A] text-[#0B0F14]"><Link href={discoveryPassPath}>Obtén tu Discovery Pass gratis <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
           <p className="text-gray-600 text-xs mt-4">Sin tarjeta de crédito · Oxnard, CA · (786) 757-1175</p>
         </div>
       </Section>
       <section className="py-20 px-4 bg-[#121826] border-y border-white/5"><div className="max-w-2xl mx-auto text-center"><h2 className="text-3xl font-bold text-white mb-4">¿Tienes preguntas?</h2><p className="text-gray-400 mb-7">La elegibilidad, el horario y la disponibilidad se confirman antes de reservar. Escríbenos y te ayudaremos a elegir el siguiente paso.</p><Button asChild variant="outline" className="border-white/15 text-white"><Link href={contactPath}>Contacta a Ground Up</Link></Button></div></section>
    </div>
  );
}
