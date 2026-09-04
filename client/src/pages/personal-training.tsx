import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Zap, Target, Clock, Users, Dumbbell, Shield } from "lucide-react";
import SEO from "@/components/seo";
import trainingImage from "@assets/generated_images/pt_hero_bg.png";
import sparringImage from "@assets/generated_images/pt_content.png";
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

export default function PersonalTraining() {
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    seoTitle: "Entrenamiento Personal en Oxnard, CA — Coaching de BJJ y Fitness 1 a 1",
    seoDescription: "Reserva una sesión privada de entrenamiento personal en Ground Up Jiu-Jitsu en Oxnard, CA. Coaching individualizado para todos los niveles. Tu primera sesión es gratis.",
    title: "ENTRENAMIENTO", accent: "PERSONAL",
    intro: "Instrucción de BJJ y fuerza y acondicionamiento 1 a 1, adaptados específicamente para mujeres. Entrena a tu ritmo y según tu horario.",
    bookSession: "Reserva tu sesión", whyTitle: "¿POR QUÉ ENTRENAR", whyAccent: "1 A 1?",
    whyDescription: "Recibe atención enfocada e instrucción personalizada para acelerar tu progreso.",
    features: [
      ["Personalizado", "Cada sesión se adapta a tu tipo de cuerpo, objetivos y nivel de habilidad."],
      ["Fuerza + BJJ", "Combina artes marciales con fuerza y acondicionamiento."],
      ["Horarios flexibles", "Reserva sesiones de 8 a. m. a 5 p. m., de lunes a sábado."],
      ["Solo para mujeres", "Entrena en un ambiente seguro, cómodo y solo para mujeres."],
      ["Defensa personal", "Aprende técnicas prácticas que desarrollan confianza y seguridad."],
      ["Resultados rápidos", "Avanza más rápido con atención individual dedicada."],
    ],
    includedTitle: "¿QUÉ INCLUYE?",
    included: ["Sesiones personalizadas de 60 minutos", "Instrucción técnica según tu nivel", "Ejercicios de fuerza y acondicionamiento", "Fundamentos de defensa personal", "Todo el equipo incluido (gis, cinturones y tatamis)", "Reserva flexible desde el portal de miembros", "Seguimiento de progreso y objetivos"],
    signUp: "Regístrate para reservar",
    freeTitle: "TU PRIMERA SESIÓN ES", freeAccent: "GRATIS",
    freeDescription: "Sin compromiso. Ven a probar una sesión, conoce a tu coach y descubre si Ground Up BJJ es para ti.",
    freeTrial: "Reserva tu prueba gratis", noCard: "No necesitas tarjeta · Cancela cuando quieras",
  } : {
    seoTitle: "Personal Training in Oxnard, CA — 1-on-1 BJJ & Fitness Coaching",
    seoDescription: "Book a private personal training session at Ground Up Jiu-Jitsu in Oxnard, CA. Custom 1-on-1 coaching for all fitness levels. Your first session is free.",
    title: "PERSONAL", accent: "TRAINING",
    intro: "1-on-1 BJJ instruction and strength & conditioning tailored specifically for women. Train at your pace, on your schedule.",
    bookSession: "Book Your Session", whyTitle: "WHY", whyAccent: "1-ON-1", whySuffix: "TRAINING?",
    whyDescription: "Get focused attention and customized instruction to accelerate your progress.",
    features: [
      ["Personalized", "Every session is tailored to your body type, goals, and skill level."],
      ["Strength + BJJ", "Combined martial arts training with strength and conditioning."],
      ["Flexible Hours", "Book sessions 8am–5pm, Monday through Saturday."],
      ["Women Only", "Train in a safe, comfortable, women-only environment."],
      ["Self-Defense", "Learn real-world techniques that build confidence and safety."],
      ["Fast Results", "See progress faster with dedicated 1-on-1 attention."],
    ],
    includedTitle: "WHAT'S INCLUDED",
    included: ["60-minute personalized training sessions", "Technique instruction at your level", "Strength & conditioning exercises", "Self-defense fundamentals", "All equipment provided (gis, belts, mats)", "Flexible booking through member portal", "Progress tracking and goal setting"],
    signUp: "Sign Up to Book",
    freeTitle: "YOUR FIRST SESSION IS", freeAccent: "FREE",
    freeDescription: "No commitment required. Come try a session, meet your coach, and see if Ground Up BJJ is right for you.",
    freeTrial: "Book Your Free Trial", noCard: "No credit card required · Cancel anytime",
  };
  const bookPath = localizedPublicPath("/book", locale);
  const contactFormPath = localizedPublicPath("/contact#contact-form", locale);
  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/personal-training", locale)}
      />
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${trainingImage})` }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="break-words text-4xl font-bold text-white mb-6 sm:text-5xl md:text-7xl" style={{ fontFamily: 'var(--font-display)' }}>
            {copy.title} <span className="gradient-text-cyan">{copy.accent}</span>
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-lg mb-10">
            {copy.intro}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
          >
            <Link href={contactFormPath}>
              {copy.bookSession}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {copy.whyTitle} <span className="gradient-text-cyan">{copy.whyAccent}</span>{copy.whySuffix ? ` ${copy.whySuffix}` : ""}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {copy.whyDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {copy.features.map(([title, desc], i) => {
                const icons = [Target, Dumbbell, Clock, Users, Shield, Zap];
                const accents = ["#5EEBFF", "#B06CFF", "#FFB199", "#5EEBFF", "#B06CFF", "#FFB199"];
                const Icon = icons[i];
                return (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-2xl border border-white/5 bg-[#121826] p-6 hover:border-white/10 transition-all"
              >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${accents[i]}15` }}>
                   <Icon className="h-5 w-5" style={{ color: accents[i] }} />
                </div>
                 <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h3>
                 <p className="text-gray-400 text-sm">{desc}</p>
              </motion.div>
                );
              })}
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
                alt={locale === "es" ? "Sesión de entrenamiento" : "Training session"}
                className="relative rounded-2xl w-full aspect-[4/3] object-cover border border-white/10"
              />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                {copy.includedTitle.includes("¿") ? copy.includedTitle : <>WHAT'S <span className="gradient-text-purple">INCLUDED</span></>}
              </h2>
              <ul className="space-y-4 mb-8">
                {copy.included.map((item) => (
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
                <Link href={bookPath}>
                  {copy.signUp}
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
            {copy.freeTitle} <span className="gradient-text-warm">{copy.freeAccent}</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10">
            {copy.freeDescription}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
          >
            <Link href={bookPath}>
              {copy.freeTrial}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-gray-500 text-sm mt-6">{copy.noCard}</p>
        </div>
      </Section>
    </div>
  );
}
