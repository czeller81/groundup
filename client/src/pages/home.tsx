import { Link } from "wouter";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import {
  Shield, Dumbbell, Users, Award, ChevronDown, ChevronUp,
  Star, ArrowRight, Zap, Heart
} from "lucide-react";
import femaleFighterImage from "@assets/stock_images/woman_training_bjj_m_bb6c5084.jpg";
import femaleStudent1 from "@assets/stock_images/female_bjj_students__456d0e30.jpg";
import femaleStudent2 from "@assets/stock_images/female_bjj_students__0fe74900.jpg";
import femaleStudent3 from "@assets/stock_images/female_bjj_students__65085ad5.jpg";
import trainerImage from "@assets/stock_images/female_brazilian_jiu_cfa563c5.jpg";
import openMatImage from "@assets/stock_images/female_bjj_martial_a_dc8c6615.jpg";
import compImage from "@assets/stock_images/female_mma_fighters__f5fccfa4.jpg";
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
      <section className="relative min-h-screen flex items-center overflow-hidden grain-texture" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#121826] to-[#0B0F14]" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
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
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-sm mb-6"
            >
              <Zap className="h-3.5 w-3.5" />
              Women's Only BJJ Training
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-white">GROUND</span>
              <br />
              <span className="gradient-text-cyan">UP</span>{" "}
              <span className="text-white">JJ &</span>
              <br />
              <span className="gradient-text-purple">FITNESS</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-gray-300 max-w-xl mb-10 leading-relaxed"
            >
              Build real confidence, strength, and self-defense skills in a supportive, women-only environment. Personal training tailored for you.
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
                  Book a Free Trial
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
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5EEBFF]/30 to-transparent" />
      </section>

      <Section className="py-20 bg-[#0B0F14] relative" delay={0}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: "Beginner Friendly", desc: "No experience needed" },
              { icon: Users, label: "Women-Led", desc: "Female coaches & community" },
              { icon: Heart, label: "Safe & Supportive", desc: "Judgment-free space" },
              { icon: Award, label: "Skill Building", desc: "Real techniques that work" },
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

      <Section className="py-24 bg-[#121826] relative grain-texture belt-stripe" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              OUR <span className="gradient-text-cyan">PROGRAMS</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From your first class to competition prep, we have a program for every stage of your journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Fundamentals",
                desc: "Core techniques and positions for beginners. Build a solid foundation in a safe environment.",
                img: femaleFighterImage,
                accent: "#5EEBFF",
              },
              {
                title: "All Levels",
                desc: "Mixed-level training with advanced techniques, sparring, and real-world application.",
                img: femaleStudent1,
                accent: "#B06CFF",
              },
              {
                title: "Open Mat",
                desc: "Free rolling time to practice with training partners at your own pace.",
                img: openMatImage,
                accent: "#FFB199",
              },
              {
                title: "Competition",
                desc: "Intensive prep for tournaments. Strategy, conditioning, and mental toughness.",
                img: compImage,
                accent: "#5EEBFF",
              },
            ].map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative rounded-2xl overflow-hidden border border-white/5 bg-[#0B0F14] hover:border-white/10 transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={program.img}
                    alt={program.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/50 to-transparent" />
                </div>
                <div className="relative p-6 -mt-12">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: program.accent }} />
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{program.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{program.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
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
                With 5 years of experience, Raymi leads the women's-only program at Gracie Barra Ventura.
                She specializes in 1-on-1 BJJ training and strength & conditioning, creating personalized
                programs that meet each athlete exactly where they are.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {["1-on-1 BJJ", "Strength & Conditioning", "Women's Program", "Competition Prep"].map((tag) => (
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
                src={trainerImage}
                alt="Raymi Gonzalez"
                className="relative rounded-2xl w-full aspect-[3/4] object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHAT OUR <span className="gradient-text-warm">ATHLETES</span> SAY
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "The personal training sessions have completely transformed my confidence. Coach Raymi breaks down complex moves in such a supportive way.",
                name: "Maria G.",
                role: "Blue Belt",
                img: femaleStudent1,
              },
              {
                quote: "I started as a complete beginner and the women-only environment made me feel safe from day one. This is exactly what I needed.",
                name: "Jessica W.",
                role: "White Belt",
                img: femaleStudent2,
              },
              {
                quote: "Ground Up BJJ has the best coaching. Their women-focused approach helped me prepare for my first competition with real confidence.",
                name: "Priya P.",
                role: "Purple Belt",
                img: femaleStudent3,
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

      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              SIMPLE <span className="gradient-text-cyan">PRICING</span>
            </h2>
            <p className="text-gray-400">No contracts. No hidden fees. Just great training.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl border border-[#5EEBFF]/20 bg-gradient-to-b from-[#5EEBFF]/5 to-transparent p-8 text-center neon-glow">
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>PERSONAL TRAINING</h3>
              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className="text-5xl font-bold text-[#5EEBFF]" style={{ fontFamily: 'var(--font-display)' }}>$20</span>
                <span className="text-gray-400">/session</span>
              </div>
              <p className="text-gray-400 mb-6">60-minute 1-on-1 session with Coach Raymi</p>
              <ul className="text-left space-y-3 mb-8">
                {[
                  "Personalized technique instruction",
                  "Strength & conditioning",
                  "Flexible scheduling (8am – 5pm)",
                  "All equipment provided",
                  "Progress tracking",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Zap className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-14 text-base"
              >
                <Link href="/portal/login">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            FAQ
          </h2>
          <div className="space-y-3">
            <FAQ
              question="Do I need any experience to start?"
              answer="Not at all! Most of our athletes started with zero martial arts experience. Our Fundamentals program is designed specifically for beginners."
            />
            <FAQ
              question="What should I bring to my first class?"
              answer="Just comfortable athletic wear — leggings, a t-shirt, and a positive attitude. We provide all equipment including gis, belts, and mats."
            />
            <FAQ
              question="Is this program truly women-only?"
              answer="Yes! All classes, training sessions, and open mats are exclusively for women and girls. We maintain a safe, supportive, judgment-free environment."
            />
            <FAQ
              question="How do I book a session?"
              answer="Create a free member account, complete your intake forms, and book directly through our member portal. Sessions are available 8am–5pm."
            />
            <FAQ
              question="What is the cancellation policy?"
              answer="You can cancel anytime through the member portal. Same-day cancellations have a $10 fee. No long-term contracts or commitments required."
            />
            <FAQ
              question="Is BJJ safe for beginners?"
              answer="Absolutely. Safety is our top priority. You'll learn at your own pace with a qualified instructor giving you 1-on-1 attention throughout every session."
            />
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden" delay={0}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#5EEBFF]/5 via-[#B06CFF]/5 to-[#FFB199]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            READY TO <span className="gradient-text-warm">START?</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Take the first step. Join our women's training community and discover what you're capable of.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
          >
            <Link href="/portal/login">
              Book Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-gray-500 text-sm mt-6">
            Sessions $20/hour · Flexible scheduling · No contracts
          </p>
        </div>
      </Section>
    </div>
  );
}
