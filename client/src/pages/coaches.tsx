import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Award, Shield, BookOpen } from "lucide-react";
import SEO from "@/components/seo";
import trainerImage from "@assets/raymi-coach.jpg";
import trainingImage from "@assets/generated_images/pt_content.png";
import { localizedPublicPath, useLocale } from "@/lib/locale";

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
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    seoTitle: "Nuestra Instructora de BJJ — Raymi Gonzalez | Ground Up",
    seoDescription: "Conoce a Coach Raymi Gonzalez, cinturón morado de tercer grado bajo el linaje Gracie Barra. Instructora principal de Ground Up Jiu-Jitsu y Fitness en Oxnard, CA.",
    hero: "TU", heroAccent: "COACH",
    heroDescription: "Ground Up nació alrededor de una coach y una misión: crear un espacio seguro, personal y empoderador para mujeres, niñas y principiantes.",
    headCoach: "Coach principal", belt: "Cinturón morado · Tercer grado", lineage: "Linaje de la instructora",
    lineageBody: <>Promovida bajo el <span className="text-white font-medium">linaje Gracie Barra</span>, uno de los sistemas de BJJ más reconocidos del mundo. Raymi entrenó en el condado de Ventura, CA, con instructores certificados antes de fundar Ground Up BJJ y traer ese mismo método basado en fundamentos a Oxnard.</>,
    experience: "Instructora certificada de BJJ · Más de 5 años de experiencia enseñando",
    paragraphs: [
      "Raymi dirige los programas de Ground Up Jiu-Jitsu, con enfoque en defensa personal para mujeres, jiu-jitsu brasileño para principiantes, fuerza y acondicionamiento, y coaching personal.",
      "Su filosofía de enseñanza se centra en crear un ambiente seguro, comprensivo y empoderador, especialmente para mujeres y principiantes que pueden sentirse intimidados en los gimnasios tradicionales de artes marciales.",
      "A través de coaching personalizado y atención dedicada, Raymi ayuda a sus estudiantes a desarrollar habilidades reales de defensa personal, confianza, fuerza y disciplina a su propio ritmo.",
      "Ya seas completamente nueva en las artes marciales, quieras mejorar tu condición física o aprender defensa personal práctica, cada sesión está diseñada para encontrarte donde estás y ayudarte a crecer desde cero.",
    ],
    tags: ["Defensa personal para mujeres", "Fundamentos de BJJ", "Fuerza y acondicionamiento", "Coaching personal"],
    book: "Reserva una sesión", philosophy: "FILOSOFÍA DE", philosophyAccent: "ENSEÑANZA",
    philosophyCards: [
      ["Seguridad primero", "Cada sesión prioriza la técnica correcta y la prevención de lesiones para que puedas entrenar consistentemente durante años."],
      ["Atención individual", "Cada atleta aprende de manera distinta. El entrenamiento se adapta a tu cuerpo, estilo de aprendizaje y ritmo personal."],
      ["Crecimiento continuo", "Raymi continúa entrenando y desarrollando sus propias habilidades, para que sus estudiantes siempre reciban instrucción actual y de alta calidad."],
    ],
  } : {
    seoTitle: "Our BJJ Instructor — Raymi Gonzalez, Gracie Barra Lineage",
    seoDescription: "Meet Coach Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. Head instructor at Ground Up Jiu-Jitsu & Fitness in Oxnard, CA with 5+ years of coaching experience.",
    hero: "YOUR", heroAccent: "COACH",
    heroDescription: "Ground Up was built around one coach and one mission: create a safe, personal, empowering training space for women, kids, and beginners.",
    headCoach: "Head Coach", belt: "Purple Belt · 3rd Degree", lineage: "Instructor Lineage",
    lineageBody: <>Promoted under the <span className="text-white font-medium">Gracie Barra lineage</span> — one of the world's most recognized BJJ systems. Raymi trained in Ventura County, CA under certified black belt instructors before founding Ground Up BJJ and bringing that same fundamentals-first method to Oxnard.</>,
    experience: "Certified BJJ Instructor · 5+ Years Teaching Experience",
    paragraphs: [
      "Raymi leads the programs at Ground Up Jiu-Jitsu, focusing on women's self-defense, beginner-friendly Brazilian Jiu-Jitsu, strength & conditioning, and personal coaching.",
      "Her teaching philosophy centers on creating a safe, supportive, and empowering training environment, especially for women and beginners who may feel intimidated in traditional martial arts gyms.",
      "Through personalized coaching and dedicated attention, Raymi helps students build real self-defense skills, confidence, strength, and discipline at their own pace.",
      "Whether you're completely new to martial arts, looking to improve your fitness, or interested in learning practical self-defense, every session is designed to meet you where you are and help you grow from the ground up.",
    ],
    tags: ["Women's Self-Defense", "BJJ Fundamentals", "Strength & Conditioning", "Personal Coaching"],
    book: "Book a Session", philosophy: "TEACHING", philosophyAccent: "PHILOSOPHY",
    philosophyCards: [
      ["Safety First", "Every session prioritizes proper technique and injury prevention so you can train consistently for years to come."],
      ["Individual Attention", "Every athlete learns differently. Training is adapted to your body, learning style, and personal pace."],
      ["Continuous Growth", "Raymi continues to train and develop her own skills — which means her students always benefit from current, high-quality instruction."],
    ],
  };
  const bookPath = localizedPublicPath("/book", locale);
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/coaches", locale)}
      />
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            {copy.hero} <span className="gradient-text-purple">{copy.heroAccent}</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {copy.heroDescription}
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
                {copy.headCoach}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                RAYMI GONZALEZ
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30">
                  <Award className="h-3.5 w-3.5" />
                  {copy.belt}
                </span>
              </div>
              <div className="mb-6 border-l-2 border-[#5EEBFF]/30 pl-4">
                <p className="text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-1">{copy.lineage}</p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {copy.lineageBody}
                </p>
                <p className="text-gray-500 text-xs mt-2">{copy.experience}</p>
              </div>

              {copy.paragraphs.map((paragraph) => <p key={paragraph} className="text-gray-300 leading-relaxed mb-4">{paragraph}</p>)}

              <div className="flex flex-wrap gap-2 mb-8">
                {copy.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-gray-300 bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              <Button
                asChild
                className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90"
              >
                <Link href={bookPath}>
                  {copy.book}
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
            {copy.philosophy} <span className="gradient-text-cyan">{copy.philosophyAccent}</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {copy.philosophyCards.map(([title, desc], i) => {
              const icons = [Shield, Award, BookOpen];
              const accents = ["#5EEBFF", "#B06CFF", "#FFB199"];
              const Icon = icons[i];
              return (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#0B0F14] p-8 hover:border-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${accents[i]}15` }}>
                  <Icon className="h-6 w-6" style={{ color: accents[i] }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}
