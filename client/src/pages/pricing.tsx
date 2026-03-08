import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle, Users, Shield, Dumbbell, Star } from "lucide-react";

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

      {/* HERO */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/30 bg-[#FFB199]/10 text-[#FFB199] text-sm mb-6 font-medium">
            <Users className="h-3.5 w-3.5" />
            Small Group Classes &bull; Max 6 Students
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            SIMPLE, AFFORDABLE <span className="gradient-text-cyan">PRICING</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg">
            Boutique training with small class sizes, personalized coaching, and beginner-friendly programs.
          </p>
        </div>
      </section>

      {/* WHY TRAIN HERE */}
      <Section className="pb-12 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#121826] border border-white/10 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Why Train Here?</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4">
              {[
                "Small group classes",
                "Personalized coaching",
                "Beginner friendly",
                "Safe, welcoming environment",
                "Built for women, kids & beginners",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#5EEBFF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* FEATURED — WOMEN'S SELF-DEFENSE */}
      <Section className="py-8 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-[#B06CFF]/10 via-[#121826] to-[#5EEBFF]/10 border border-[#B06CFF]/30 rounded-2xl p-8 md:p-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#B06CFF]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B06CFF]/20 border border-[#B06CFF]/40 text-[#B06CFF] text-sm font-semibold mb-4">
                  <Star className="h-3.5 w-3.5" /> Featured Program
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  Women's Self-Defense Program
                </h2>
                <p className="text-[#B06CFF] font-semibold mb-4">8-Week Program</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-bold text-white">$199</span>
                  <span className="text-gray-400">total</span>
                </div>
                <p className="text-gray-300 mb-6">
                  Our signature self-defense program helps women build practical skills, situational awareness, confidence, and strength in a supportive environment.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    "8-week program",
                    "2 classes per week (16 total classes)",
                    "Beginner friendly — no experience needed",
                    "Practical real-world self-defense skills",
                    "Supportive women-only environment",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-[#B06CFF] flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Button asChild size="lg" className="bg-[#B06CFF] text-white font-bold uppercase tracking-wider hover:bg-[#B06CFF]/90">
                  <Link href="/portal/login">
                    Reserve Your Spot
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
              <div className="hidden md:flex flex-col gap-4">
                <div className="bg-[#0B0F14]/60 rounded-xl p-6 border border-[#B06CFF]/20">
                  <p className="text-[#B06CFF] font-semibold text-sm mb-1">Total Investment</p>
                  <p className="text-white text-3xl font-bold">$199</p>
                  <p className="text-gray-400 text-sm mt-1">for the full 8-week program</p>
                </div>
                <div className="bg-[#0B0F14]/60 rounded-xl p-6 border border-white/10">
                  <p className="text-gray-400 text-sm mb-1">That's only</p>
                  <p className="text-white text-3xl font-bold">$12.44<span className="text-lg text-gray-400">/class</span></p>
                  <p className="text-gray-400 text-sm mt-1">across 16 total sessions</p>
                </div>
                <div className="bg-[#0B0F14]/60 rounded-xl p-6 border border-white/10">
                  <p className="text-gray-400 text-sm mb-2">What you'll build</p>
                  <div className="flex flex-wrap gap-2">
                    {["Confidence", "Awareness", "Strength", "Discipline"].map((tag) => (
                      <span key={tag} className="px-3 py-1 text-xs rounded-full bg-[#B06CFF]/10 text-[#B06CFF] border border-[#B06CFF]/20">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* TOP 4 CARDS */}
      <Section className="py-8 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* FREE INTRO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors"
            >
              <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-[#5EEBFF]/10 border border-[#5EEBFF]/30 text-[#5EEBFF] text-xs font-semibold mb-4">
                Best Place to Start
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Free Intro Class</h3>
              <p className="text-4xl font-bold text-[#5EEBFF] mb-4">Free</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">Try a class, meet the coach, and experience the training environment before committing.</p>
              <Button asChild className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/portal/login">Book Free Intro</Link>
              </Button>
            </motion.div>

            {/* WOMEN'S BJJ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Women's BJJ Fundamentals</h3>
              <p className="text-3xl font-bold text-white mb-1">$120<span className="text-lg font-normal text-gray-400">/mo</span></p>
              <p className="text-gray-500 text-xs mb-4">Small group · Max 6 students</p>
              <p className="text-gray-400 text-sm mb-5 flex-grow">Small group jiu-jitsu training focused on confidence, technique, movement, and beginner-friendly instruction.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> 2 classes per week</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Beginner friendly</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Technique focused</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Max 6 students per class</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Start Training</Link>
              </Button>
            </motion.div>

            {/* KIDS JIU-JITSU */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Kids Jiu-Jitsu</h3>
              <p className="text-3xl font-bold text-white mb-1">$100<span className="text-lg font-normal text-gray-400">/mo</span></p>
              <p className="text-gray-500 text-xs mb-4">Ages 6–14</p>
              <p className="text-gray-400 text-sm mb-5 flex-grow">A positive program that helps kids build confidence, discipline, coordination, and anti-bullying awareness.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> 2 classes per week</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Confidence building</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Discipline & coordination</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Small class sizes</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Enroll Your Child</Link>
              </Button>
            </motion.div>

            {/* STRENGTH & CONDITIONING */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Strength & Conditioning</h3>
              <p className="text-3xl font-bold text-white mb-1">$15<span className="text-lg font-normal text-gray-400">/class</span></p>
              <p className="text-gray-500 text-xs mb-4">Or $60/month unlimited</p>
              <p className="text-gray-400 text-sm mb-5 flex-grow">Small group fitness sessions focused on mobility, strength, injury prevention, and athletic conditioning.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Mobility work</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Strength training</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Injury prevention</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /> Athletic conditioning</div>
              </div>
              <Button asChild className="w-full bg-white text-[#0B0F14] font-bold hover:bg-gray-200">
                <Link href="/portal/login">Join a Class</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* PERSONAL TRAINING + COMMUNITY */}
      <Section className="py-8 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* PERSONAL TRAINING */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#FFB199]/30 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Personal Training</h3>
              <p className="text-3xl font-bold text-white mb-1">$60<span className="text-lg font-normal text-gray-400">/session</span></p>
              <p className="text-gray-500 text-xs mb-4">One-on-one private coaching</p>
              <p className="text-gray-400 text-sm mb-5 flex-grow">One-on-one coaching tailored to your fitness, self-defense, or performance goals.</p>
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" /> Private coaching</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" /> Personalized instruction</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" /> Self-defense or fitness focused</div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" /> Goal-based training</div>
              </div>
              <Button asChild className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/portal/login">
                  Book a Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            {/* FREE COMMUNITY CLASS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="bg-[#121826] border border-white/10 rounded-xl p-6 flex flex-col hover:border-[#5EEBFF]/30 transition-colors"
            >
              <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-[#5EEBFF]/10 border border-[#5EEBFF]/30 text-[#5EEBFF] text-xs font-semibold mb-4">
                Community
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Free Community Self-Defense</h3>
              <p className="text-3xl font-bold text-[#5EEBFF] mb-1">Free</p>
              <p className="text-gray-500 text-xs mb-4">Every 2 weeks</p>
              <p className="text-gray-400 text-sm mb-6 flex-grow">We host a free community self-defense class every two weeks to help women feel safer, introduce people to training, and give back to the community. No experience required — everyone is welcome.</p>
              <Button asChild className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/contact">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* NO EXPERIENCE NOTE */}
      <Section className="py-8 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-base italic">
            No experience needed. Our programs are designed to help you build confidence from day one in a safe and supportive environment.
          </p>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="py-24 bg-[#121826] grain-texture relative">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            PRICING <span className="gradient-text-cyan">FAQ</span>
          </h2>
          <div className="space-y-3">
            <FAQ
              question="Do I need experience to join?"
              answer="No. All programs are beginner friendly. Our programs are designed to help you build confidence from day one in a safe and supportive environment."
            />
            <FAQ
              question="How small are the classes?"
              answer="We keep all group classes to a maximum of 6 students. This means more personal coaching, better technique correction, and a more comfortable learning environment."
            />
            <FAQ
              question="What's included in the Women's Self-Defense program?"
              answer="The 8-week program includes 2 classes per week (16 total sessions) covering practical real-world self-defense techniques, situational awareness, confidence-building, and strength. All equipment is provided."
            />
            <FAQ
              question="Can I try before I commit?"
              answer="Yes! Your first intro class is completely free with no obligation. Sign up through the member portal to book your free intro."
            />
            <FAQ
              question="What is the free community self-defense class?"
              answer="Every two weeks we host a free, open self-defense class for the community. It's a great way to try training with no commitment, meet other students, and build local safety awareness."
            />
            <FAQ
              question="What's the cancellation policy?"
              answer="You can cancel anytime through the member portal. Same-day cancellations have a $10 fee. No long-term contracts."
            />
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden grain-texture">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5EEBFF]/5 via-[#B06CFF]/5 to-[#FFB199]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            START FROM THE <span className="gradient-text-warm">GROUND UP</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Whether you're looking to learn self-defense, improve your fitness, or help your child build confidence — we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14">
              <Link href="/portal/login">
                Book a Free Intro
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 uppercase tracking-wider text-base px-8 h-14 bg-transparent">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
          <p className="text-gray-500 text-sm mt-8">
            Oxnard, CA &bull; Max 6 students per class &bull; No contracts
          </p>
        </div>
      </Section>
    </div>
  );
}
