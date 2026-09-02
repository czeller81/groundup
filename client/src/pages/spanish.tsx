import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle, Clock, Loader2, MapPin, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SEO from "@/components/seo";
import { apiRequest } from "@/lib/queryClient";
import { track } from "@/lib/analytics";
import type { ClassScheduleResponse } from "@/lib/class-booking";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

function LanguageLinks({ current = "es" }: { current?: "en" | "es" }) {
  return (
    <nav aria-label="Selector de idioma" className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider">
      {current === "en" ? <span className="text-white">English</span> : <Link href="/" className="text-[#5EEBFF] hover:underline">English</Link>}
      <span className="text-gray-600" aria-hidden="true">|</span>
      {current === "es" ? <span className="text-white">Español</span> : <Link href="/es" className="text-[#5EEBFF] hover:underline">Español</Link>}
    </nav>
  );
}

function SpanishShell({ children, title, description, canonical }: { children: React.ReactNode; title: string; description: string; canonical: string }) {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      <SEO title={title} description={description} canonical={canonical} />
      <Navbar />
      <div className="border-b border-white/5 bg-[#0B0F14] px-4 py-3 pt-24"><LanguageLinks /></div>
      {children}
      <Footer />
    </div>
  );
}

export function SpanishHome() {
  return (
    <SpanishShell
      title="Jiu-Jitsu y Defensa Personal Solo para Mujeres en Oxnard"
      description="Ground Up es un centro de entrenamiento solo para mujeres en Oxnard: jiu-jitsu brasileño, defensa personal, fuerza y movimiento. No necesitas experiencia."
      canonical="/es"
    >
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Solo para mujeres · Oxnard, California</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-7xl">
            Descubre de lo que <span className="text-[#5EEBFF]">es capaz tu cuerpo.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-gray-300">
            Ya pasamos demasiado tiempo pensando en cómo se ve nuestro cuerpo. Es hora de descubrir de lo que es capaz. Aprende jiu-jitsu brasileño, defensa personal, fuerza y movimiento en un espacio cálido y sin presión.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-[#FFB199] font-bold uppercase tracking-wider text-[#0B0F14] hover:bg-[#FFB199]/90">
              <Link href="/es/reservar">Reserva tu primera visita gratis <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 text-white hover:bg-white/5">
              <Link href="/es/horario">Ver horario</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-gray-500">No necesitas experiencia. No necesitas una cuenta ni tarjeta.</p>
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {[
            { icon: Shield, title: "Solo para mujeres", text: "Entrena en un espacio diseñado para que aprendas con confianza." },
            { icon: Users, title: "Grupos pequeños", text: "Recibe atención real y avanza a tu propio ritmo." },
            { icon: CheckCircle, title: "Para principiantes", text: "No necesitas experiencia ni estar en forma antes de comenzar." },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-[#121826] p-6">
              <Icon className="h-6 w-6 text-[#5EEBFF]" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-black uppercase">Entrenamiento con propósito</h2>
        <p className="mx-auto mt-4 max-w-2xl text-gray-400">Jiu-jitsu, defensa personal, fuerza y movimiento para desarrollar habilidad, confianza y capacidad.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/5"><Link href="/es/programas">Conoce los programas</Link></Button>
          <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/5"><Link href="/es/contacto">Haz una pregunta</Link></Button>
        </div>
      </section>
    </SpanishShell>
  );
}

export function SpanishPrograms() {
  return (
    <SpanishShell title="Programas de Entrenamiento para Mujeres en Oxnard" description="Conoce los programas de jiu-jitsu, defensa personal, fuerza, movimiento y entrenamiento personal de Ground Up." canonical="/es/programas">
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Programas</p>
          <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">Encuentra tu punto de partida.</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-300">Cada programa es para mujeres. Si eres principiante, te acompañamos desde el primer día.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              ["Jiu-jitsu para mujeres", "Aprende fundamentos, control y movimiento en un ambiente de apoyo."],
              ["Defensa personal", "Desarrolla conciencia, límites, escape y confianza física sin miedo ni presión."],
              ["Fuerza y movimiento", "Construye fuerza útil, movilidad y resiliencia para la vida diaria."],
              ["Entrenamiento personal", "Coaching individualizado para tus objetivos, ritmo y nivel."],
              ["Niñas / jóvenes femeninas", "Pregunta por la disponibilidad actual, elegibilidad, guardianes y opciones madre + hija."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-[#121826] p-6">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{text}</p>
              </article>
            ))}
          </div>
          <Button asChild size="lg" className="mt-10 bg-[#FFB199] font-bold text-[#0B0F14] hover:bg-[#FFB199]/90"><Link href="/es/reservar">Reserva tu primera visita gratis <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
        </div>
      </section>
    </SpanishShell>
  );
}

export function SpanishSchedule() {
  const { data, isLoading, error } = useQuery<ClassScheduleResponse>({ queryKey: ["/api/classes"] });
  return (
    <SpanishShell title="Horario de Clases para Mujeres en Oxnard" description="Consulta el horario en vivo de las clases de Ground Up para mujeres en Oxnard." canonical="/es/horario">
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Horario en vivo</p>
          <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">Elige un momento para comenzar.</h1>
          <p className="mt-5 max-w-2xl text-gray-300">Este horario se actualiza desde el calendario de Ground Up. Todas las clases públicas son solo para mujeres.</p>
          {isLoading && <Loader2 className="mx-auto mt-12 h-8 w-8 animate-spin text-[#5EEBFF]" aria-label="Cargando horario" />}
          {error && <p className="mt-10 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-200" role="alert">No pudimos cargar el horario. Intenta de nuevo o contáctanos.</p>}
          {!isLoading && !error && !data?.occurrences.length && <p className="mt-10 rounded-xl border border-white/10 bg-[#121826] p-6 text-gray-300">No hay clases públicas disponibles en este momento. <Link href="/es/contacto" className="text-[#5EEBFF] underline">Contáctanos</Link> para saber cuál es el próximo paso.</p>}
          <div className="mt-10 space-y-4">
            {data?.occurrences.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-[#121826] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{item.title}</h2>
                    <p className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
                      <span><Clock className="mr-1 inline h-4 w-4" aria-hidden="true" />{new Date(item.start).toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" })}</span>
                      {item.location && <span><MapPin className="mr-1 inline h-4 w-4" aria-hidden="true" />{item.location}</span>}
                    </p>
                  </div>
                  <Button asChild className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90"><Link href={`/es/reservar?occurrence=${encodeURIComponent(item.id)}`}>Reservar</Link></Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SpanishShell>
  );
}

export function SpanishBooking() {
  const search = useSearch();
  const selectedId = useMemo(() => new URLSearchParams(search).get("occurrence"), [search]);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [confirmation, setConfirmation] = useState<any>(null);
  const { data, isLoading } = useQuery<ClassScheduleResponse>({ queryKey: ["/api/classes?firstVisit=true"] });
  const selected = data?.occurrences.find((item) => item.id === selectedId) || data?.occurrences[0];
  useEffect(() => { track("funnel_step", "training", { step: "spanish_booking_view" }); }, []);
  const reserve = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No hay una clase disponible.");
       const response = await apiRequest("POST", "/api/classes/reservations", { occurrenceId: selected.id, ...details, locale: "es" });
      return response.json();
    },
    onSuccess: (result) => { setConfirmation(result); localStorage.setItem(`groundup-class-${result.reservation.id}`, result.manageToken); track("reservation_succeeded", "training", { language: "es" }); },
    onError: () => track("reservation_failed", "training", { language: "es" }),
  });
  return (
    <SpanishShell title="Reserva tu Primera Visita Gratis | Ground Up Oxnard" description="Reserva una primera visita gratis en Ground Up. No necesitas cuenta, tarjeta ni experiencia previa." canonical="/es/reservar">
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {confirmation ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-[#121826] p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" aria-hidden="true" />
              <h1 className="mt-5 text-3xl font-black uppercase">{confirmation.reservation.status === "waitlisted" ? "Te agregamos a la lista de espera" : "Tu lugar está confirmado"}</h1>
              <p className="mt-4 text-gray-400">Enviamos la actualización a tu correo. Guarda este navegador para administrar tu reserva.</p>
              <Button asChild className="mt-7 bg-[#B06CFF]"><Link href="/es/horario">Volver al horario</Link></Button>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Sin cuenta ni tarjeta</p>
              <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">Reserva tu primera visita gratis.</h1>
              <p className="mt-5 text-gray-300">Ground Up es solo para mujeres. No necesitas experiencia. Si reservas para una niña o joven, contáctanos primero para confirmar elegibilidad y requisitos del tutor.</p>
              {isLoading && <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-[#5EEBFF]" aria-label="Cargando clases" />}
              {!isLoading && !selected && <div className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-6 text-gray-300">No hay clases disponibles ahora. <Link href="/es/contacto" className="text-[#5EEBFF] underline">Contáctanos</Link> para encontrar la próxima opción.</div>}
              {selected && (
                <form className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-6" onSubmit={(event) => { event.preventDefault(); track("funnel_step", "training", { step: "spanish_reservation_submitted" }); reserve.mutate(); }}>
                  <div className="mb-5 rounded-xl border border-[#5EEBFF]/15 bg-[#5EEBFF]/5 p-4 text-sm text-gray-300">
                    <strong className="text-white">{selected.title}</strong><br />
                    {new Date(selected.start).toLocaleString("es-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Los_Angeles" })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ["firstName", "Nombre", "text"],
                      ["lastName", "Apellido", "text"],
                      ["email", "Correo electrónico", "email"],
                      ["phone", "Teléfono", "tel"],
                    ] as const).map(([field, label, type]) => (
                      <div key={field}>
                        <Label htmlFor={`es-${field}`} className="text-gray-300">{label}</Label>
                        <Input id={`es-${field}`} required type={type} value={details[field]} onChange={(event) => setDetails({ ...details, [field]: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" />
                      </div>
                    ))}
                  </div>
                  {reserve.error && <p className="mt-4 text-sm text-red-300" role="alert">{(reserve.error as Error).message}</p>}
                  <Button type="submit" disabled={reserve.isPending} className="mt-6 w-full bg-[#FFB199] font-bold text-[#0B0F14] hover:bg-[#FFB199]/90">{reserve.isPending ? "Reservando…" : selected.bookingState === "waitlist" ? "Unirme a la lista de espera" : "Confirmar mi primera visita"}</Button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </SpanishShell>
  );
}

export function SpanishContact() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const send = useMutation({
    mutationFn: () => apiRequest("POST", "/api/contact", { ...form, subject: "Consulta en español", source: "es-contact" }),
    onSuccess: () => setSent(true),
  });
  return (
    <SpanishShell title="Contacta a Ground Up | Entrenamiento para Mujeres en Oxnard" description="Comunícate con Ground Up para preguntas sobre clases para mujeres, defensa personal, fuerza o elegibilidad juvenil." canonical="/es/contacto">
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">Contacto</p>
          <h1 className="mt-4 text-4xl font-black uppercase sm:text-6xl">Hablemos.</h1>
          <p className="mt-5 text-gray-300">¿Tienes preguntas sobre las clases, la primera visita o la elegibilidad para niñas? Escríbenos.</p>
          {sent ? <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-[#121826] p-6 text-emerald-200" role="status">Gracias. Recibimos tu mensaje y nos comunicaremos contigo.</div> : (
            <form className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-[#121826] p-6" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["firstName", "lastName"] as const).map((field) => <div key={field}><Label htmlFor={`es-contact-${field}`} className="text-gray-300">{field === "firstName" ? "Nombre" : "Apellido"}</Label><Input id={`es-contact-${field}`} required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" /></div>)}
              </div>
              <div><Label htmlFor="es-contact-email" className="text-gray-300">Correo electrónico</Label><Input id="es-contact-email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" /></div>
              <div><Label htmlFor="es-contact-phone" className="text-gray-300">Teléfono (opcional)</Label><Input id="es-contact-phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" /></div>
              <div><Label htmlFor="es-contact-message" className="text-gray-300">Mensaje</Label><textarea id="es-contact-message" required rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="mt-1 w-full rounded-md border border-white/10 bg-black/20 p-3 text-white placeholder:text-gray-500" placeholder="¿Cómo podemos ayudarte?" /></div>
              {send.error && <p className="text-sm text-red-300" role="alert">No pudimos enviar tu mensaje. Intenta de nuevo.</p>}
              <Button type="submit" disabled={send.isPending} className="w-full bg-[#FFB199] font-bold text-[#0B0F14] hover:bg-[#FFB199]/90">{send.isPending ? "Enviando…" : "Enviar mensaje"}</Button>
            </form>
          )}
          <p className="mt-8 text-sm text-gray-400">También puedes llamar al <a className="text-[#5EEBFF] underline" href="tel:786-757-1175">(786) 757-1175</a> o escribir a <a className="text-[#5EEBFF] underline" href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>
        </div>
      </section>
    </SpanishShell>
  );
}

export function SpanishPrivacy() {
  return (
    <SpanishShell title="Política de Privacidad | Ground Up BJJ" description="Conoce cómo Ground Up protege la información enviada a través del sitio, formularios y reservas." canonical="/es/privacidad">
      <section className="px-4 py-16 sm:px-6">
        <div className="prose prose-invert mx-auto max-w-3xl">
          <h1>Política de privacidad</h1>
          <p>Ground Up explica cómo recopila, utiliza y protege la información enviada por el sitio, los formularios y las reservas.</p>
          <h2>Información que recibimos</h2>
          <p>Podemos recibir tu nombre, correo, teléfono, mensaje, información de reserva y datos técnicos necesarios para operar el sitio. Solo pedimos la información necesaria para responder, administrar clases y proteger la comunidad.</p>
          <h2>Tus opciones</h2>
          <p>Las analíticas opcionales requieren tu consentimiento. Puedes usar el sitio sin aceptar analíticas. Para preguntas sobre privacidad, escribe a <a href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>
        </div>
      </section>
    </SpanishShell>
  );
}