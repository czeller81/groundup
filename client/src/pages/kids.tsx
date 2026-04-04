import { Link } from "wouter";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import {
  Star, CheckCircle, ArrowRight, Clock, Calendar,
  Shield, Award, Heart, Users, ChevronDown, ChevronUp, Zap
} from "lucide-react";
import { SCHEDULE, CATEGORY_CONFIG } from "@/lib/schedule-data";
import kidsClassImg from "@assets/generated_images/kids_martialarts.png";

const facilityFrame5 = "/images/facility/frame_05.jpg";

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
        {open ? <ChevronUp className="h-5 w-5 text-[#FFB199] flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
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

const kidsClasses = SCHEDULE.filter(c =>
  ["kids", "youth", "competition"].includes(c.category) && c.audience.some(a => ["kids", "youth"].includes(a))
);

export default function Kids() {
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title="Kids Jiu-Jitsu in Oxnard, CA — Ages 4–14 | Ground Up Jiu-Jitsu"
        description="Kids Jiu-Jitsu classes in Oxnard, CA for ages 4–14. Build confidence, discipline, and anti-bullying awareness in a structured, welcoming program. First class free."
        canonical="https://groundupbjj.com/kids"
      />

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#0D1420] to-[#0B0F14]" />
        <div className="absolute inset-0">
          <img
            src={kidsClassImg}
            alt="Kids Jiu-Jitsu"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/60 to-[#0B0F14]/40" />
        </div>
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#FFB199]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#B06CFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/30 bg-[#FFB199]/10 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-6">
              <Star className="h-3.5 w-3.5" /> Kids Program · Ages 4–14 · Oxnard, CA
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.9] mb-6 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              <span className="text-white">MORE THAN</span>
              <br />
              <span className="text-[#FFB199]">MARTIAL</span>
              <br />
              <span className="text-white">ARTS</span>
            </h1>

            <p className="text-lg text-gray-300 mb-4 leading-relaxed max-w-xl">
              A structured kids BJJ program that builds real confidence, respectful discipline, and the self-awareness to handle life's challenges — on and off the mat.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {["Ages 4–14", "Max 6 kids per class", "First class free"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFB199]/10 text-[#FFB199] border border-[#FFB199]/20">
                  <CheckCircle className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-base font-bold uppercase tracking-wider bg-[#FFB199] text-[#0B0F14] hover:bg-[#FFB199]/90"
              >
                <Link href="/book">
                  Book a Free Trial Class <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-8 text-base border-white/20 text-white hover:bg-white/10 bg-transparent uppercase tracking-wider"
              >
                <Link href="/schedule">View Schedule</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHAT KIDS GAIN */}
      <Section className="py-24 bg-[#121826]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4">
              Why BJJ for Kids?
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              WHAT KIDS <span className="text-[#FFB199]">BUILD HERE</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm">
              Jiu-Jitsu is one of the few sports where a smaller, calmer child can succeed — technique and timing matter more than size or aggression.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: "Real Confidence",
                desc: "Not just a belt on a wall. Kids learn that they can handle hard situations — and that feeling stays with them.",
                accent: "#FFB199",
              },
              {
                icon: Award,
                title: "Respect & Discipline",
                desc: "Structure, listening, and follow-through. BJJ teaches kids to focus, be patient, and respect others — skills that transfer directly to school.",
                accent: "#B06CFF",
              },
              {
                icon: Users,
                title: "Anti-Bullying Awareness",
                desc: "Kids learn to de-escalate, walk away confidently, and only use physical techniques as an absolute last resort.",
                accent: "#5EEBFF",
              },
              {
                icon: Zap,
                title: "Physical Coordination",
                desc: "BJJ develops body awareness, balance, and athletic movement in a way most other sports can't — it uses the whole body.",
                accent: "#FFB199",
              },
              {
                icon: Heart,
                title: "Emotional Regulation",
                desc: "Learning to stay calm under pressure — on the mat and in life. Kids who train BJJ handle frustration better.",
                accent: "#B06CFF",
              },
              {
                icon: CheckCircle,
                title: "Goal Setting",
                desc: "Belt progressions give kids visible, achievable milestones. They learn that consistent effort leads to real results.",
                accent: "#5EEBFF",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="p-6 rounded-2xl border border-white/5 bg-[#0B0F14] hover:border-white/10 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${item.accent}15` }}
                >
                  <item.icon className="h-5 w-5" style={{ color: item.accent }} />
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
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#FFB199]/10 to-[#B06CFF]/10 rounded-2xl blur-xl" />
              <img
                src={facilityFrame5}
                alt="Student smiling in class"
                className="relative rounded-2xl w-full aspect-[4/3] object-cover border border-white/10"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-xs font-semibold uppercase tracking-wider mb-6">
                Two Age Groups
              </div>
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-display)" }}>
                CLASSES BUILT <span className="text-[#B06CFF]">FOR THEIR AGE</span>
              </h2>

              <div className="space-y-5 mb-8">
                {[
                  {
                    age: "Ages 4–7",
                    name: "Kids Intro to Jiu-Jitsu",
                    desc: "Movement, coordination, and basic techniques introduced through games and partner drills. Short, engaging, age-appropriate.",
                    color: "#FFB199",
                  },
                  {
                    age: "Ages 8–14",
                    name: "Youth Jiu-Jitsu",
                    desc: "More structured curriculum with belt progression, technique drilling, and light partner training. Builds real skill over time.",
                    color: "#B06CFF",
                  },
                ].map((group) => (
                  <div key={group.age} className="p-5 rounded-xl border border-white/5 bg-[#121826]">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${group.color}20`, color: group.color }}
                      >
                        {group.age}
                      </span>
                      <span className="text-white font-semibold text-sm">{group.name}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">{group.desc}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                {[
                  { label: "Class size", value: "Max 6 kids" },
                  { label: "Location", value: "Oxnard, CA" },
                  { label: "First class", value: "100% Free" },
                  { label: "Gear needed", value: "None to start" },
                ].map((row) => (
                  <div key={row.label} className="p-3 rounded-lg border border-white/5 bg-[#121826]">
                    <div className="text-gray-500 text-xs">{row.label}</div>
                    <div className="text-white font-semibold mt-0.5">{row.value}</div>
                  </div>
                ))}
              </div>

              <Button
                asChild
                size="lg"
                className="h-12 px-8 font-bold uppercase tracking-wider bg-[#FFB199] text-[#0B0F14] hover:bg-[#FFB199]/90"
              >
                <Link href="/book">
                  Book a Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
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
              KIDS <span className="text-[#5EEBFF]">CLASS TIMES</span>
            </h2>
          </div>

          <div className="space-y-3">
            {kidsClasses.map((cls, i) => {
              const cfg = CATEGORY_CONFIG[cls.category];
              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${cfg.border} bg-[#0B0F14]`}
                >
                  <div className="text-xl">{cfg.icon}</div>
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cls.tags.map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} opacity-80`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <Link href="/book">
                    <Button size="sm" className="text-xs font-semibold uppercase tracking-wide flex-shrink-0 bg-[#FFB199]/10 text-[#FFB199] border border-[#FFB199]/20 hover:bg-[#FFB199]/20">
                      Book
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* PARENT FAQ */}
      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: "var(--font-display)" }}>
            QUESTIONS FROM <span className="text-[#FFB199]">PARENTS</span>
          </h2>
          <div className="space-y-3">
            <FAQ question="What age can my child start?" answer="We have an introductory class for ages 4–7 and a youth class for ages 8–14. Both are structured for their developmental stage." />
            <FAQ question="Is it safe? Will kids get hurt?" answer="BJJ is one of the safest martial arts for kids because there's no striking. Beginners learn technique and controlled partner drills — no competitive sparring until they're ready." />
            <FAQ question="Does my child need a gi (uniform)?" answer="No — not for the trial class. Once you decide to enroll, we'll walk you through what to get. For now, comfortable athletic clothing is all they need." />
            <FAQ question="What if my child is shy or nervous?" answer="Coach Raymi has worked with many shy kids. The small class size (max 6) means your child gets personal attention and won't get lost or feel overwhelmed." />
            <FAQ question="How quickly will I see results?" answer="Most parents notice changes in focus, confidence, and listening within the first few weeks. Technique takes longer — but the character development starts on day one." />
            <FAQ question="Can I stay and watch?" answer="Yes, parents are welcome to observe class. Many parents end up loving watching their kid grow on the mat." />
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-24 bg-[#121826] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFB199]/5 via-transparent to-[#B06CFF]/5" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            FIRST CLASS IS <span className="text-[#FFB199]">FREE</span>
          </h2>
          <p className="text-gray-400 mb-10 max-w-md mx-auto">
            No commitment. No gear needed. Just bring your kid and an open mind — Coach Raymi handles the rest.
          </p>
          <Button
            asChild
            size="lg"
            className="h-14 px-12 text-base font-bold uppercase tracking-wider bg-[#FFB199] text-[#0B0F14] hover:bg-[#FFB199]/90"
          >
            <Link href="/book">
              Book a Free Trial Class <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-gray-600 text-xs mt-4">No credit card required · Oxnard, CA · (786) 757-1175</p>
        </div>
      </Section>
    </div>
  );
}
