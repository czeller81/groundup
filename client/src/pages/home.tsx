import { Link } from "wouter";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import { motion, useInView } from "framer-motion";
import {
  Shield, Users, Award, ChevronDown, ChevronUp,
  Star, ArrowRight, Zap, Heart, CheckCircle, CalendarDays, Clock
} from "lucide-react";
import { CATEGORY_CONFIG, getClassesForDay, getCurrentDay } from "@/lib/schedule-data";
import selfDefenseFeaturedImg from "@assets/womens-sparring-1.jpg";
import bjjFundamentalsImg from "@assets/womens-sparring-2.jpg";
import kidsClassImg from "@assets/generated_images/kids_martialarts.png";
import strengthImg from "@assets/generated_images/women_strength.png";
import personalTrainingImg from "@assets/generated_images/women_personaltraining.png";
import whyDifferentImg from "@assets/womens-team-1.jpg";
import coachImg from "@assets/raymi-coach.jpg";
import facilityFloorImg from "@assets/facility-floor.jpg";
import facilityStrengthImg from "@assets/facility-strength.jpg";
import facilityMatImg from "@assets/facility-mat.jpg";
import facilityLoungeImg from "@assets/facility-lounge.jpg";
import facilityCafeImg from "@assets/facility-cafe.jpg";
import facilityTeaImg from "@assets/facility-tea.jpg";
const facilityFrame1 = "/images/facility/frame_01.jpg";
const facilityFrame4 = "/images/facility/frame_04.jpg";
const facilityFrame5 = "/images/facility/frame_05.jpg";
const facilityFrame7 = "/images/facility/frame_07.jpg";
const heroVideo = "/videos/hero-bg.mp4";

function Section({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
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
  const panelId = useId();
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white">{question}</span>
        {open ? <ChevronUp className="h-5 w-5 text-[#5EEBFF] flex-shrink-0" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />}
      </button>
      <motion.div
        id={panelId}
        role="region"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="px-6 pb-5 text-gray-400 leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const todayDay = getCurrentDay();
  const todayRawClasses = getClassesForDay(todayDay);
  const displayDay = todayRawClasses.length > 0 ? todayDay : "Monday";
  const displayClasses = todayRawClasses.length > 0 ? todayRawClasses : getClassesForDay("Monday");

  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title="Women-Only BJJ & Self-Defense in Oxnard | Ground Up"
        description="Ground Up is a women-only training center in Oxnard for Brazilian Jiu-Jitsu, practical self-defense, strength, and movement. Beginner-friendly small-group coaching. Book your free first visit."
        canonical="/"
      />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden grain-texture" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#121826] to-[#0B0F14]" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/50 to-[#0B0F14]/60" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#B06CFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-gray-300 text-xs font-semibold uppercase tracking-widest mb-6"
            >
              WOMEN ONLY · OXNARD, CA
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-white">CONFIDENCE</span>
              <br />
              <span className="gradient-text-cyan">BUILT</span>
              <br />
              <span className="gradient-text-purple">HERE.</span>
              <br />
              <span className="text-white text-3xl md:text-4xl lg:text-5xl font-semibold">discover what your body can do</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-gray-300 max-w-xl mb-10 leading-relaxed"
            >
              Ground Up is a women-only training space where you can build strength, learn Brazilian Jiu-Jitsu and practical self-defense, and move with more confidence. Beginner-friendly. No experience required. No fight-gym atmosphere.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                asChild
                size="lg"
                className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-8 h-14"
                data-testid="hero-cta-book"
              >
                <Link href="/book">
                   Book Your Free First Visit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 uppercase tracking-wider text-base px-8 h-14 bg-transparent"
                data-testid="hero-cta-schedule"
              >
                <Link href="/pricing">Explore Programs</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5EEBFF]/30 to-transparent" />
      </section>

      {/* TRUST STRIP */}
      <Section className="py-20 bg-[#0B0F14] relative" delay={0}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, label: "Personalized Attention", desc: "Coaching tailored to you" },
              { icon: Shield, label: "Safe & Welcoming", desc: "Judgment-free environment" },
                   { icon: Heart, label: "Women-Centered", desc: "A space built around women" },
              { icon: Award, label: "Beginner Friendly", desc: "No experience needed" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:border-[#5EEBFF]/20 transition-all group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center group-hover:bg-[#5EEBFF]/20 transition-colors">
                  <item.icon className="h-6 w-6 text-[#5EEBFF]" />
                </div>
                <h4 className="text-white font-semibold text-sm mb-1" style={{ fontFamily: 'var(--font-display)' }}>{item.label}</h4>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section className="py-24 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-sm mb-4">
              No Experience Needed
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHAT TO <span className="gradient-text-warm">EXPECT</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              We know walking into a martial arts gym for the first time can feel intimidating. Here's exactly what your first visit looks like — simple, welcoming, and at your pace.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {[
              {
                step: "01",
                icon: Clock,
                title: "Arrive 15 Min Early",
                desc: "Show up a little before class. We'll give you a quick tour, answer your questions, and make sure you feel at home before anything starts.",
                accent: "#5EEBFF",
              },
              {
                step: "02",
                icon: Heart,
                title: "Meet Coach Raymi",
                desc: "Your instructor will introduce herself, learn about your goals, and let you know what to expect. No jargon, no pressure — just a real conversation.",
                accent: "#FFB199",
              },
              {
                step: "03",
                icon: Shield,
                title: "Learn the Fundamentals",
                desc: "Every class starts with foundational movements. No sparring in your first session — just safe, structured technique at your own pace.",
                accent: "#B06CFF",
              },
              {
                step: "04",
                icon: Award,
                title: "Leave Feeling Capable",
                desc: "Most new students leave surprised by how much they learned — and how comfortable they felt. You'll leave with a skill, not just a workout.",
                accent: "#5EEBFF",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative flex flex-col items-center text-center p-7 rounded-2xl border border-white/5 bg-[#0B0F14] hover:border-white/10 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xs font-bold tracking-widest"
                  style={{ backgroundColor: `${item.accent}20`, color: item.accent }}
                >
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${item.accent}15` }}>
                  <item.icon className="h-5 w-5" style={{ color: item.accent }} />
                </div>
                <h3 className="text-white font-bold text-base mb-2" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-400 mb-6">
              {["Wear comfortable athletic clothing", "No gear required for your first class", "Bring water and an open mind"].map((tip) => (
                <span key={tip} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" />
                  {tip}
                </span>
              ))}
            </div>
            <div className="block">
              <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-13 px-10">
                <Link href="/book">
                  Book Your First Class — Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* MISSION */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-sm mb-6">
            Our Mission
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            BUILD THE CAPACITY TO <span className="gradient-text-cyan">ADAPT.</span>
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
            Ground Up is a human resilience and capability platform. Our physical training foundation and our emerging Adaptive Capacity work share one belief: you can build the capacity to respond to change with more clarity, confidence, and agency. Start with the path that fits you.
          </p>
        </div>
      </Section>

      {/* PROGRAMS */}
      <Section className="py-24 bg-[#0B0F14] relative belt-stripe" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-4">
              Find Your Path
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              TRAINING BUILT <span className="gradient-text-cyan">AROUND YOU</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Train your body, strengthen your confidence, or build practical capacity for a changing world. Related paths, clearly separated, all grounded in action.
            </p>
          </div>

          {/* Featured program */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative rounded-2xl overflow-hidden border border-[#FFB199]/20 bg-gradient-to-r from-[#FFB199]/5 to-transparent mb-8 hover:border-[#FFB199]/40 transition-all"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB199]/10 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4 w-fit">
                  Flagship Program
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  WOMEN'S SELF-DEFENSE
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  Our signature 8-week self-defense program helps women build practical skills, situational awareness, confidence, and strength in a supportive environment.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {["8-week program", "2 classes per week", "16 total classes", "Beginner friendly"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 w-fit">
                    <Link href="/book">
                       Book Your Free First Visit <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-[#FFB199]/30 text-[#FFB199] hover:bg-[#FFB199]/10 uppercase tracking-wider w-fit bg-transparent">
                    <Link href="/womens-self-defense">
                      Explore the Program
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                <img
                  src={selfDefenseFeaturedImg}
                  alt="Women's Self-Defense Program"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </motion.div>

           <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                title: "Women's BJJ Fundamentals",
                desc: "Learn Brazilian Jiu-Jitsu fundamentals in a focused setting built around technique, movement, confidence, and controlled training.",
                highlights: ["Beginner friendly", "Personalized coaching", "Technique-focused", "Safe environment"],
                img: bjjFundamentalsImg,
                accent: "#5EEBFF",
                link: "/womens-self-defense",
              },
              {
                 title: "Girls / Mother + Daughter",
                 desc: "A women-centered youth path for girls and female youth. Ask about current eligibility, guardian requirements, and mother-daughter participation.",
                 highlights: ["Girls / female youth", "Mother + daughter", "Guardian guidance", "Eligibility confirmed"],
                 img: kidsClassImg,
                accent: "#B06CFF",
                 link: "/girls",
              },
              {
                title: "Strength & Conditioning",
                desc: "Focused fitness sessions built around mobility, strength, injury prevention, and athletic conditioning.",
                highlights: ["Personalized coaching", "Functional strength", "Injury prevention", "Athletic conditioning"],
                img: strengthImg,
                accent: "#5EEBFF",
              },
              {
                title: "Personal Training",
                desc: "One-on-one coaching tailored to your fitness, self-defense, or performance goals at your own pace.",
                highlights: ["1-on-1 sessions", "Custom goals", "Flexible schedule", "All levels welcome"],
                img: personalTrainingImg,
                accent: "#FFB199",
              },
              {
                title: "Adaptive Capacity",
                desc: "A separate learning path for clearer thinking, better decisions, and practical adaptability as work and life change.",
                highlights: ["Practical learning", "Decision tools", "Reflection", "Interest list now open"],
                img: facilityLoungeImg,
                accent: "#5EEBFF",
                link: "/adaptive-capacity",
              },
            ].map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative rounded-2xl overflow-hidden border border-white/5 bg-[#121826] hover:border-white/15 transition-all flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={program.img}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-[#121826]/30 to-transparent" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: program.accent }} />
                  <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>{program.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{program.desc}</p>
                  <ul className="space-y-1.5">
                    {program.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: program.accent }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                  {program.link && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <Link href={program.link} className="text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity flex items-center gap-1" style={{ color: program.accent }}>
                        Learn More <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SCHEDULE PREVIEW */}
      <Section className="py-20 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-4">
                <CalendarDays className="h-3.5 w-3.5" />
                {displayDay === todayDay ? "Today's Classes" : "Upcoming Classes"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                FIND A CLASS <span className="gradient-text-cyan">THAT FITS YOU</span>
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-md">Max 6 students per class — structured for beginners. Every session is coached, not just supervised.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFB199]/10 text-[#FFB199] border border-[#FFB199]/20">
                  <CheckCircle className="h-3.5 w-3.5" /> No experience required
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#5EEBFF]/10 text-[#5EEBFF] border border-[#5EEBFF]/20">
                  <CheckCircle className="h-3.5 w-3.5" /> Beginner friendly
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B06CFF]/10 text-[#B06CFF] border border-[#B06CFF]/20">
                  <CheckCircle className="h-3.5 w-3.5" /> First class free
                </span>
              </div>
            </div>
            <Button asChild className="bg-transparent border border-[#5EEBFF]/40 text-[#5EEBFF] hover:bg-[#5EEBFF]/10 uppercase tracking-wider font-semibold flex-shrink-0">
              <Link href="/schedule">
                Full Schedule <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayClasses.slice(0, 6).map((entry, i) => {
              const cfg = CATEGORY_CONFIG[entry.category];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className={`rounded-xl border ${cfg.border} bg-[#0B0F14]/80 p-4 flex items-center gap-3 hover:brightness-110 transition-all`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm leading-snug">{entry.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className={`h-3 w-3 flex-shrink-0 ${cfg.color}`} />
                      <p className={`text-xs font-medium ${cfg.color}`}>{entry.startTime}{entry.endTime ? ` – ${entry.endTime}` : ""}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Link href="/schedule">
              <span className="text-[#5EEBFF] text-sm font-medium hover:underline cursor-pointer">
                See all classes for the full week →
              </span>
            </Link>
          </div>
        </div>
      </Section>

      {/* WHY US */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                WHY GROUND UP <span className="gradient-text-cyan">IS DIFFERENT</span>
              </h2>
              <p className="text-gray-300 leading-relaxed mb-10">
                We intentionally stay small — because personal attention, real coaching, and a safe environment require it. Ground Up is not a volume gym. It's a boutique studio where every student is known by name, every session is coached (not just supervised), and no one gets lost in the crowd.
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  { icon: Users, title: "Personalized Attention", desc: "Every student gets direct coaching attention — no one gets lost in the crowd.", accent: "#5EEBFF" },
                  { icon: Award, title: "Personalized Coaching", desc: "Programs and sessions are tailored to your goals, fitness level, and pace.", accent: "#B06CFF" },
                  { icon: Heart, title: "Safe & Welcoming", desc: "A judgment-free space where you can learn, grow, and feel completely at ease.", accent: "#FFB199" },
                   { icon: Shield, title: "Women-Only by Design", desc: "Our programs are built around capability, coaching, and a supportive small-group environment.", accent: "#5EEBFF" },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${item.accent}15` }}>
                      <item.icon className="h-5 w-5" style={{ color: item.accent }} />
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#5EEBFF]/10 to-[#B06CFF]/10 rounded-2xl blur-xl" />
              <img
                src={whyDifferentImg}
                alt="Training environment"
                className="relative rounded-2xl w-full aspect-[4/5] object-cover border border-white/10"
              />
              <div className="absolute -bottom-5 left-4 right-4 p-4 rounded-xl border border-[#FFB199]/20 bg-[#FFB199]/10 backdrop-blur-sm flex items-center gap-3">
                <Zap className="h-5 w-5 text-[#FFB199] flex-shrink-0" />
                <span className="text-[#FFB199] text-sm font-semibold leading-snug">Practical self-defense in a women-only space for women in Oxnard.</span>
              </div>
            </div>
          </div>
        </div>
      </Section>


      {/* COACH */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                MEET YOUR <span className="gradient-text-purple">COACH</span>
              </h2>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>RAYMI GONZALEZ</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30">
                    Purple Belt · 3rd Degree
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                  Promoted under the Gracie Barra lineage · Trained in Ventura County, CA · 5+ Years Coaching
                </p>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                 Raymi founded Ground Up Jiu-Jitsu with one goal: to build a safe, empowering home for women and beginners. With deep expertise in BJJ, self-defense, strength & conditioning, and movement, she brings personal attention and real-world skill to every session.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                 {["Women's Self-Defense", "Women's BJJ", "Strength & Movement", "Personal Training"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-gray-300 bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>
              <Button
                asChild
                className="bg-[#B06CFF] text-white font-semibold uppercase tracking-wider hover:bg-[#B06CFF]/90"
              >
                <Link href="/coaches">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#B06CFF]/20 to-[#5EEBFF]/20 rounded-2xl blur-xl" />
              <img
                src={coachImg}
                alt="Raymi Gonzalez"
                className="relative rounded-2xl w-full aspect-[3/4] object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* FACILITY GALLERY */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Inside the Gym
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              REAL TRAINING. <span className="gradient-text-cyan">REAL PEOPLE.</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm">
              Every class is filmed from actual sessions at our Oxnard facility — no stock photos, no actors.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: facilityFrame1, caption: "Women's class — stance & movement drills", tall: true },
              { src: facilityFrame5, caption: "Students leave smiling — every class", tall: false },
              { src: facilityFrame7, caption: "Partner drilling in a supportive environment", tall: false },
              { src: facilityFrame4, caption: "Ground technique — breakfalls & positioning", tall: true },
            ].map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative overflow-hidden rounded-2xl group ${photo.tall ? "md:row-span-1" : ""}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <p className="text-white text-xs font-medium leading-tight">{photo.caption}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs">
              All photos are from live training sessions at our Oxnard, CA facility.
            </p>
          </div>
        </div>
      </Section>

      {/* THE SPACE / AMENITIES */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-xs font-semibold uppercase tracking-wider mb-4">
              Step Inside
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              A SPACE BUILT <span className="gradient-text-purple">FOR YOU</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-lg mx-auto text-sm">
              Clean, calm, and fully equipped — from spacious mats to a recovery sauna and a cozy lounge with complimentary tea &amp; coffee.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { src: facilityFloorImg, caption: "Open, airy training floor" },
              { src: facilityStrengthImg, caption: "Strength & conditioning equipment" },
              { src: facilityMatImg, caption: "Spacious matted rolling area" },
              { src: facilityLoungeImg, caption: "Relax in our member lounge" },
              { src: facilityCafeImg, caption: "Community tables & games" },
              { src: facilityTeaImg, caption: "Complimentary tea & coffee bar" },
            ].map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl group"
              >
                <div className="aspect-[4/5] md:aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-4">
                  <p className="text-white text-sm font-semibold leading-tight">{photo.caption}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-24 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4">
              Student Experiences
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHAT OUR <span className="gradient-text-warm">COMMUNITY</span> SAYS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I came in knowing absolutely nothing. The first class we did stance drills and learned how to fall safely — by the end I had real technique. Coach Raymi makes sure you never feel left behind.",
                name: "Maria G.",
                role: "Women's Self-Defense",
                initial: "M",
                color: "#B06CFF",
              },
              {
                quote: "What surprised me most was how much I smiled. I expected it to be intimidating but the class is small, everyone is supportive, and there's something genuinely empowering about learning to use your body this way.",
                name: "Vanessa R.",
                role: "Women's BJJ Fundamentals",
                initial: "V",
                color: "#FFB199",
              },
              {
                quote: "I brought my daughter and ended up staying for the adult class myself. The mat time, the facility, the way Coach Raymi teaches — it doesn't feel like a typical martial arts gym. It feels like a community.",
                name: "Jessica W.",
                role: "BJJ Fundamentals",
                initial: "J",
                color: "#5EEBFF",
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#0B0F14] p-8 hover:border-white/10 transition-all"
              >
                <div className="flex text-[#FFB199] mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}
                  >
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* FAQ */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            FREQUENTLY ASKED <span className="gradient-text-cyan">QUESTIONS</span>
          </h2>
          <div className="space-y-3">
            <FAQ
              question="Do I need experience to join?"
              answer="No. Our programs are beginner friendly and designed to help you build confidence from day one. You'll start at your own pace with personalized coaching every step of the way."
            />
            <FAQ
              question="Will I get personalized attention?"
              answer="Absolutely. We keep our classes intentionally intimate so every student gets personal coaching, better technique correction, and a more comfortable learning environment."
            />
            <FAQ
              question="Is this good for women who only want self-defense?"
              answer="Yes. Our women's self-defense program is designed specifically for practical real-world confidence and protection — no competitive training or sparring required."
            />
            <FAQ
              question="Do you offer girls or mother-daughter training?"
              answer="When youth programming is available, it is for girls and female youth. We confirm eligibility, age range, guardian requirements, and mother-daughter options before booking so families receive accurate information."
            />
            <FAQ
              question="What is the free community self-defense class?"
              answer="Every two weeks we host a free, open self-defense class for the community. It's a great way to try training with no commitment, meet other students, and build local safety awareness."
            />
            <FAQ
              question="How do I book a session?"
              answer="Create a free member account, complete your intake forms, and book directly through our member portal. Sessions are available 8am–5pm, Monday through Saturday."
            />
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-24 bg-[#121826] relative overflow-hidden grain-texture" delay={0}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#5EEBFF]/5 via-[#B06CFF]/5 to-[#FFB199]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            YOUR FIRST CLASS
            <br /><span className="gradient-text-warm">IS ALWAYS FREE</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            No gear. No commitment. No pressure. Just come in, meet Coach Raymi, and experience what a truly supportive training environment feels like. We'll help you find the right fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
            >
              <Link href="/book">
                Book Your Free First Visit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 uppercase tracking-wider text-base px-8 h-14 bg-transparent"
            >
              <Link href="/contact">
                Ask Us Anything
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="text-gray-500 text-sm mt-8">
            Oxnard, CA &bull; Personalized coaching &bull; Small classes &bull; No contracts
          </p>
        </div>
      </Section>
    </div>
  );
}
