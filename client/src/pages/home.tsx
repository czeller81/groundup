import { Link } from "wouter";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import {
  Shield, Dumbbell, Users, Award, ChevronDown, ChevronUp,
  Star, ArrowRight, Zap, Heart, CheckCircle, Lock
} from "lucide-react";
import selfDefenseFeaturedImg from "@assets/generated_images/bjj_selfdefense_featured.png";
import bjjFundamentalsImg from "@assets/generated_images/bjj_fundamentals.png";
import kidsClassImg from "@assets/generated_images/kids_martialarts.png";
import strengthImg from "@assets/generated_images/women_strength.png";
import personalTrainingImg from "@assets/generated_images/women_personaltraining.png";
import whyDifferentImg from "@assets/generated_images/why_different.png";
import whoServeWomenImg from "@assets/generated_images/who_serve_women.png";
import whoServeKidsImg from "@assets/generated_images/who_serve_kids.png";
import whoServeBeginnersImg from "@assets/generated_images/who_serve_beginners.png";
import coachImg from "@assets/generated_images/coach_portrait.png";
import testimonialImg1 from "@assets/generated_images/testimonial1.png";
import testimonialImg2 from "@assets/generated_images/testimonial2.png";
import testimonialImg3 from "@assets/generated_images/testimonial3.png";
import heroVideo from "@assets/videos/hero-bg.mp4?url";

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
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white">{question}</span>
        {open ? <ChevronUp className="h-5 w-5 text-[#5EEBFF] flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
      </button>
      <motion.div
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
  return (
    <div className="flex flex-col bg-[#0B0F14]">

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden grain-texture" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#121826] to-[#0B0F14]" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/40 to-[#0B0F14]/70" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#B06CFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-white">GROUND UP</span>
              <br />
              <span className="gradient-text-cyan">JIU-JITSU</span>
              <br />
              <span className="gradient-text-purple">&amp; FITNESS</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-gray-300 max-w-xl mb-4 leading-relaxed"
            >
              Boutique jiu-jitsu, self-defense, and strength training for women, kids, and beginners.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-base text-gray-400 max-w-xl mb-10 leading-relaxed"
            >
              Train in a safe, supportive environment designed to build confidence, fitness, and real-world self-defense skills.
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
                <Link href="/portal/login">
                  Start Your Training
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
                <Link href="/contact">Book a Free Intro</Link>
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
              { icon: Heart, label: "Women & Kids Focus", desc: "Programs built for you" },
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

      {/* MISSION */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-sm mb-6">
            Our Mission
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            BUILT TO <span className="gradient-text-purple">EMPOWER</span>
            <br />FROM THE GROUND UP
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
            Ground Up Jiu-Jitsu exists to empower women and children with the skills, confidence, and strength to protect themselves and live healthier lives. We believe training should feel <span className="text-white font-medium">safe, personal, and community-driven</span> — not intimidating.
          </p>
        </div>
      </Section>

      {/* PROGRAMS */}
      <Section className="py-24 bg-[#0B0F14] relative belt-stripe" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              PROGRAMS <span className="gradient-text-cyan">DESIGNED FOR REAL LIFE</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Every program is built around personal coaching and real-world skills that matter.
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
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-bold text-[#FFB199]">$199</span>
                  <span className="text-gray-400 text-sm">total · 8-week program</span>
                </div>
                <Button asChild className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 w-fit">
                  <Link href="/portal/login">
                    Reserve Your Spot <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Women's BJJ Fundamentals",
                price: "$120/mo",
                desc: "Learn Brazilian Jiu-Jitsu fundamentals in a focused setting built around technique, movement, confidence, and controlled training.",
                highlights: ["Beginner friendly", "Personalized coaching", "Technique-focused", "Safe environment"],
                img: bjjFundamentalsImg,
                accent: "#5EEBFF",
              },
              {
                title: "Kids Jiu-Jitsu",
                price: "$100/mo",
                desc: "A positive program designed to help kids develop confidence, discipline, coordination, and anti-bullying awareness.",
                highlights: ["Ages 6–14", "Confidence building", "Discipline", "Anti-bullying focus"],
                img: kidsClassImg,
                accent: "#B06CFF",
              },
              {
                title: "Strength & Conditioning",
                price: "$15/class",
                desc: "Focused fitness sessions built around mobility, strength, injury prevention, and athletic conditioning.",
                highlights: ["Personalized coaching", "Functional strength", "Injury prevention", "Athletic conditioning"],
                img: strengthImg,
                accent: "#5EEBFF",
              },
              {
                title: "Personal Training",
                price: "$60/session",
                desc: "One-on-one coaching tailored to your fitness, self-defense, or performance goals at your own pace.",
                highlights: ["1-on-1 sessions", "Custom goals", "Flexible schedule", "All levels welcome"],
                img: personalTrainingImg,
                accent: "#FFB199",
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
                  {"price" in program && (
                    <p className="text-base font-semibold mb-2" style={{ color: program.accent }}>{program.price}</p>
                  )}
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{program.desc}</p>
                  <ul className="space-y-1.5 mt-auto">
                    {program.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: program.accent }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
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
                Unlike large gyms, Ground Up focuses on quality over quantity. Our approach allows for better instruction, stronger community, and a more comfortable experience for people who want to learn in a supportive environment.
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  { icon: Users, title: "Personalized Attention", desc: "Every student gets direct coaching attention — no one gets lost in the crowd.", accent: "#5EEBFF" },
                  { icon: Award, title: "Personalized Coaching", desc: "Programs and sessions are tailored to your goals, fitness level, and pace.", accent: "#B06CFF" },
                  { icon: Heart, title: "Safe & Welcoming", desc: "A judgment-free space where you can learn, grow, and feel completely at ease.", accent: "#FFB199" },
                  { icon: Shield, title: "Built for Women, Kids & Beginners", desc: "Our programs are designed specifically around your needs, not repurposed from a competitive fight gym.", accent: "#5EEBFF" },
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
            </div>
          </div>
        </div>
      </Section>

      {/* COMMUNITY */}
      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden" delay={0}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#B06CFF]/5 via-transparent to-[#5EEBFF]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-sm mb-6">
            Community First
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            TRAINING THAT <span className="gradient-text-cyan">GIVES BACK</span>
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Every two weeks, Ground Up Jiu-Jitsu hosts a free community self-defense class to help women feel safer, introduce new people to training, and create a stronger local community.
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border border-[#FFB199]/30 bg-[#FFB199]/10">
            <Zap className="h-5 w-5 text-[#FFB199] flex-shrink-0" />
            <span className="text-[#FFB199] font-semibold">Free Community Self-Defense Class Every 2 Weeks</span>
          </div>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold uppercase tracking-wider hover:bg-[#B06CFF]/90 text-base px-10 h-14">
              <Link href="/contact">
                Join the Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* WHAT YOU'LL BUILD */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHAT YOU'LL <span className="gradient-text-purple">BUILD HERE</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              More than physical skills — we help you develop the whole person.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Shield, label: "Confidence", color: "#FFB199" },
              { icon: Lock, label: "Real Self-Defense Skills", color: "#5EEBFF" },
              { icon: Dumbbell, label: "Strength & Fitness", color: "#B06CFF" },
              { icon: Award, label: "Discipline", color: "#FFB199" },
              { icon: Zap, label: "Stress Relief", color: "#5EEBFF" },
              { icon: Users, label: "Community", color: "#B06CFF" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex flex-col items-center text-center p-6 rounded-xl border border-white/5 bg-[#0B0F14] hover:border-white/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon className="h-7 w-7" style={{ color: item.color }} />
                </div>
                <h4 className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>{item.label}</h4>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* WHO WE SERVE */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHO WE <span className="gradient-text-warm">SERVE</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                img: whoServeWomenImg,
                title: "Women",
                desc: "Seeking self-defense skills, fitness, and the confidence to feel safer and stronger every day.",
                highlights: ["Self-defense training", "Strength & conditioning", "Community support"],
                accent: "#FFB199",
              },
              {
                img: whoServeKidsImg,
                title: "Kids (Ages 6–14)",
                desc: "Who need positive structure, confidence-building, and real tools to handle life's challenges.",
                highlights: ["Discipline & focus", "Anti-bullying skills", "Physical coordination"],
                accent: "#B06CFF",
              },
              {
                img: whoServeBeginnersImg,
                title: "Beginners & Adults",
                desc: "Wanting beginner-friendly personal training or martial arts with no prior experience required.",
                highlights: ["No experience needed", "Personal training", "Flexible scheduling"],
                accent: "#5EEBFF",
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl overflow-hidden border border-white/5 bg-[#121826] hover:border-white/10 transition-all group"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-7">
                  <div className="w-8 h-1 rounded-full mb-4" style={{ backgroundColor: card.accent }} />
                  <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>{card.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{card.desc}</p>
                  <ul className="space-y-2">
                    {card.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: card.accent }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
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
                <span className="inline-block mt-2 px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30">
                  Purple Belt 3rd Degree
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                Raymi founded Ground Up Jiu-Jitsu with one goal: to build a safe, empowering home for women, kids, and beginners. With deep expertise in BJJ, self-defense, and strength & conditioning, she brings personal attention and real-world skill to every session.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {["Women's Self-Defense", "Kids BJJ", "Strength & Conditioning", "Personal Training"].map((tag) => (
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

      {/* TESTIMONIALS */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHAT OUR <span className="gradient-text-warm">COMMUNITY</span> SAYS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I signed up for the women's self-defense program with zero experience and left feeling completely confident. The personalized attention made all the difference — I actually got real coaching.",
                name: "Maria G.",
                role: "Self-Defense Program",
                img: testimonialImg1,
              },
              {
                quote: "I was nervous to try BJJ but the environment here is so welcoming. Coach Raymi makes sure everyone feels safe and progresses at their own pace. My daughter loves the kids class too.",
                name: "Jessica W.",
                role: "BJJ Fundamentals",
                img: testimonialImg2,
              },
              {
                quote: "The personal training sessions completely transformed my fitness and confidence. The coaching here is so attentive — I always feel seen and supported.",
                name: "Priya P.",
                role: "Personal Training",
                img: testimonialImg3,
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#121826] p-8 hover:border-white/10 transition-all"
              >
                <div className="flex text-[#FFB199] mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 text-sm">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
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

      {/* PRICING */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              SIMPLE, AFFORDABLE <span className="gradient-text-cyan">PRICING</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Boutique training with personalized coaching and beginner-friendly programs.
            </p>
          </div>

          {/* WHY TRAIN HERE */}
          <div className="bg-[#121826] border border-white/10 rounded-xl p-8 md:p-12 mb-16">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Why Train Here?</h3>
            <div className="grid md:grid-cols-5 gap-6">
              {[
                "Personalized Coaching",
                "Beginner Friendly",
                "Safe, Welcoming Environment",
                "Built for Women, Kids & Beginners",
                "Flexible Scheduling"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#5EEBFF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PRICING CARDS */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* FREE INTRO */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-[#5EEBFF]/10 border border-[#5EEBFF]/30 text-[#5EEBFF] text-xs font-semibold mb-4">
                Best Place to Start
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Free Intro Class</h3>
              <p className="text-4xl font-bold text-[#5EEBFF] mb-4">Free</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">Try a class, meet the coach, and experience the training environment before committing.</p>
              <Button asChild className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/portal/login">Book Free Intro</Link>
              </Button>
            </div>

            {/* WOMEN'S BJJ */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Women's BJJ Fundamentals</h3>
              <p className="text-3xl font-bold text-white mb-1">$120<span className="text-lg font-normal text-gray-400">/mo</span></p>
              <p className="text-gray-500 text-xs mb-4">Personalized coaching</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">Jiu-jitsu training focused on confidence, technique, movement, and beginner-friendly instruction.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> 2 classes per week</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Beginner friendly</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Technique focused</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Personalized attention</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Start Training</Link>
              </Button>
            </div>

            {/* KIDS JIU-JITSU */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Kids Jiu-Jitsu</h3>
              <p className="text-3xl font-bold text-white mb-1">$100<span className="text-lg font-normal text-gray-400">/mo</span></p>
              <p className="text-gray-500 text-xs mb-4">Ages 6–14</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">A positive program that helps kids build confidence, discipline, coordination, and anti-bullying awareness.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> 2 classes per week</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Confidence building</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Discipline & coordination</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Personalized attention</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Enroll Your Child</Link>
              </Button>
            </div>

            {/* STRENGTH & CONDITIONING */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Strength & Conditioning</h3>
              <p className="text-3xl font-bold text-white mb-1">$15<span className="text-lg font-normal text-gray-400">/class</span></p>
              <p className="text-gray-500 text-xs mb-4">Or $60/month unlimited</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">Focused fitness sessions built around mobility, strength, injury prevention, and athletic conditioning.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Mobility work</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Strength training</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Injury prevention</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Athletic conditioning</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Join a Class</Link>
              </Button>
            </div>
          </div>

          {/* FEATURED - WOMEN'S SELF-DEFENSE */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#B06CFF]/10 via-[#121826] to-[#5EEBFF]/10 border border-[#B06CFF]/30 rounded-xl p-8 md:p-12 mb-12 relative overflow-hidden lg:col-span-4">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#B06CFF]/20 rounded-full blur-3xl -z-10" />
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B06CFF]/20 border border-[#B06CFF]/40 text-[#B06CFF] text-sm font-semibold mb-4">
                  ⭐ Featured Program
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Women's Self-Defense Program
                </h3>
                <p className="text-[#B06CFF] font-semibold mb-4">8-Week Program</p>
                <p className="text-5xl font-bold text-white mb-2">$199</p>
                <p className="text-gray-400 text-sm mb-8">Our signature self-defense program helps women build practical skills, situational awareness, confidence, and strength in a supportive environment.</p>
                <div className="space-y-3 mb-8">
                  {[
                    "8-week program",
                    "2 classes per week (16 total classes)",
                    "Beginner friendly",
                    "Practical self-defense skills",
                    "Supportive women-only environment"
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-[#B06CFF] flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold hover:bg-[#B06CFF]/90 uppercase tracking-wider">
                  <Link href="/portal/login">Reserve Your Spot</Link>
                </Button>
              </div>
              <img src={selfDefenseFeaturedImg} alt="Women's Self-Defense" className="rounded-lg hidden md:block" />
            </div>
          </div>

          {/* PERSONAL TRAINING & COMMUNITY */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* PERSONAL TRAINING */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Personal Training</h3>
              <p className="text-3xl font-bold text-white mb-1">$60<span className="text-lg font-normal text-gray-400">/session</span></p>
              <p className="text-gray-500 text-xs mb-4">One-on-one coaching</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">One-on-one coaching tailored to your fitness, self-defense, or performance goals.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Private coaching</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Personalized instruction</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Self-defense or fitness</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF]" /> Goal-based training</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Book a Session</Link>
              </Button>
            </div>

            {/* FREE COMMUNITY CLASS */}
            <div className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors">
              <h3 className="text-xl font-bold text-white mb-2">Free Community Self-Defense</h3>
              <p className="text-3xl font-bold text-[#5EEBFF] mb-1">Free</p>
              <p className="text-gray-500 text-xs mb-4">Every 2 weeks</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">We host a free community self-defense class every two weeks to help women feel safer, introduce people to training, and give back to the community.</p>
              <div className="flex-grow" />
              <Button asChild className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/contact">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* NO EXPERIENCE NOTE */}
          <div className="text-center">
            <p className="text-gray-400 text-base italic">
              No experience needed. Our programs are designed to help you build confidence from day one in a safe and supportive environment.
            </p>
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
              question="Do you offer kids classes?"
              answer="Yes. Our kids program (ages 6–14) focuses on confidence, discipline, anti-bullying awareness, and physical development in a positive, supportive environment."
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
            START FROM THE
            <br /><span className="gradient-text-warm">GROUND UP</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Whether you're looking to learn self-defense, improve your fitness, or help your child build confidence, Ground Up Jiu-Jitsu is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
            >
              <Link href="/portal/login">
                Book a Free Intro
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
                Contact Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="text-gray-500 text-sm mt-8">
            Oxnard, CA &bull; Personalized coaching &bull; No contracts
          </p>
        </div>
      </Section>
    </div>
  );
}
