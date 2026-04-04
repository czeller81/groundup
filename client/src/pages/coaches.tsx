import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Award, Shield, BookOpen } from "lucide-react";
import SEO from "@/components/seo";
import trainerImage from "@assets/generated_images/coaches_portrait.png";
import trainingImage from "@assets/generated_images/pt_content.png";

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

export default function Coaches() {
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title="Our BJJ Instructor — Raymi Gonzalez, Gracie Barra Lineage"
        description="Meet Coach Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. Head instructor at Ground Up Jiu-Jitsu & Fitness in Oxnard, CA with 5+ years of coaching experience."
        canonical="/coaches"
      />
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            YOUR <span className="gradient-text-purple">COACH</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Ground Up was built around one coach and one mission: create a safe, personal, empowering training space for women, kids, and beginners.
          </p>
        </div>
      </section>

      <Section className="py-24 bg-[#0B0F14] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#B06CFF]/20 to-[#5EEBFF]/10 rounded-2xl blur-xl" />
              <img
                src={trainerImage}
                alt="Raymi Gonzalez"
                className="relative rounded-2xl w-full aspect-[3/4] object-cover border border-white/10"
              />
            </div>

            <div>
              <span className="inline-block px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30 mb-4">
                Head Coach
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                RAYMI GONZALEZ
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30">
                  <Award className="h-3.5 w-3.5" />
                  Purple Belt · 3rd Degree
                </span>
              </div>
              <div className="mb-6 border-l-2 border-[#5EEBFF]/30 pl-4">
                <p className="text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-1">Instructor Lineage</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Promoted under the <span className="text-white font-medium">Gracie Barra lineage</span> — one of the world's most recognized BJJ systems. Raymi trained in Ventura County, CA under certified black belt instructors before founding Ground Up BJJ and bringing that same fundamentals-first method to Oxnard.
                </p>
                <p className="text-gray-500 text-xs mt-2">Certified BJJ Instructor · 5+ Years Teaching Experience</p>
              </div>

              <p className="text-gray-300 leading-relaxed mb-4">
                Raymi leads the programs at Ground Up Jiu-Jitsu, focusing on women's self-defense, beginner-friendly Brazilian Jiu-Jitsu, strength & conditioning, and personal coaching.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Her teaching philosophy centers on creating a safe, supportive, and empowering training environment, especially for women and beginners who may feel intimidated in traditional martial arts gyms.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Through personalized coaching and dedicated attention, Raymi helps students build real self-defense skills, confidence, strength, and discipline at their own pace.
              </p>
              <p className="text-gray-300 leading-relaxed mb-8">
                Whether you're completely new to martial arts, looking to improve your fitness, or interested in learning practical self-defense, every session is designed to meet you where you are and help you grow from the ground up.
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {["Women's Self-Defense", "BJJ Fundamentals", "Strength & Conditioning", "Personal Coaching"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-gray-300 bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              <Button
                asChild
                className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90"
              >
                <Link href="/portal/login">
                  Book a Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section className="py-24 bg-[#121826] grain-texture belt-stripe relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            TEACHING <span className="gradient-text-cyan">PHILOSOPHY</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Safety First",
                desc: "Every session prioritizes proper technique and injury prevention so you can train consistently for years to come.",
                accent: "#5EEBFF",
              },
              {
                icon: Award,
                title: "Individual Attention",
                desc: "Every athlete learns differently. Training is adapted to your body, learning style, and personal pace.",
                accent: "#B06CFF",
              },
              {
                icon: BookOpen,
                title: "Continuous Growth",
                desc: "Raymi continues to train and develop her own skills — which means her students always benefit from current, high-quality instruction.",
                accent: "#FFB199",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#0B0F14] p-8 hover:border-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${item.accent}15` }}>
                  <item.icon className="h-6 w-6" style={{ color: item.accent }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
