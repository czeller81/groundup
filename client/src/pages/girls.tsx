import { Link } from "wouter";
import { ArrowRight, CheckCircle, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import { localizedPublicPath, useLocale } from "@/lib/locale";

export default function Girls() {
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    title: "Desarrollen fuerza, habilidad y confianza", accent: "juntas.",
    eyebrow: "Niñas / Madre + hija · Oxnard",
    description: "Ground Up es un centro de entrenamiento solo para mujeres. Cuando hay programación juvenil disponible, es para niñas y jóvenes femeninas, no un programa infantil mixto genérico.",
    book: "Reserva una primera visita gratis", eligibility: "Pregunta sobre elegibilidad",
    cards: [
      ["Niñas / jóvenes femeninas", "Un camino claro y centrado en mujeres jóvenes cuando el programa juvenil está abierto."],
      ["Madre + hija", "Pregunta cómo funciona la participación, incluyendo la colocación en clases y los requisitos de tutoría."],
      ["Para principiantes", "No se necesita experiencia previa en artes marciales para comenzar una conversación sobre opciones."],
    ],
    notice: "La elegibilidad y el rango de edad se confirman antes de reservar para que las familias reciban información precisa. Si reservas para una menor, contáctanos; puede requerirse un proceso para tutores y consentimiento.",
    seoTitle: "Entrenamiento de Niñas y Madre-Hija | Ground Up Oxnard",
    seoDescription: "Conoce el camino de entrenamiento para niñas y jóvenes femeninas de Ground Up en Oxnard. Pregunta por elegibilidad, clases para principiantes y opciones madre-hija.",
  } : {
    title: "Build strength, skill, and confidence", accent: "together.",
    eyebrow: "Girls / Mother + Daughter · Oxnard",
    description: "Ground Up is a women-only training center. When youth programming is available, it is for girls and female youth—not a generic mixed-gender kids program.",
    book: "Book a free first visit", eligibility: "Ask about eligibility",
    cards: [
      ["Girls / female youth", "A clear, women-centered path for young athletes when the youth program is open."],
      ["Mother + daughter", "Ask how participation works, including class placement and guardian requirements."],
      ["Beginner-friendly", "No prior martial arts experience is required to start a conversation about fit."],
    ],
    notice: "Youth eligibility and age range are confirmed before booking so families receive accurate guidance. Please contact Ground Up if you are booking for a minor; a guardian pathway and consent may be required.",
    seoTitle: "Girls & Mother-Daughter Training | Ground Up Oxnard",
    seoDescription: "Explore Ground Up's girls and female-youth training path in Oxnard. Ask about current eligibility, beginner-friendly classes, and mother-daughter options.",
  };
  const bookPath = localizedPublicPath("/book", locale);
  const contactPath = localizedPublicPath("/contact", locale);
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/girls", locale)}
      />
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">{copy.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-black uppercase leading-[0.92] tracking-tight sm:text-5xl md:text-7xl">
            {copy.title} <span className="text-[#5EEBFF]">{copy.accent}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-gray-300">
            {copy.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-[#FFB199] font-bold uppercase tracking-wider text-[#0B0F14] hover:bg-[#FFB199]/90">
              <Link href={bookPath}>{copy.book} <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-white hover:bg-white/5">
              <Link href={contactPath}>{copy.eligibility}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {copy.cards.map(([title, text], index) => {
              const icons = [Shield, Users, CheckCircle];
              const Icon = icons[index];
              return (
            <article key={title} className="rounded-2xl border border-white/10 bg-[#121826] p-6">
              <Icon className="h-6 w-6 text-[#5EEBFF]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{text}</p>
            </article>
              );
            })}
        </div>
        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-[#B06CFF]/20 bg-[#B06CFF]/5 p-6 text-sm leading-relaxed text-gray-300">
          {copy.notice}
        </div>
      </section>
    </main>
  );
}