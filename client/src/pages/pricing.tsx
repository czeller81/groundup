import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Zap, ArrowRight, ChevronDown, ChevronUp, Check } from "lucide-react";

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

export default function Pricing() {
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            SIMPLE <span className="gradient-text-cyan">PRICING</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            No contracts. No hidden fees. Affordable training designed to fit your lifestyle.
          </p>
        </div>
      </section>

      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-white/10 bg-[#121826] p-8"
            >
              <div className="inline-block px-3 py-1 text-xs rounded-full bg-[#5EEBFF]/20 text-[#5EEBFF] border border-[#5EEBFF]/30 mb-4">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>PER SESSION</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold text-[#5EEBFF]" style={{ fontFamily: 'var(--font-display)' }}>$20</span>
                <span className="text-gray-400">/hour</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "1-on-1 personalized instruction",
                  "All equipment provided",
                  "Flexible scheduling (8am–5pm)",
                  "No commitment required",
                  "Pay as you go",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-12"
              >
                <Link href="/portal/login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="rounded-2xl border border-[#B06CFF]/30 bg-gradient-to-b from-[#B06CFF]/10 to-[#121826] p-8 neon-glow-purple relative"
            >
              <div className="inline-block px-3 py-1 text-xs rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30 mb-4">
                Best Value
              </div>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>MONTHLY UNLIMITED</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold text-[#B06CFF]" style={{ fontFamily: 'var(--font-display)' }}>$280</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited training sessions",
                  "Priority booking",
                  "Technique videos included",
                  "Progress tracking",
                  "Competition prep included",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Zap className="h-4 w-4 text-[#B06CFF] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full bg-[#B06CFF] text-white font-bold uppercase tracking-wider hover:bg-[#B06CFF]/90 h-12"
              >
                <Link href="/portal/login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#121826] grain-texture relative">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            PRICING <span className="gradient-text-cyan">FAQ</span>
          </h2>
          <div className="space-y-3">
            <FAQ
              question="What's included in every session?"
              answer="All equipment (gis, belts, mats), personalized instruction, strength & conditioning, and progress tracking. No hidden extras."
            />
            <FAQ
              question="Can I switch between plans?"
              answer="Absolutely. You can switch from pay-per-session to monthly unlimited at any time. Monthly members can also downgrade."
            />
            <FAQ
              question="What's the cancellation policy?"
              answer="You can cancel anytime through the member portal. Same-day cancellations have a $10 fee. No long-term contracts."
            />
            <FAQ
              question="Do you offer a free trial?"
              answer="Yes! Your first session is completely free with no obligation. Sign up through the member portal to book your trial."
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
