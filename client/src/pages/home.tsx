import { Link } from "wouter";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/seo";
import { motion, useInView } from "framer-motion";
import {
  Shield, Users, Award, ChevronDown, ChevronUp,
  Star, ArrowRight, Zap, Heart, CheckCircle, CalendarDays, Clock
} from "lucide-react";
import { CATEGORY_CONFIG, getClassesForDay, getCurrentDay } from "@/lib/schedule-data";
import { localizedPublicPath, useLocale } from "@/lib/locale";
import selfDefenseFeaturedImg from "@assets/womens-sparring-1.jpg";
import bjjFundamentalsImg from "@assets/womens-sparring-2.jpg";
import girlsClassImg from "@assets/IMG_5702_1788402569391.jpg";
import strengthImg from "@assets/IMG_5701_1788402339390.jpg";
import personalTrainingImg from "@assets/IMG_5699_1788402474136.png";
import whyDifferentImg from "@assets/womens-team-1.jpg";
import coachImg from "@assets/raymi-coach.jpg";
import facilityFloorImg from "@assets/facility-floor.jpg";
import facilityStrengthImg from "@assets/facility-strength.jpg";
import facilityMatImg from "@assets/facility-mat.jpg";
import facilityLoungeImg from "@assets/facility-lounge.jpg";
import facilityCafeImg from "@assets/facility-cafe.jpg";
import facilityTeaImg from "@assets/facility-tea.jpg";
const facilityFrame1 = "/images/facility/frame_01.jpg";
const facilityFrame4 = "/images/facility/frame_04.jpg";
const facilityFrame5 = "/images/facility/frame_05.jpg";
const facilityFrame7 = "/images/facility/frame_07.jpg";
const heroVideo = "/videos/hero-bg.mp4";

const HOME_COPY: Record<string, string> = {
  "Women-Only BJJ & Self-Defense in Oxnard | Ground Up": "Jiu-Jitsu y Defensa Personal Solo para Mujeres en Oxnard | Ground Up",
  "Ground Up is a women-only training center in Oxnard for Brazilian Jiu-Jitsu, practical self-defense, strength, and movement. Beginner-friendly small-group coaching. Book your free first visit.": "Ground Up es un centro de entrenamiento solo para mujeres en Oxnard para jiu-jitsu brasileño, defensa personal práctica, fuerza y movimiento. Coaching en grupos pequeños para principiantes. Reserva tu primera visita gratis.",
  "WOMEN ONLY · OXNARD, CA": "SOLO PARA MUJERES · OXNARD, CA",
  CONFIDENCE: "CONFIANZA",
  BUILT: "CONSTRUIDA",
  "HERE.": "AQUÍ.",
  "discover what your body can do": "descubre de lo que es capaz tu cuerpo",
  "Ground Up is a women-only training space where you can build strength, learn Brazilian Jiu-Jitsu and practical self-defense, and move with more confidence. Beginner-friendly. No experience required. No fight-gym atmosphere.": "Ground Up es un espacio de entrenamiento solo para mujeres donde puedes desarrollar fuerza, aprender jiu-jitsu brasileño y defensa personal práctica, y moverte con más confianza. Para principiantes. No necesitas experiencia. Sin ambiente de gimnasio de pelea.",
  "Book Your Free First Visit": "Reserva tu primera visita gratis",
  "Explore Programs": "Conoce los programas",
  "Personalized Attention": "Atención personalizada",
  "Coaching tailored to you": "Coaching adaptado a ti",
  "Safe & Welcoming": "Seguro y acogedor",
  "Judgment-free environment": "Ambiente sin juicios",
  "Women-Centered": "Centrado en mujeres",
  "A space built around women": "Un espacio creado para mujeres",
  "Beginner Friendly": "Para principiantes",
  "No experience needed": "No necesitas experiencia",
  "No Experience Needed": "No necesitas experiencia",
  "WHAT TO": "LO QUE PUEDES",
  EXPECT: "ESPERAR",
  "We know walking into a martial arts gym for the first time can feel intimidating. Here's exactly what your first visit looks like — simple, welcoming, and at your pace.": "Sabemos que entrar por primera vez a un gimnasio de artes marciales puede intimidar. Así es exactamente tu primera visita: sencilla, acogedora y a tu ritmo.",
  "Arrive 15 Min Early": "Llega 15 minutos antes",
  "Show up a little before class. We'll give you a quick tour, answer your questions, and make sure you feel at home before anything starts.": "Llega un poco antes de la clase. Te mostraremos el espacio, responderemos tus preguntas y nos aseguraremos de que te sientas cómoda antes de comenzar.",
  "Meet Coach Raymi": "Conoce a Coach Raymi",
  "Your instructor will introduce herself, learn about your goals, and let you know what to expect. No jargon, no pressure — just a real conversation.": "Tu instructora se presentará, conocerá tus objetivos y te explicará qué esperar. Sin palabras complicadas ni presión: solo una conversación real.",
  "Learn the Fundamentals": "Aprende los fundamentos",
  "Every class starts with foundational movements. No sparring in your first session — just safe, structured technique at your own pace.": "Cada clase comienza con movimientos fundamentales. No hay sparring en tu primera sesión: solo técnica segura y estructurada a tu ritmo.",
  "Leave Feeling Capable": "Sal sintiéndote capaz",
  "Most new students leave surprised by how much they learned — and how comfortable they felt. You'll leave with a skill, not just a workout.": "La mayoría de las alumnas nuevas se sorprenden de cuánto aprendieron y de lo cómodas que se sintieron. Te irás con una habilidad, no solo con un entrenamiento.",
  "Wear comfortable athletic clothing": "Usa ropa deportiva cómoda",
  "No gear required for your first class": "No necesitas equipo para tu primera clase",
  "Bring water and an open mind": "Trae agua y una mente abierta",
  "Book Your First Class — Free": "Reserva tu primera clase — gratis",
  "Our Mission": "Nuestra misión",
  "BUILD THE CAPACITY TO": "DESARROLLA LA CAPACIDAD DE",
  ADAPT: "ADAPTARTE",
  "Ground Up is a human resilience and capability platform. Our physical training foundation and our emerging Adaptive Capacity work share one belief: you can build the capacity to respond to change with more clarity, confidence, and agency. Start with the path that fits you.": "Ground Up es una plataforma de resiliencia y capacidad humana. Nuestro entrenamiento físico y el proyecto Capacidad Adaptativa comparten una creencia: puedes desarrollar la capacidad de responder al cambio con más claridad, confianza y autonomía. Comienza con el camino que se adapte a ti.",
  "Find Your Path": "Encuentra tu camino",
  "TRAINING BUILT": "ENTRENAMIENTO CREADO",
  "AROUND YOU": "A TU MEDIDA",
  "Train your body, strengthen your confidence, or build practical capacity for a changing world. Related paths, clearly separated, all grounded in action.": "Entrena tu cuerpo, fortalece tu confianza o desarrolla capacidad práctica para un mundo cambiante. Caminos relacionados, claramente separados y siempre basados en la acción.",
  "Flagship Program": "Programa principal",
  "WOMEN'S SELF-DEFENSE": "DEFENSA PERSONAL PARA MUJERES",
  "Our signature 8-week self-defense program helps women build practical skills, situational awareness, confidence, and strength in a supportive environment.": "Nuestro programa insignia de defensa personal de 8 semanas ayuda a las mujeres a desarrollar habilidades prácticas, conciencia situacional, confianza y fuerza en un ambiente comprensivo.",
  "8-week program": "Programa de 8 semanas",
  "2 classes per week": "2 clases por semana",
  "16 total classes": "16 clases en total",
  "Beginner friendly": "Para principiantes",
  "Explore the Program": "Conoce el programa",
  "Women's BJJ Fundamentals": "Fundamentos de BJJ para mujeres",
  "Learn Brazilian Jiu-Jitsu fundamentals in a focused setting built around technique, movement, confidence, and controlled training.": "Aprende los fundamentos del jiu-jitsu brasileño en un espacio enfocado en técnica, movimiento, confianza y entrenamiento controlado.",
  "Personalized coaching": "Coaching personalizado",
  "Technique-focused": "Enfoque en técnica",
  "Safe environment": "Ambiente seguro",
  "Girls Jiu-Jitsu & Conditioning": "Jiu-jitsu y acondicionamiento para niñas",
  "A girls-focused program combining Brazilian Jiu-Jitsu fundamentals, movement, strength, and confidence-building in a supportive environment.": "Un programa para niñas que combina fundamentos de jiu-jitsu brasileño, movimiento, fuerza y desarrollo de confianza en un ambiente comprensivo.",
  "Girls-focused training": "Entrenamiento para niñas",
  "Jiu-Jitsu fundamentals": "Fundamentos de jiu-jitsu",
  "Strength & conditioning": "Fuerza y acondicionamiento",
  "Confidence-building": "Desarrollo de confianza",
  "Strength & Conditioning": "Fuerza y acondicionamiento",
  "Focused fitness sessions built around mobility, strength, injury prevention, and athletic conditioning.": "Sesiones de fitness enfocadas en movilidad, fuerza, prevención de lesiones y acondicionamiento atlético.",
  "Functional strength": "Fuerza funcional",
  "Injury prevention": "Prevención de lesiones",
  "Athletic conditioning": "Acondicionamiento atlético",
  "Personal Training": "Entrenamiento personal",
  "One-on-one coaching tailored to your fitness, self-defense, or performance goals at your own pace.": "Coaching individualizado para tus objetivos de fitness, defensa personal o rendimiento, a tu propio ritmo.",
  "1-on-1 sessions": "Sesiones individuales",
  "Custom goals": "Objetivos personalizados",
  "Flexible schedule": "Horario flexible",
  "All levels welcome": "Todos los niveles",
  "Adaptive Capacity": "Capacidad Adaptativa",
  "A separate learning path for clearer thinking, better decisions, and practical adaptability as work and life change.": "Un camino de aprendizaje separado para pensar con más claridad, tomar mejores decisiones y adaptarte mientras cambian el trabajo y la vida.",
  "Practical learning": "Aprendizaje práctico",
  "Decision tools": "Herramientas de decisión",
  Reflection: "Reflexión",
  "Interest list now open": "Lista de interés abierta",
  "Today's Classes": "Clases de hoy",
  "Upcoming Classes": "Próximas clases",
  "FIND A CLASS": "ENCUENTRA UNA CLASE",
  "THAT FITS YOU": "PARA TI",
  "Max 6 students per class — structured for beginners. Every session is coached, not just supervised.": "Máximo 6 alumnas por clase, con estructura para principiantes. Cada sesión tiene coaching, no solo supervisión.",
  "No experience required": "No necesitas experiencia",
  "First class free": "Primera clase gratis",
  "Full Schedule": "Horario completo",
  "See all classes for the full week →": "Ver todas las clases de la semana →",
  "WHY GROUND UP": "POR QUÉ GROUND UP",
  "IS DIFFERENT": "ES DIFERENTE",
  "We intentionally stay small — because personal attention, real coaching, and a safe environment require it. Ground Up is not a volume gym. It's a boutique studio where every student is known by name, every session is coached (not just supervised), and no one gets lost in the crowd.": "Elegimos mantenernos pequeños porque la atención personal, el coaching real y un ambiente seguro lo requieren. Ground Up no es un gimnasio masivo. Es un estudio boutique donde conocemos a cada alumna por su nombre, cada sesión tiene coaching y nadie se pierde entre la multitud.",
  "Personalized Coaching": "Coaching personalizado",
  "Programs and sessions are tailored to your goals, fitness level, and pace.": "Los programas y sesiones se adaptan a tus objetivos, nivel y ritmo.",
  "A judgment-free space where you can learn, grow, and feel completely at ease.": "Un espacio sin juicios donde puedes aprender, crecer y sentirte completamente cómoda.",
  "Women-Only by Design": "Solo para mujeres por diseño",
  "Our programs are built around capability, coaching, and a supportive small-group environment.": "Nuestros programas se construyen alrededor de la capacidad, el coaching y un ambiente comprensivo de grupos pequeños.",
  "Every student gets direct coaching attention — no one gets lost in the crowd.": "Cada alumna recibe atención directa de coaching: nadie se pierde entre la multitud.",
  "Practical self-defense in a women-only space for women in Oxnard.": "Defensa personal práctica en un espacio solo para mujeres en Oxnard.",
  "MEET YOUR": "CONOCE A TU",
  COACH: "COACH",
  "Purple Belt · 3rd Degree": "Cinturón morado · Tercer grado",
  "Promoted under the Gracie Barra lineage · Trained in Ventura County, CA · 5+ Years Coaching": "Promovida bajo el linaje Gracie Barra · Entrenada en Ventura County, CA · Más de 5 años de coaching",
  "Raymi founded Ground Up Jiu-Jitsu with one goal: to build a safe, empowering home for women and beginners. With deep expertise in BJJ, self-defense, strength & conditioning, and movement, she brings personal attention and real-world skill to every session.": "Raymi fundó Ground Up Jiu-Jitsu con un objetivo: crear un hogar seguro y empoderador para mujeres y principiantes. Con experiencia profunda en BJJ, defensa personal, fuerza, acondicionamiento y movimiento, aporta atención personal y habilidades reales a cada sesión.",
  "Women's Self-Defense": "Defensa personal para mujeres",
  "Women's BJJ": "BJJ para mujeres",
  "Strength & Movement": "Fuerza y movimiento",
  "Learn More": "Conoce más",
  "Inside the Gym": "Dentro del gimnasio",
  "REAL TRAINING.": "ENTRENAMIENTO REAL.",
  "REAL PEOPLE.": "PERSONAS REALES.",
  "Every class is filmed from actual sessions at our Oxnard facility — no stock photos, no actors.": "Cada clase se muestra con sesiones reales en nuestro espacio de Oxnard: sin fotos de stock ni actores.",
  "Women's class — stance & movement drills": "Clase para mujeres — ejercicios de postura y movimiento",
  "Students leave smiling — every class": "Las alumnas salen sonriendo — en cada clase",
  "Partner drilling in a supportive environment": "Práctica con compañera en un ambiente comprensivo",
  "Ground technique — breakfalls & positioning": "Técnica en el suelo — caídas y posiciones",
  "All photos are from live training sessions at our Oxnard, CA facility.": "Todas las fotos son de sesiones reales en nuestro espacio de Oxnard, CA.",
  "Step Inside": "Entra",
  "A SPACE BUILT": "UN ESPACIO CREADO",
  "FOR YOU": "PARA TI",
  "Clean, calm, and fully equipped — from spacious mats to a recovery sauna and a cozy lounge with complimentary tea & coffee.": "Limpio, tranquilo y totalmente equipado: desde tatamis amplios hasta un sauna de recuperación y un salón acogedor con té y café de cortesía.",
  "Open, airy training floor": "Piso de entrenamiento abierto y luminoso",
  "Strength & conditioning equipment": "Equipo de fuerza y acondicionamiento",
  "Spacious matted rolling area": "Amplia zona de tatamis",
  "Relax in our member lounge": "Relájate en nuestro salón de miembros",
  "Community tables & games": "Mesas y juegos para la comunidad",
  "Complimentary tea & coffee bar": "Barra de té y café de cortesía",
  "Student Experiences": "Experiencias de alumnas",
  "WHAT OUR": "LO QUE DICE",
  "COMMUNITY": "NUESTRA COMUNIDAD",
  "FREQUENTLY ASKED": "PREGUNTAS",
  QUESTIONS: "FRECUENTES",
  "Do I need experience to join?": "¿Necesito experiencia para unirme?",
  "No. Our programs are beginner friendly and designed to help you build confidence from day one. You'll start at your own pace with personalized coaching every step of the way.": "No. Nuestros programas son para principiantes y están diseñados para ayudarte a desarrollar confianza desde el primer día. Comenzarás a tu ritmo con coaching personalizado en cada paso.",
  "Will I get personalized attention?": "¿Recibiré atención personalizada?",
  "Absolutely. We keep our classes intentionally intimate so every student gets personal coaching, better technique correction, and a more comfortable learning environment.": "Por supuesto. Mantenemos las clases pequeñas para que cada alumna reciba coaching personal, mejores correcciones técnicas y un ambiente de aprendizaje más cómodo.",
  "Is this good for women who only want self-defense?": "¿Es adecuado si solo quiero defensa personal?",
  "Yes. Our women's self-defense program is designed specifically for practical real-world confidence and protection — no competitive training or sparring required.": "Sí. Nuestro programa está diseñado para confianza y protección prácticas en la vida real; no requiere entrenamiento competitivo ni sparring.",
  "Do you offer girls or mother-daughter training?": "¿Ofrecen entrenamiento para niñas o madre-hija?",
  "When youth programming is available, it is for girls and female youth. We confirm eligibility, age range, guardian requirements, and mother-daughter options before booking so families receive accurate information.": "Cuando hay programación juvenil, es para niñas y jóvenes femeninas. Confirmamos elegibilidad, rango de edad, requisitos de tutoría y opciones madre-hija antes de reservar.",
  "What is the free community self-defense class?": "¿Qué es la clase comunitaria gratis de defensa personal?",
  "Every two weeks we host a free, open self-defense class for the community. It's a great way to try training with no commitment, meet other students, and build local safety awareness.": "Cada dos semanas ofrecemos una clase gratis y abierta de defensa personal para la comunidad. Es una buena forma de probar sin compromiso, conocer a otras alumnas y fortalecer la seguridad local.",
  "How do I book a session?": "¿Cómo reservo una sesión?",
  "Create a free member account, complete your intake forms, and book directly through our member portal. Sessions are available 8am–5pm, Monday through Saturday.": "Crea una cuenta gratis, completa tus formularios de ingreso y reserva directamente desde el portal de miembros. Hay sesiones de 8 a. m. a 5 p. m., de lunes a sábado.",
  "YOUR FIRST CLASS": "TU PRIMERA CLASE",
  "IS ALWAYS FREE": "SIEMPRE ES GRATIS",
  "No gear. No commitment. No pressure. Just come in, meet Coach Raymi, and experience what a truly supportive training environment feels like. We'll help you find the right fit.": "Sin equipo. Sin compromiso. Sin presión. Ven, conoce a Coach Raymi y descubre cómo se siente un ambiente de entrenamiento verdaderamente comprensivo. Te ayudaremos a encontrar el programa adecuado.",
  "Ask Us Anything": "Pregúntanos lo que quieras",
  "Small classes": "Clases pequeñas",
  "No contracts": "Sin contratos",
  "Advanced Jiu-Jitsu — Drills & Submissions": "Jiu-jitsu avanzado — ejercicios y sumisiones",
  "Jiu-Jitsu — Beginner": "Jiu-jitsu — principiantes",
  "Kids Jiu-Jitsu": "Jiu-jitsu para niñas",
  "Jiu-Jitsu — Transitions & Technique": "Jiu-jitsu — transiciones y técnica",
  "Athletes Strength & Conditioning": "Fuerza y acondicionamiento para atletas",
  "Stretch & Recovery": "Estiramiento y recuperación",
  "Jiu-Jitsu — Ecological Approach": "Jiu-jitsu — enfoque ecológico",
  "Open Mat": "Tatami abierto",
};

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
  const panelId = useId();
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white">{question}</span>
        {open ? <ChevronUp className="h-5 w-5 text-[#5EEBFF] flex-shrink-0" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />}
      </button>
      <motion.div
        id={panelId}
        role="region"
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
  const { locale } = useLocale();
  const t = (value: string) => locale === "es" ? (HOME_COPY[value] || value) : value;
  const path = (value: string) => localizedPublicPath(value, locale);
  const contactFormPath = path("/contact#contact-form");
  const todayDay = getCurrentDay();
  const todayRawClasses = getClassesForDay(todayDay);
  const displayDay = todayRawClasses.length > 0 ? todayDay : "Monday";
  const displayClasses = todayRawClasses.length > 0 ? todayRawClasses : getClassesForDay("Monday");

  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title={t("Women-Only BJJ & Self-Defense in Oxnard | Ground Up")}
        description={t("Ground Up is a women-only training center in Oxnard for Brazilian Jiu-Jitsu, practical self-defense, strength, and movement. Beginner-friendly small-group coaching. Book your free first visit.")}
        canonical={path("/")}
      />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden grain-texture" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#121826] to-[#0B0F14]" />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/50 to-[#0B0F14]/60" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-gray-300 text-xs font-semibold uppercase tracking-widest mb-6"
            >
              {t("WOMEN ONLY · OXNARD, CA")}
            </motion.div>

            <h1 className="text-[clamp(2.75rem,13vw,4.5rem)] md:text-7xl lg:text-8xl font-bold leading-[0.9] mb-6 tracking-tight break-words" style={{ fontFamily: 'var(--font-display)' }}>
               <span className="text-white">{t("CONFIDENCE")}</span>
              <br />
               <span className="gradient-text-cyan">{t("BUILT")}</span>
              <br />
               <span className="gradient-text-purple">{t("HERE.")}</span>
              <br />
                <span className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">{t("discover what your body can do")}</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg md:text-xl text-gray-300 max-w-xl mb-10 leading-relaxed"
            >
               {t("Ground Up is a women-only training space where you can build strength, learn Brazilian Jiu-Jitsu and practical self-defense, and move with more confidence. Beginner-friendly. No experience required. No fight-gym atmosphere.")}
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
                <Link href={contactFormPath}>
                   {t("Book Your Free First Visit")}
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
                <Link href={path("/pricing")}>{t("Explore Programs")}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5EEBFF]/30 to-transparent" />
      </section>

      {/* TRUST STRIP */}
      <Section className="py-20 bg-[#0B0F14] relative" delay={0}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
               { icon: Users, label: t("Personalized Attention"), desc: t("Coaching tailored to you") },
               { icon: Shield, label: t("Safe & Welcoming"), desc: t("Judgment-free environment") },
                    { icon: Heart, label: t("Women-Centered"), desc: t("A space built around women") },
               { icon: Award, label: t("Beginner Friendly"), desc: t("No experience needed") },
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

      {/* HOW IT WORKS */}
      <Section className="py-24 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-sm mb-4">
              {t("No Experience Needed")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {t("WHAT TO")} <span className="gradient-text-warm">{t("EXPECT")}</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t("We know walking into a martial arts gym for the first time can feel intimidating. Here's exactly what your first visit looks like — simple, welcoming, and at your pace.")}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {[
              {
                step: "01",
                icon: Clock,
                title: t("Arrive 15 Min Early"),
                desc: t("Show up a little before class. We'll give you a quick tour, answer your questions, and make sure you feel at home before anything starts."),
                accent: "#5EEBFF",
              },
              {
                step: "02",
                icon: Heart,
                title: t("Meet Coach Raymi"),
                desc: t("Your instructor will introduce herself, learn about your goals, and let you know what to expect. No jargon, no pressure — just a real conversation."),
                accent: "#FFB199",
              },
              {
                step: "03",
                icon: Shield,
                title: t("Learn the Fundamentals"),
                desc: t("Every class starts with foundational movements. No sparring in your first session — just safe, structured technique at your own pace."),
                accent: "#B06CFF",
              },
              {
                step: "04",
                icon: Award,
                title: t("Leave Feeling Capable"),
                desc: t("Most new students leave surprised by how much they learned — and how comfortable they felt. You'll leave with a skill, not just a workout."),
                accent: "#5EEBFF",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative flex flex-col items-center text-center p-7 rounded-2xl border border-white/5 bg-[#0B0F14] hover:border-white/10 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xs font-bold tracking-widest"
                  style={{ backgroundColor: `${item.accent}20`, color: item.accent }}
                >
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${item.accent}15` }}>
                  <item.icon className="h-5 w-5" style={{ color: item.accent }} />
                </div>
                <h3 className="text-white font-bold text-base mb-2" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-400 mb-6">
              {["Wear comfortable athletic clothing", "No gear required for your first class", "Bring water and an open mind"].map((tip) => (
                <span key={tip} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" />
                  {t(tip)}
                </span>
              ))}
            </div>
            <div className="block">
              <Button asChild size="lg" className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-13 px-10">
                <Link href={contactFormPath}>
                  {t("Book Your First Class — Free")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* MISSION */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-sm mb-6">
             {t("Our Mission")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
             {t("BUILD THE CAPACITY TO")} <span className="gradient-text-cyan">{t("ADAPT")}{locale === "en" ? "." : ""}</span>
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-3xl mx-auto">
             {t("Ground Up is a human resilience and capability platform. Our physical training foundation and our emerging Adaptive Capacity work share one belief: you can build the capacity to respond to change with more clarity, confidence, and agency. Start with the path that fits you.")}
          </p>
        </div>
      </Section>

      {/* PROGRAMS */}
      <Section className="py-24 bg-[#0B0F14] relative belt-stripe" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-4">
               {t("Find Your Path")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
               {t("TRAINING BUILT")} <span className="gradient-text-cyan">{t("AROUND YOU")}</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
               {t("Train your body, strengthen your confidence, or build practical capacity for a changing world. Related paths, clearly separated, all grounded in action.")}
            </p>
          </div>

          {/* Featured program */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative rounded-2xl overflow-hidden border border-[#FFB199]/20 bg-gradient-to-r from-[#FFB199]/5 to-transparent mb-8 hover:border-[#FFB199]/40 transition-all"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFB199]/10 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4 w-fit">
                   {t("Flagship Program")}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                   {t("WOMEN'S SELF-DEFENSE")}
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                   {t("Our signature 8-week self-defense program helps women build practical skills, situational awareness, confidence, and strength in a supportive environment.")}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {["8-week program", "2 classes per week", "16 total classes", "Beginner friendly"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-[#FFB199] flex-shrink-0" />
                       {t(item)}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 w-fit">
                     <Link href={contactFormPath}>
                        {t("Book Your Free First Visit")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-[#FFB199]/30 text-[#FFB199] hover:bg-[#FFB199]/10 uppercase tracking-wider w-fit bg-transparent">
                     <Link href={path("/womens-self-defense")}>
                       {t("Explore the Program")}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                <img
                  src={selfDefenseFeaturedImg}
                  alt="Women's Self-Defense Program"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </motion.div>

           <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                title: t("Women's BJJ Fundamentals"),
                desc: t("Learn Brazilian Jiu-Jitsu fundamentals in a focused setting built around technique, movement, confidence, and controlled training."),
                highlights: [t("Beginner friendly"), t("Personalized coaching"), t("Technique-focused"), t("Safe environment")],
                img: bjjFundamentalsImg,
                accent: "#5EEBFF",
                link: "/womens-self-defense",
              },
              {
                  title: t("Girls Jiu-Jitsu & Conditioning"),
                  desc: t("A girls-focused program combining Brazilian Jiu-Jitsu fundamentals, movement, strength, and confidence-building in a supportive environment."),
                  highlights: [t("Girls-focused training"), t("Jiu-Jitsu fundamentals"), t("Strength & conditioning"), t("Confidence-building")],
                  img: girlsClassImg,
                accent: "#B06CFF",
                 link: "/girls",
              },
              {
                title: t("Strength & Conditioning"),
                desc: t("Focused fitness sessions built around mobility, strength, injury prevention, and athletic conditioning."),
                highlights: [t("Personalized coaching"), t("Functional strength"), t("Injury prevention"), t("Athletic conditioning")],
                img: strengthImg,
                 imageFit: "cover",
                accent: "#5EEBFF",
              },
              {
                title: t("Personal Training"),
                desc: t("One-on-one coaching tailored to your fitness, self-defense, or performance goals at your own pace."),
                highlights: [t("1-on-1 sessions"), t("Custom goals"), t("Flexible schedule"), t("All levels welcome")],
                img: personalTrainingImg,
                accent: "#FFB199",
              },
              {
                title: t("Adaptive Capacity"),
                desc: t("A separate learning path for clearer thinking, better decisions, and practical adaptability as work and life change."),
                highlights: [t("Practical learning"), t("Decision tools"), t("Reflection"), t("Interest list now open")],
                img: facilityLoungeImg,
                accent: "#5EEBFF",
                link: "/adaptive-capacity",
              },
            ].map((program, i) => (
              <motion.div
                key={program.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative rounded-2xl overflow-hidden border border-white/5 bg-[#121826] hover:border-white/15 transition-all flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={program.img}
                    alt={program.title}
                    className={`w-full h-full ${program.imageFit === "contain" ? "object-contain bg-[#0B0F14]" : "object-cover"} group-hover:scale-105 transition-transform duration-500`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-[#121826]/30 to-transparent" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: program.accent }} />
                  <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>{program.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{program.desc}</p>
                  <ul className="space-y-1.5">
                    {program.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: program.accent }} />
                        {h}
                      </li>
                    ))}
                  </ul>
                  {program.link && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                       <Link href={path(program.link)} className="text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-opacity flex items-center gap-1" style={{ color: program.accent }}>
                         {t("Learn More")} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* SCHEDULE PREVIEW */}
      <Section className="py-20 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/5 text-[#5EEBFF] text-xs font-semibold uppercase tracking-widest mb-4">
                <CalendarDays className="h-3.5 w-3.5" />
                  {displayDay === todayDay ? t("Today's Classes") : t("Upcoming Classes")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                 {t("FIND A CLASS")} <span className="gradient-text-cyan">{t("THAT FITS YOU")}</span>
              </h2>
               <p className="text-gray-400 text-sm mt-2 max-w-md">{t("Max 6 students per class — structured for beginners. Every session is coached, not just supervised.")}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFB199]/10 text-[#FFB199] border border-[#FFB199]/20">
                   <CheckCircle className="h-3.5 w-3.5" /> {t("No experience required")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#5EEBFF]/10 text-[#5EEBFF] border border-[#5EEBFF]/20">
                   <CheckCircle className="h-3.5 w-3.5" /> {t("Beginner friendly")}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B06CFF]/10 text-[#B06CFF] border border-[#B06CFF]/20">
                   <CheckCircle className="h-3.5 w-3.5" /> {t("First class free")}
                </span>
              </div>
            </div>
            <Button asChild className="bg-transparent border border-[#5EEBFF]/40 text-[#5EEBFF] hover:bg-[#5EEBFF]/10 uppercase tracking-wider font-semibold flex-shrink-0">
                 <Link href={path("/schedule")}>
                 {t("Full Schedule")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayClasses.slice(0, 6).map((entry, i) => {
              const cfg = CATEGORY_CONFIG[entry.category];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  className={`rounded-xl border ${cfg.border} bg-[#0B0F14]/80 p-4 flex items-center gap-3 hover:brightness-110 transition-all`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm leading-snug">{t(entry.title)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className={`h-3 w-3 flex-shrink-0 ${cfg.color}`} />
                      <p className={`text-xs font-medium ${cfg.color}`}>{entry.startTime}{entry.endTime ? ` – ${entry.endTime}` : ""}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
             <Link href={path("/schedule")}>
              <span className="text-[#5EEBFF] text-sm font-medium hover:underline cursor-pointer">
                 {t("See all classes for the full week →")}
              </span>
            </Link>
          </div>
        </div>
      </Section>

      {/* WHY US */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                {t("WHY GROUND UP")} <span className="gradient-text-cyan">{t("IS DIFFERENT")}</span>
              </h2>
              <p className="text-gray-300 leading-relaxed mb-10">
                 {t("We intentionally stay small — because personal attention, real coaching, and a safe environment require it. Ground Up is not a volume gym. It's a boutique studio where every student is known by name, every session is coached (not just supervised), and no one gets lost in the crowd.")}
              </p>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                   { icon: Users, title: t("Personalized Attention"), desc: t("Every student gets direct coaching attention — no one gets lost in the crowd."), accent: "#5EEBFF" },
                   { icon: Award, title: t("Personalized Coaching"), desc: t("Programs and sessions are tailored to your goals, fitness level, and pace."), accent: "#B06CFF" },
                   { icon: Heart, title: t("Safe & Welcoming"), desc: t("A judgment-free space where you can learn, grow, and feel completely at ease."), accent: "#FFB199" },
                    { icon: Shield, title: t("Women-Only by Design"), desc: t("Our programs are built around capability, coaching, and a supportive small-group environment."), accent: "#5EEBFF" },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${item.accent}15` }}>
                      <item.icon className="h-5 w-5" style={{ color: item.accent }} />
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#5EEBFF]/10 to-[#B06CFF]/10 rounded-2xl blur-xl" />
              <img
                src={whyDifferentImg}
                alt="Training environment"
                className="relative rounded-2xl w-full aspect-[4/5] object-cover border border-white/10"
              />
              <div className="absolute -bottom-5 left-4 right-4 p-4 rounded-xl border border-[#FFB199]/20 bg-[#FFB199]/10 backdrop-blur-sm flex items-center gap-3">
                <Zap className="h-5 w-5 text-[#FFB199] flex-shrink-0" />
                 <span className="text-[#FFB199] text-sm font-semibold leading-snug">{t("Practical self-defense in a women-only space for women in Oxnard.")}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>


      {/* COACH */}
      <Section className="py-24 bg-[#121826] relative grain-texture" delay={0}>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                {t("MEET YOUR")} <span className="gradient-text-purple">{t("COACH")}</span>
              </h2>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>RAYMI GONZALEZ</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30">
                     {t("Purple Belt · 3rd Degree")}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                   {t("Promoted under the Gracie Barra lineage · Trained in Ventura County, CA · 5+ Years Coaching")}
                </p>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                  {t("Raymi founded Ground Up Jiu-Jitsu with one goal: to build a safe, empowering home for women and beginners. With deep expertise in BJJ, self-defense, strength & conditioning, and movement, she brings personal attention and real-world skill to every session.")}
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                  {["Women's Self-Defense", "Women's BJJ", "Strength & Movement", "Personal Training"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 text-xs rounded-full border border-white/10 text-gray-300 bg-white/5">
                    {t(tag)}
                  </span>
                ))}
              </div>
              <Button
                asChild
                className="bg-[#B06CFF] text-white font-semibold uppercase tracking-wider hover:bg-[#B06CFF]/90"
              >
                 <Link href={path("/coaches")}>
                   {t("Learn More")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#B06CFF]/20 to-[#5EEBFF]/20 rounded-2xl blur-xl" />
              <img
                src={coachImg}
                alt="Raymi Gonzalez"
                className="relative rounded-2xl w-full aspect-[3/4] object-cover border border-white/10"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* FACILITY GALLERY */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
              {t("Inside the Gym")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {t("REAL TRAINING.")} <span className="gradient-text-cyan">{t("REAL PEOPLE.")}</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm">
               {t("Every class is filmed from actual sessions at our Oxnard facility — no stock photos, no actors.")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
               { src: facilityFrame1, caption: t("Women's class — stance & movement drills"), tall: true },
               { src: facilityFrame5, caption: t("Students leave smiling — every class"), tall: false },
               { src: facilityFrame7, caption: t("Partner drilling in a supportive environment"), tall: false },
               { src: facilityFrame4, caption: t("Ground technique — breakfalls & positioning"), tall: true },
            ].map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative overflow-hidden rounded-2xl group ${photo.tall ? "md:row-span-1" : ""}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <p className="text-white text-xs font-medium leading-tight">{photo.caption}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs">
               {t("All photos are from live training sessions at our Oxnard, CA facility.")}
            </p>
          </div>
        </div>
      </Section>

      {/* THE SPACE / AMENITIES */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="absolute top-0 left-0 w-[450px] h-[450px] bg-[#B06CFF]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#B06CFF]/20 bg-[#B06CFF]/5 text-[#B06CFF] text-xs font-semibold uppercase tracking-wider mb-4">
               {t("Step Inside")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {t("A SPACE BUILT")} <span className="gradient-text-purple">{t("FOR YOU")}</span>
            </h2>
            <p className="text-gray-400 mt-3 max-w-lg mx-auto text-sm">
               {t("Clean, calm, and fully equipped — from spacious mats to a recovery sauna and a cozy lounge with complimentary tea & coffee.")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
               { src: facilityFloorImg, caption: t("Open, airy training floor") },
               { src: facilityStrengthImg, caption: t("Strength & conditioning equipment") },
               { src: facilityMatImg, caption: t("Spacious matted rolling area") },
               { src: facilityLoungeImg, caption: t("Relax in our member lounge") },
               { src: facilityCafeImg, caption: t("Community tables & games") },
               { src: facilityTeaImg, caption: t("Complimentary tea & coffee bar") },
            ].map((photo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl group"
              >
                <div className="aspect-[4/5] md:aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-4">
                  <p className="text-white text-sm font-semibold leading-tight">{photo.caption}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-24 bg-[#121826] relative" delay={0}>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFB199]/20 bg-[#FFB199]/5 text-[#FFB199] text-xs font-semibold uppercase tracking-wider mb-4">
               {t("Student Experiences")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
               {t("WHAT OUR")} <span className="gradient-text-warm">{t("COMMUNITY")}</span> {locale === "es" ? "DICE" : "SAYS"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I came in knowing absolutely nothing. The first class we did stance drills and learned how to fall safely — by the end I had real technique. Coach Raymi makes sure you never feel left behind.",
                name: "Maria G.",
                role: "Women's Self-Defense",
                initial: "M",
                color: "#B06CFF",
              },
              {
                quote: "What surprised me most was how much I smiled. I expected it to be intimidating but the class is small, everyone is supportive, and there's something genuinely empowering about learning to use your body this way.",
                name: "Vanessa R.",
                role: "Women's BJJ Fundamentals",
                initial: "V",
                color: "#FFB199",
              },
              {
                quote: "I brought my daughter and ended up staying for the adult class myself. The mat time, the facility, the way Coach Raymi teaches — it doesn't feel like a typical martial arts gym. It feels like a community.",
                name: "Jessica W.",
                role: "BJJ Fundamentals",
                initial: "J",
                color: "#5EEBFF",
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
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}
                  >
                    {t.initial}
                  </div>
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


      {/* FAQ */}
      <Section className="py-24 bg-[#0B0F14] relative" delay={0}>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            {t("FREQUENTLY ASKED")} <span className="gradient-text-cyan">{t("QUESTIONS")}</span>
          </h2>
          <div className="space-y-3">
            <FAQ
              question={t("Do I need experience to join?")}
              answer={t("No. Our programs are beginner friendly and designed to help you build confidence from day one. You'll start at your own pace with personalized coaching every step of the way.")}
            />
            <FAQ
              question={t("Will I get personalized attention?")}
              answer={t("Absolutely. We keep our classes intentionally intimate so every student gets personal coaching, better technique correction, and a more comfortable learning environment.")}
            />
            <FAQ
              question={t("Is this good for women who only want self-defense?")}
              answer={t("Yes. Our women's self-defense program is designed specifically for practical real-world confidence and protection — no competitive training or sparring required.")}
            />
            <FAQ
              question={t("Do you offer girls or mother-daughter training?")}
              answer={t("When youth programming is available, it is for girls and female youth. We confirm eligibility, age range, guardian requirements, and mother-daughter options before booking so families receive accurate information.")}
            />
            <FAQ
              question={t("What is the free community self-defense class?")}
              answer={t("Every two weeks we host a free, open self-defense class for the community. It's a great way to try training with no commitment, meet other students, and build local safety awareness.")}
            />
            <FAQ
              question={t("How do I book a session?")}
              answer={t("Create a free member account, complete your intake forms, and book directly through our member portal. Sessions are available 8am–5pm, Monday through Saturday.")}
            />
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-24 bg-[#121826] relative overflow-hidden grain-texture" delay={0}>
        <div className="absolute inset-0 bg-gradient-to-r from-[#5EEBFF]/5 via-[#B06CFF]/5 to-[#FFB199]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5EEBFF]/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {t("YOUR FIRST CLASS")}
            <br /><span className="gradient-text-warm">{t("IS ALWAYS FREE")}</span>
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
             {t("No gear. No commitment. No pressure. Just come in, meet Coach Raymi, and experience what a truly supportive training environment feels like. We'll help you find the right fit.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 text-base px-10 h-14"
            >
              <Link href={contactFormPath}>
                {t("Book Your Free First Visit")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 uppercase tracking-wider text-base px-8 h-14 bg-transparent"
            >
              <Link href={path("/contact")}>
                {t("Ask Us Anything")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="text-gray-500 text-sm mt-8">
             Oxnard, CA &bull; {t("Personalized coaching")} &bull; {t("Small classes")} &bull; {t("No contracts")}
          </p>
        </div>
      </Section>
    </div>
  );
}
