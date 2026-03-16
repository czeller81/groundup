import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

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

export default function Pricing() {
  return (
    <div className="flex flex-col bg-[#0B0F14] min-h-screen">

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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none mb-5" style={{ fontFamily: 'var(--font-display)' }}>
            Start Your Training<br />at <span className="text-[#5EEBFF]">Ground Up</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Small-group coaching for women, kids, beginners, and anyone looking to build confidence through jiu-jitsu, self-defense, and strength &amp; conditioning.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
              <Link href="/portal/login">Book Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
              { icon: "🥋", title: "Women",                   desc: "A safe, empowering space built specifically for women of all skill levels." },
              { icon: "⭐", title: "Kids & Youth",            desc: "Age-appropriate jiu-jitsu that builds confidence, focus, and life skills." },
              { icon: "👋", title: "Beginners",               desc: "No experience needed — ever. We guide you from day one." },
              { icon: "💪", title: "Strength & Conditioning", desc: "Functional fitness training designed for athletes and everyday movers." },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.07}>
                <div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826] hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5">
                  <span className="text-2xl mb-4">{card.icon}</span>
                  <h3 className="text-white font-bold text-base mb-2">{card.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-5">{card.desc}</p>
                  <Button asChild size="sm" variant="ghost" className="w-full border border-white/8 text-gray-300 hover:text-white hover:bg-white/5 text-xs font-semibold uppercase tracking-wider">
                    <Link href="/portal/login">Book Free Intro</Link>
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
              },
              {
                title: "Kids Jiu-Jitsu",
                desc: "Fun, structured jiu-jitsu for ages 4 and up. Kids build discipline, coordination, and self-confidence through guided movement and play.",
                note: "Classes for ages 4–7 and 8+",
                accent: "#FFB199",
              },
              {
                title: "Strength & Conditioning",
                desc: "Functional training built for grapplers and everyday athletes. Mobility, strength, and injury prevention — open to all.",
                note: "Classes available daily · All fitness levels welcome",
                accent: "#5EEBFF",
              },
            ].map((prog, i) => (
              <Reveal key={prog.title} delay={i * 0.09}>
                <div className="h-full flex flex-col p-6 rounded-2xl border border-white/8 bg-[#121826] hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="w-1 h-8 rounded-full mb-4" style={{ backgroundColor: prog.accent }} />
                  <h3 className="text-white font-bold text-base mb-3 leading-snug">{prog.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4">{prog.desc}</p>
                  <p className="text-xs mb-5" style={{ color: prog.accent }}>{prog.note}</p>
                  <Button asChild size="sm" className="w-full font-bold text-[#0B0F14] hover:opacity-90 text-xs uppercase tracking-wider" style={{ backgroundColor: prog.accent }}>
                    <Link href="/portal/login">Book Free Intro</Link>
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
                    <Link href="/portal/login">Book Your Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
              How the Free Intro <span className="text-[#FFB199]">Works</span>
            </h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {[
              { num: "01", title: "Book",              desc: "Pick any time that works. No payment, no commitment.", color: "#5EEBFF" },
              { num: "02", title: "Meet Your Coach",   desc: "Come see the space and have a quick chat about your goals.", color: "#B06CFF" },
              { num: "03", title: "Start Training",    desc: "Try the class. Join only when you're ready.", color: "#FFB199" },
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
            <p className="text-gray-500 text-sm italic mb-6">No pressure. We'll help you find the best class for your goals.</p>
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
              <Link href="/portal/login">Book Your Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
                { question: "What happens at the free intro?",       answer: "You come in, meet Coach Raymi, see the space, and try a class. No commitment, no sales pressure. It's just a chance to feel comfortable and find the right fit." },
                { question: "Who are your classes designed for?",    answer: "Primarily women, kids, and beginners — but anyone is welcome. We specialize in creating environments where people who've never trained before feel completely at home." },
                { question: "What should I wear?",                   answer: "Comfortable workout clothes work great for your first visit. We'll guide you on any gear you might need once you've chosen a program." },
                { question: "How do I know which program is right?", answer: "That's what the free intro is for. After a short conversation, we'll point you to the best-fit class for your goals, schedule, and comfort level." },
                { question: "What age can kids start?",              answer: "Kids can start as young as 4 in our Kids Intro to Jiu-Jitsu class. We also have youth classes for ages 8 and up — both are fun, structured, and age-appropriate." },
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
            Book your free intro and we'll help you find the right fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 px-8">
              <Link href="/portal/login">Book Free Intro <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-white hover:bg-white/5 px-8 uppercase tracking-wider">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
          <p className="text-gray-600 text-xs mt-6">Women, kids, and beginners welcome · Oxnard, CA</p>
        </Reveal>
      </section>

    </div>
  );
}
