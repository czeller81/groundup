import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Zap, Target, Clock, Users, Dumbbell, Shield } from "lucide-react";
import SEO from "@/components/seo";
import trainingImage from "@assets/generated_images/pt_hero_bg.png";
import sparringImage from "@assets/generated_images/pt_content.png";

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

export default function PersonalTraining() {
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title="Personal Training in Oxnard, CA — 1-on-1 BJJ & Fitness Coaching"
        description="Book a private personal training session at Ground Up Jiu-Jitsu in Oxnard, CA. Custom 1-on-1 coaching for all fitness levels. Your first session is free."
        canonical="/personal-training"
      />
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${trainingImage})` }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            PERSONAL <span className="gradient-text-cyan">TRAINING</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg mb-10">
            1-on-1 BJJ instruction and strength & conditioning tailored specifically for women.
            Train at your pace, on your schedule.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
          >
            <Link href="/portal/login">
              Book Your Session
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              WHY <span className="gradient-text-cyan">1-ON-1</span> TRAINING?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Get focused attention and customized instruction to accelerate your progress.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "Personalized", desc: "Every session is tailored to your body type, goals, and skill level.", accent: "#5EEBFF" },
              { icon: Dumbbell, title: "Strength + BJJ", desc: "Combined martial arts training with strength and conditioning.", accent: "#B06CFF" },
              { icon: Clock, title: "Flexible Hours", desc: "Book sessions 8am–5pm, Monday through Saturday.", accent: "#FFB199" },
              { icon: Users, title: "Women Only", desc: "Train in a safe, comfortable, women-only environment.", accent: "#5EEBFF" },
              { icon: Shield, title: "Self-Defense", desc: "Learn real-world techniques that build confidence and safety.", accent: "#B06CFF" },
              { icon: Zap, title: "Fast Results", desc: "See progress faster with dedicated 1-on-1 attention.", accent: "#FFB199" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#121826] p-6 hover:border-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${item.accent}15` }}>
                  <item.icon className="h-5 w-5" style={{ color: item.accent }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#121826] grain-texture belt-stripe relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#5EEBFF]/10 to-[#B06CFF]/10 rounded-2xl blur-xl" />
              <img
                src={sparringImage}
                alt="Training session"
                className="relative rounded-2xl w-full aspect-[4/3] object-cover border border-white/10"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                WHAT'S <span className="gradient-text-purple">INCLUDED</span>
              </h2>
              <ul className="space-y-4 mb-8">
                {[
                  "60-minute personalized training sessions",
                  "Technique instruction at your level",
                  "Strength & conditioning exercises",
                  "Self-defense fundamentals",
                  "All equipment provided (gis, belts, mats)",
                  "Flexible booking through member portal",
                  "Progress tracking and goal setting",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300">
                    <Zap className="h-4 w-4 text-[#B06CFF] flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90"
              >
                <Link href="/portal/login">
                  Sign Up to Book
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#0B0F14] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#5EEBFF]/5 via-transparent to-[#B06CFF]/5" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            YOUR FIRST SESSION IS <span className="gradient-text-warm">FREE</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10">
            No commitment required. Come try a session, meet your coach, and see if Ground Up BJJ is right for you.
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
          <p className="text-gray-500 text-sm mt-6">No credit card required · Cancel anytime</p>
        </div>
      </Section>
    </div>
  );
}
