import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  ArrowRight, ChevronDown, ChevronUp, CheckCircle, Shield, Dumbbell,
  Star, Users, Zap, Heart, Clock, CalendarCheck, Smile, ChevronRight
} from "lucide-react";

function Section({ children, className = "", delay = 0, id }: { children: React.ReactNode; className?: string; delay?: number; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded-2xl overflow-hidden bg-[#121826]/60 hover:border-white/15 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/3 transition-colors gap-4"
      >
        <span className="font-semibold text-white text-sm leading-snug">{question}</span>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${open ? "bg-[#5EEBFF]/15" : "bg-white/5"}`}>
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-[#5EEBFF]" />
            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROGRAMS = [
  {
    id: "self-defense",
    name: "Women's Self-Defense",
    badge: "Most Popular",
    badgeColor: "text-[#B06CFF] bg-[#B06CFF]/10 border-[#B06CFF]/25",
    accent: "#B06CFF",
    accentBg: "bg-[#B06CFF]/10",
    accentBorder: "border-[#B06CFF]/25",
    for: "Women · All levels",
    description: "Build real confidence and practical skills in a safe, women-only environment. No experience needed.",
    tags: ["Women Only", "Beginners Welcome", "8-Week Program"],
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "womens-bjj",
    name: "Women's Jiu-Jitsu",
    badge: "Women Only",
    badgeColor: "text-[#B06CFF] bg-[#B06CFF]/10 border-[#B06CFF]/25",
    accent: "#B06CFF",
    accentBg: "bg-[#B06CFF]/10",
    accentBorder: "border-[#B06CFF]/25",
    for: "Women · Beginner to intermediate",
    description: "Technique-focused jiu-jitsu in a welcoming women-only space. Build skills at your own pace.",
    tags: ["Women Only", "Ongoing", "Technique Focus"],
    icon: <Star className="h-5 w-5" />,
  },
  {
    id: "kids-bjj",
    name: "Kids Jiu-Jitsu",
    badge: "Ages 4–7",
    badgeColor: "text-[#FFB199] bg-[#FFB199]/10 border-[#FFB199]/25",
    accent: "#FFB199",
    accentBg: "bg-[#FFB199]/10",
    accentBorder: "border-[#FFB199]/25",
    for: "Kids Ages 4–7",
    description: "Fun, age-appropriate jiu-jitsu that builds confidence, focus, and coordination in a supportive setting.",
    tags: ["Ages 4–7", "Beginner Friendly", "Character Building"],
    icon: <Heart className="h-5 w-5" />,
  },
  {
    id: "youth-bjj",
    name: "Youth Jiu-Jitsu",
    badge: "Ages 8+",
    badgeColor: "text-orange-400 bg-orange-400/10 border-orange-400/25",
    accent: "#fb923c",
    accentBg: "bg-orange-400/10",
    accentBorder: "border-orange-400/25",
    for: "Youth Ages 8+",
    description: "Real jiu-jitsu fundamentals for older kids and teens. Build grappling skills, fitness, and discipline.",
    tags: ["Ages 8+", "Fundamentals", "Youth Focused"],
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: "strength",
    name: "Strength & Conditioning",
    badge: "All Ages",
    badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
    accent: "#34d399",
    accentBg: "bg-emerald-400/10",
    accentBorder: "border-emerald-400/25",
    for: "Adults · All levels",
    description: "Functional training built for grapplers and athletes. Mobility, strength, and injury prevention.",
    tags: ["Open to All", "Functional Fitness", "Athlete Focused"],
    icon: <Dumbbell className="h-5 w-5" />,
  },
  {
    id: "competition",
    name: "Competition / Ecological",
    badge: "Advanced",
    badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/25",
    accent: "#fbbf24",
    accentBg: "bg-amber-400/10",
    accentBorder: "border-amber-400/25",
    for: "Kids & Adults · Intermediate+",
    description: "Constraint-led, ecological approach to competition training. Develop creativity and adaptability.",
    tags: ["Competition Prep", "Kids & Adults", "Advanced"],
    icon: <Star className="h-5 w-5" />,
  },
];

const TRUST_ITEMS = [
  { icon: <Users className="h-5 w-5" />, label: "Personalized Coaching",     desc: "Every student gets real attention" },
  { icon: <Heart className="h-5 w-5" />, label: "Beginner Friendly",          desc: "No experience ever required" },
  { icon: <Shield className="h-5 w-5" />, label: "Safe Environment",          desc: "Welcoming, non-intimidating space" },
  { icon: <Star className="h-5 w-5" />, label: "Women & Kids Focused",        desc: "Programs built around you" },
  { icon: <Clock className="h-5 w-5" />, label: "Flexible Scheduling",        desc: "Classes 7 days a week" },
  { icon: <Dumbbell className="h-5 w-5" />, label: "Real Self-Defense",       desc: "Practical skills that work" },
  { icon: <Smile className="h-5 w-5" />, label: "Community Driven",           desc: "Train with supportive teammates" },
];

const STEPS = [
  { num: "01", title: "Book Your Free Intro",  desc: "Pick a time that works for you. No payment required, no commitment needed.", color: "#5EEBFF" },
  { num: "02", title: "Meet Your Coach",        desc: "Come in, see the space, and have a quick chat about what you want to achieve.", color: "#B06CFF" },
  { num: "03", title: "Try the Right Class",    desc: "Join a class that fits your program interest. We'll guide you every step.", color: "#FFB199" },
  { num: "04", title: "Join When You're Ready", desc: "No pressure, no hard sell. Join only when it feels right for you.", color: "#34d399" },
];

const PRICING_CARDS = [
  {
    name: "Women's Self-Defense",
    price: "$199",
    period: "8-week program",
    sub: "$12.44 per class",
    accent: "#B06CFF",
    border: "border-[#B06CFF]/25",
    bg: "bg-[#B06CFF]/8",
    featured: true,
    perks: ["16 total sessions (2×/week)", "Practical real-world skills", "Women-only environment", "All equipment provided"],
  },
  {
    name: "Women's BJJ",
    price: "$120",
    period: "/ month",
    sub: "2 classes per week",
    accent: "#B06CFF",
    border: "border-white/10",
    bg: "",
    featured: false,
    perks: ["Ongoing membership", "Technique-focused curriculum", "Women-only classes", "Beginner to advanced"],
  },
  {
    name: "Kids Jiu-Jitsu",
    price: "$100",
    period: "/ month",
    sub: "Ages 4–14 · 2×/week",
    accent: "#FFB199",
    border: "border-white/10",
    bg: "",
    featured: false,
    perks: ["Fun & structured curriculum", "Character development", "Confidence & coordination", "Personalized attention"],
  },
  {
    name: "Strength & Conditioning",
    price: "$60",
    period: "/ month",
    sub: "Unlimited classes",
    accent: "#34d399",
    border: "border-white/10",
    bg: "",
    featured: false,
    perks: ["Unlimited monthly access", "Mobility & strength focus", "Grappler-optimized training", "All fitness levels welcome"],
  },
];

const FAQS = [
  { question: "Do I need experience to join?",         answer: "Not at all. Every program is designed to be completely beginner-friendly. You'll start from the basics and build from there at your own pace — that's why we call it Ground Up." },
  { question: "What happens at the free intro?",       answer: "You'll come in, meet Coach Raymi, see the facility, and try a short class. There's no commitment, no sales pressure — just a chance to feel comfortable in the space and find the right program for you." },
  { question: "Is this good for beginners?",           answer: "Absolutely. Most of our students start with zero experience. Our teaching style is structured, supportive, and focused on making sure you feel capable and confident from day one." },
  { question: "What should I wear to my first class?", answer: "Comfortable workout clothes — leggings and a t-shirt work great. No gi required for your intro. We'll let you know what you need once you've found the right program." },
  { question: "Are the classes safe?",                 answer: "Yes. We prioritize safety above everything. Classes are small and closely supervised. Coach Raymi creates an environment where you can train hard and still feel completely safe doing it." },
  { question: "How do I know which program is right?", answer: "That's exactly what the free intro is for. After a quick conversation, we'll point you to the best fit — whether that's self-defense, jiu-jitsu, kids classes, or conditioning." },
  { question: "Do you offer women-only classes?",      answer: "Yes. Women's Self-Defense and Women's Jiu-Jitsu are women-only environments — safe, judgment-free, and designed specifically for women to thrive in." },
  { question: "What age can kids start?",              answer: "Kids can start as young as 4 years old in our Kids Intro to Jiu-Jitsu program. We also have youth classes for ages 8 and up. Both focus on age-appropriate development and fun." },
];

const PATH_HELPERS = [
  { label: "I'm new & just curious",       icon: "👋", target: "self-defense",  key: "new" },
  { label: "I want self-defense skills",   icon: "🛡️", target: "self-defense",  key: "sd" },
  { label: "I'm looking for kids classes", icon: "⭐", target: "kids-bjj",      key: "kids" },
  { label: "I want to get stronger",       icon: "💪", target: "strength",      key: "strength" },
];

export default function Pricing() {
  const [activeHelper, setActiveHelper] = useState<string | null>(null);

  const scrollToProgram = (id: string) => {
    setActiveHelper(id);
    setTimeout(() => {
      document.getElementById(`program-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <div className="flex flex-col bg-[#0B0F14] pb-20 md:pb-0">

      {/* ─── SECTION 1: HERO ─── */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] via-[#0B0F14] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#B06CFF]/6 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-0 w-64 h-64 bg-[#5EEBFF]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/25 bg-[#FFB199]/8 text-[#FFB199] text-xs font-semibold uppercase tracking-widest mb-6">
              <Zap className="h-3.5 w-3.5" /> First Class Is Free
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              Find Your <span className="text-[#B06CFF]">Perfect</span>
              <br />Program
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed mb-3">
              Personalized coaching for women, kids, and beginners. Small classes, real progress, and a community that has your back.
            </p>
            <p className="text-[#5EEBFF] text-sm font-medium mb-8">No pressure. Come meet us, see the space, and find the best fit.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-13 px-8 text-sm">
                <Link href="/portal/login">
                  Book Your Free Intro <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 h-13 px-8 text-sm uppercase tracking-wider">
                <a href="#programs">View Programs</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SECTION 2: TRUST STRIP ─── */}
      <Section className="py-12 bg-[#121826]/40 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-semibold mb-8">Why Ground Up?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 sm:gap-6">
            {TRUST_ITEMS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex flex-col items-center text-center gap-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#5EEBFF]/8 border border-[#5EEBFF]/15 flex items-center justify-center text-[#5EEBFF]">
                  {item.icon}
                </div>
                <p className="text-white text-xs font-semibold leading-tight">{item.label}</p>
                <p className="text-gray-500 text-[10px] leading-snug hidden sm:block">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── PATH HELPER ─── */}
      <Section className="py-12 bg-[#0B0F14]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white font-bold text-lg mb-2">Not sure where to start?</p>
          <p className="text-gray-400 text-sm mb-6">Tell us what you're looking for and we'll point you to the right program.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PATH_HELPERS.map((h) => (
              <button
                key={h.key}
                onClick={() => scrollToProgram(h.target)}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border transition-all duration-200 text-sm font-medium ${
                  activeHelper === h.target
                    ? "bg-[#B06CFF]/15 border-[#B06CFF]/40 text-white"
                    : "bg-[#121826] border-white/8 text-gray-300 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-2xl">{h.icon}</span>
                <span className="leading-tight text-xs">{h.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── SECTION 3: CHOOSE YOUR PATH ─── */}
      <Section id="programs" className="py-12 bg-[#0B0F14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs text-[#5EEBFF] uppercase tracking-widest font-semibold mb-3">Programs</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Choose Your <span className="text-[#5EEBFF]">Path</span>
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-lg mx-auto">Every program starts with a free intro class. Come try it first — no commitment.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROGRAMS.map((prog, i) => (
              <motion.div
                id={`program-${prog.id}`}
                key={prog.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  activeHelper === prog.id
                    ? `${prog.accentBorder} ${prog.accentBg} shadow-lg`
                    : `border-white/8 bg-[#121826] hover:${prog.accentBorder}`
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prog.accentBg} border ${prog.accentBorder}`} style={{ color: prog.accent }}>
                    {prog.icon}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${prog.badgeColor}`}>{prog.badge}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{prog.name}</h3>
                <p className="text-xs font-medium mb-3" style={{ color: prog.accent }}>{prog.for}</p>
                <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">{prog.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {prog.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">{tag}</span>
                  ))}
                </div>
                <Button asChild size="sm" className="w-full font-bold text-[#0B0F14] hover:opacity-90" style={{ backgroundColor: prog.accent }}>
                  <Link href="/portal/login">Book Free Intro</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── SECTION 4: FEATURED OFFER ─── */}
      <Section className="py-12 bg-[#0B0F14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden border border-[#B06CFF]/25 bg-gradient-to-br from-[#B06CFF]/10 via-[#121826] to-[#5EEBFF]/5 p-8 sm:p-12">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#B06CFF]/12 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#5EEBFF]/5 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#B06CFF]/15 border border-[#B06CFF]/30 text-[#B06CFF] text-xs font-bold uppercase tracking-widest mb-5">
                  <Star className="h-3 w-3" /> Best Place to Start
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Women's<br />Self-Defense
                </h2>
                <p className="text-[#B06CFF] font-semibold text-sm mb-5">8-Week Program — $199 total</p>
                <p className="text-gray-300 leading-relaxed mb-6 text-sm">
                  This isn't just a class — it's a transformation. Over 8 weeks you'll build real confidence, practical skills, and the awareness to protect yourself and the people you love. In a room full of women who support each other.
                </p>
                <div className="space-y-2.5 mb-8">
                  {["No experience needed — ever", "2 classes per week, 16 sessions total", "Women-only, supportive environment", "Practical real-world techniques", "We'll help you choose next steps after"].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-[#B06CFF] flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold uppercase tracking-wider hover:bg-[#B06CFF]/90">
                  <Link href="/portal/login">Reserve Your Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <p className="text-gray-500 text-xs mt-3">We'll help you choose the right class after your intro.</p>
              </div>
              <div className="hidden md:flex flex-col gap-3">
                {[
                  { label: "Total Investment", value: "$199", sub: "full 8-week program" },
                  { label: "Per class breakdown", value: "$12.44", sub: "across 16 total sessions" },
                  { label: "What you'll build", value: null, tags: ["Confidence", "Awareness", "Strength", "Calm Under Pressure"] },
                ].map((card, i) => (
                  <div key={i} className="bg-[#0B0F14]/60 backdrop-blur rounded-2xl p-5 border border-[#B06CFF]/15">
                    <p className="text-gray-400 text-xs mb-2">{card.label}</p>
                    {card.value && <p className="text-white text-3xl font-bold">{card.value} <span className="text-gray-400 text-base font-normal">{card.sub}</span></p>}
                    {card.tags && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {card.tags.map((t) => <span key={t} className="px-3 py-1 text-xs rounded-full bg-[#B06CFF]/10 text-[#B06CFF] border border-[#B06CFF]/20">{t}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── SECTION 5: HOW IT WORKS ─── */}
      <Section className="py-16 bg-[#121826]/30 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs text-[#5EEBFF] uppercase tracking-widest font-semibold mb-3">Zero Pressure</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              How the Free <span className="text-[#FFB199]">Intro Works</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
                )}
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: `${step.color}15`, color: step.color, border: `1px solid ${step.color}30` }}>
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1.5">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["No experience needed", "No pressure sales", "Beginner-friendly", "Safe & supportive", "We guide every step"].map((note) => (
              <span key={note} className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/4 border border-white/6 px-3 py-1.5 rounded-full">
                <CheckCircle className="h-3 w-3 text-[#5EEBFF]" />{note}
              </span>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90">
              <Link href="/portal/login">Book Your Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── SECTION 6: PRICING (SMART) ─── */}
      <Section className="py-16 bg-[#0B0F14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Investment</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Simple, <span className="gradient-text-cyan">Transparent</span> Pricing
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-md mx-auto">Start with a free intro. Commit only when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_CARDS.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${
                  card.featured ? `${card.border} ${card.bg} shadow-lg shadow-[#B06CFF]/10` : `${card.border} bg-[#121826]`
                }`}
              >
                {card.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#B06CFF] text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                    Best Entry Point
                  </div>
                )}
                <h3 className="text-white font-bold text-sm mb-3 leading-snug">{card.name}</h3>
                <div className="mb-1">
                  <span className="text-3xl font-black text-white">{card.price}</span>
                  <span className="text-gray-400 text-sm ml-1">{card.period}</span>
                </div>
                <p className="text-xs mb-5" style={{ color: card.accent }}>{card.sub}</p>
                <div className="space-y-2 flex-1 mb-6">
                  {card.perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2 text-xs text-gray-300">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: card.accent }} />
                      {perk}
                    </div>
                  ))}
                </div>
                <Button asChild size="sm" className="w-full font-bold text-[#0B0F14] hover:opacity-90 text-xs" style={{ backgroundColor: card.accent }}>
                  <Link href="/portal/login">Book Free Intro</Link>
                </Button>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-xs mt-6">
            Pricing for Personal Training (1-on-1) available upon request. <Link href="/contact" className="text-[#5EEBFF] hover:underline">Contact us</Link> for details.
          </p>
        </div>
      </Section>

      {/* ─── SECTION 7: FAQ ─── */}
      <Section className="py-16 bg-[#121826]/30 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs text-[#B06CFF] uppercase tracking-widest font-semibold mb-3">Questions</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Common <span className="text-[#B06CFF]">Questions</span>
            </h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => <FAQ key={i} question={faq.question} answer={faq.answer} />)}
          </div>
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm mb-4">Still have questions? We're happy to help.</p>
            <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/5">
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── SECTION 8: FINAL CTA ─── */}
      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#B06CFF]/5 via-[#0B0F14] to-[#5EEBFF]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#B06CFF]/6 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-[#FFB199] uppercase tracking-widest font-semibold mb-4">Start Here</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to <span className="text-[#FFB199]">Get Started?</span>
          </h2>
          <p className="text-gray-300 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Book your free intro and we'll help you find the class that's right for you. No experience, no pressure — just a chance to try.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-13 px-8">
              <Link href="/portal/login">
                Book Your Free Intro <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-white hover:bg-white/5 h-13 px-8 uppercase tracking-wider">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
          <p className="text-gray-500 text-sm">Women, kids, and beginners welcome · Oxnard, CA · No contracts</p>
        </div>
      </Section>

      {/* ─── STICKY MOBILE CTA ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0B0F14]/95 backdrop-blur-md border-t border-white/8 px-4 py-3 flex gap-3">
        <Button asChild className="flex-1 bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-sm">
          <Link href="/portal/login">Book Free Intro <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="ghost" className="border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm px-4">
          <Link href="/contact">Contact</Link>
        </Button>
      </div>

    </div>
  );
}
