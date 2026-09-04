import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass, Brain, Shield } from "lucide-react";
import SEO from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAttribution, track } from "@/lib/analytics";
import { localizedPublicPath, useLocale } from "@/lib/locale";

type Values = {
  firstName: string;
  lastName: string;
  email: string;
  occupation?: string;
  workLifeChange: string;
  capabilityGoal: string;
  aiComfort: string;
  cohortTiming?: string;
  company?: string;
  consent: boolean;
};

export default function AdaptiveCapacity() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const copy = locale === "es" ? {
    seoTitle: "Capacidad Adaptativa — Desarrolla tu capacidad de adaptarte | Ground Up",
    seoDescription: "Desarrolla la capacidad de adaptarte a lo que venga mediante aprendizaje práctico, reflexión y acción.",
    eyebrow: "Una experiencia de aprendizaje de Ground Up",
    title: <>DESARROLLA LA CAPACIDAD DE <span className="gradient-text-cyan">ADAPTARTE</span> A LO QUE SIGUE.</>,
    intro: "El trabajo y la vida cambian rápido. Capacidad Adaptativa es un producto separado de Ground Up para desarrollar pensamiento claro, mejores decisiones y la confianza para avanzar cuando el camino es incierto.",
    join: "Únete a la lista de interés", physical: "Explora el entrenamiento físico",
    firstDetails: "Los detalles de la primera cohorte se compartirán cuando estén confirmados.",
    cards: [["Ver con más claridad", "Comprende el cambio, la incertidumbre y las señales contradictorias sin necesitar información perfecta."], ["Practicar mejores decisiones", "Usa reflexión y herramientas prácticas para convertir la claridad en un siguiente paso que puedas tomar."], ["Desarrollar capacidad duradera", "Fortalece los hábitos, la confianza y la adaptabilidad que te ayudan a responder en vez de reaccionar."]],
    formEyebrow: "Sigue de cerca el proyecto", formTitle: "RECIBE LAS PRIMERAS NOTICIAS.",
    submittedTitle: "Ya estás en la lista.", submittedText: "Compartiremos los próximos detalles confirmados cuando estén listos.",
    fields: ["Nombre", "Apellido", "Correo electrónico", "Rol u ocupación (opcional)", "Empresa (opcional)", "¿Qué cambio estás atravesando?", "¿Qué capacidad te gustaría desarrollar más?", "¿Qué tan cómoda te sientes con las herramientas de IA?", "¿Cuándo te interesaría más? (opcional)"],
    placeholders: ["Un nuevo rol, IA en el trabajo, una transición de vida u otra cosa...", "Por ejemplo: este año, cuando se anuncien las fechas"],
    choose: "Elige una opción", options: ["Tengo curiosidad, pero soy nueva", "Me siento cómoda experimentando", "Soy usuaria habitual", "Prefiero no decirlo"],
    consent: "Acepto recibir noticias de Ground Up sobre Capacidad Adaptativa. Esto no se agregará a la lista de reservas de entrenamiento.",
    saving: "Guardando…",
    validation: { firstName: "El nombre es obligatorio", lastName: "El apellido es obligatorio", email: "Escribe un correo válido", workLifeChange: "Cuéntanos qué está cambiando", capabilityGoal: "Cuéntanos qué quieres desarrollar", aiComfort: "Elige una opción", consent: "Acepta recibir noticias" },
    successToast: "Estás en la lista de interés.", errorToast: "Algo salió mal", errorDescription: "Inténtalo de nuevo.",
  } : {
    seoTitle: "Adaptive Capacity — Build the Capacity to Adapt | Ground Up",
    seoDescription: "Build the capacity to adapt to whatever comes next through practical learning, reflection, and action.",
    eyebrow: "A Ground Up learning experience",
    title: <>BUILD THE CAPACITY TO <span className="gradient-text-cyan">ADAPT</span> TO WHATEVER COMES NEXT.</>,
    intro: "Work and life are changing quickly. Adaptive Capacity is a separate Ground Up product for building clearer thinking, better decisions, and the confidence to keep moving when the path is uncertain.",
    join: "Join the interest list", physical: "Explore physical training",
    firstDetails: "First cohort details will be shared as they are confirmed.",
    cards: [["See more clearly", "Make sense of change, uncertainty, and competing signals without needing perfect information."], ["Practice better decisions", "Use reflection and practical tools to turn insight into a next step you can actually take."], ["Build durable capacity", "Strengthen the habits, confidence, and adaptability that help you respond rather than react."]],
    formEyebrow: "Stay close to the build", formTitle: "GET THE FIRST WORD.",
    submittedTitle: "You’re on the list.", submittedText: "We’ll share the next confirmed details when they’re ready.",
    fields: ["First name", "Last name", "Email", "Occupation or role (optional)", "Company (optional)", "What change are you navigating?", "What capability would you most like to build?", "How comfortable are you with AI tools?", "When would you be most interested? (optional)"],
    placeholders: ["A new role, AI at work, a life transition, or something else...", "For example: this year, when dates are announced"],
    choose: "Choose one", options: ["Curious but new", "Comfortable experimenting", "Regular user", "Prefer not to say"],
    consent: "I agree to hear from Ground Up about Adaptive Capacity. We won’t add this to the training booking list.",
    saving: "Saving...",
    validation: { firstName: "First name is required", lastName: "Last name is required", email: "Enter a valid email", workLifeChange: "Tell us what is changing", capabilityGoal: "Tell us what you want to build", aiComfort: "Please choose one", consent: "Please agree to hear from us" },
    successToast: "You're on the interest list.", errorToast: "Something went wrong", errorDescription: "Please try again.",
  };
  const schema = z.object({
    firstName: z.string().min(1, copy.validation.firstName),
    lastName: z.string().min(1, copy.validation.lastName),
    email: z.string().email(copy.validation.email),
    occupation: z.string().max(120).optional(),
    workLifeChange: z.string().min(1, copy.validation.workLifeChange).max(1200),
    capabilityGoal: z.string().min(1, copy.validation.capabilityGoal).max(1200),
    aiComfort: z.string().min(1, copy.validation.aiComfort),
    cohortTiming: z.string().optional(),
    company: z.string().max(160).optional(),
    consent: z.boolean().refine(Boolean, copy.validation.consent),
  });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { aiComfort: "", consent: false } });
  const mutation = useMutation({
    mutationFn: (values: Values) => apiRequest("POST", "/api/trial-leads", {
      ...values, program: "adaptive-capacity", phone: "not-provided",
      source: "adaptive-capacity", consentedAt: new Date().toISOString(),
      attribution: getAttribution(),
    }),
    onSuccess: () => { setSubmitted(true); track("lead_form_succeeded", "adaptive_capacity"); toast({ title: copy.successToast }); },
    onError: () => { track("lead_form_failed", "adaptive_capacity"); toast({ title: copy.errorToast, description: copy.errorDescription, variant: "destructive" }); },
  });
  return (
    <main className="bg-[#0B0F14] text-white">
      <SEO title={copy.seoTitle} description={copy.seoDescription} canonical={localizedPublicPath("/adaptive-capacity", locale)} />
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(94,235,255,.12),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(176,108,255,.12),transparent_30%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-36 pb-24 md:pt-48 md:pb-32">
          <p className="text-[#5EEBFF] uppercase tracking-[.3em] text-xs font-semibold mb-6">{copy.eyebrow}</p>
          <h1 className="max-w-4xl break-words text-4xl font-bold leading-[.95] sm:text-5xl md:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
            {copy.title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg md:text-xl text-gray-300 leading-relaxed">
            {copy.intro}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#interest-list" onClick={() => track("cta_click", "adaptive_capacity", { cta: "hero_interest_list" })}><Button className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider">{copy.join} <ArrowRight className="ml-2 h-4 w-4" /></Button></a>
            <Link href={localizedPublicPath("/", locale)}><Button variant="outline" className="border-white/20 text-white bg-transparent">{copy.physical}</Button></Link>
          </div>
          <p className="mt-5 text-sm text-gray-500">{copy.firstDetails}</p>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            [Compass, ...copy.cards[0]],
            [Brain, ...copy.cards[1]],
            [Shield, ...copy.cards[2]],
          ].map(([Icon, title, body]) => {
            const Component = Icon as typeof Compass;
            return <div key={title as string} className="p-7 rounded-2xl border border-white/10 bg-[#121826]"><Component className="h-7 w-7 text-[#5EEBFF] mb-5" /><h2 className="text-xl font-bold mb-3">{title as string}</h2><p className="text-gray-400 leading-relaxed">{body as string}</p></div>;
          })}
        </div>
      </section>
      <section id="interest-list" className="bg-[#121826] border-y border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-[#FFB199] uppercase tracking-[.25em] text-xs font-semibold mb-4">{copy.formEyebrow}</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>{copy.formTitle}</h2>
          {submitted ? <div className="p-8 rounded-2xl border border-[#5EEBFF]/30 bg-[#5EEBFF]/5"><CheckCircle2 className="text-[#5EEBFF] h-8 w-8 mb-4" /><h3 className="text-2xl font-bold">{copy.submittedTitle}</h3><p className="text-gray-300 mt-2">{copy.submittedText}</p></div> :
            <form onFocus={() => track("lead_form_started", "adaptive_capacity")} onSubmit={form.handleSubmit((v) => { track("lead_form_submitted", "adaptive_capacity"); mutation.mutate(v); })} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4"><Field label={copy.fields[0]} error={form.formState.errors.firstName?.message}><Input {...form.register("firstName")} /></Field><Field label={copy.fields[1]} error={form.formState.errors.lastName?.message}><Input {...form.register("lastName")} /></Field></div>
              <Field label={copy.fields[2]} error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
              <div className="grid sm:grid-cols-2 gap-4"><Field label={copy.fields[3]}><Input {...form.register("occupation")} /></Field><Field label={copy.fields[4]}><Input {...form.register("company")} /></Field></div>
              <Field label={copy.fields[5]} error={form.formState.errors.workLifeChange?.message}><Textarea {...form.register("workLifeChange")} placeholder={copy.placeholders[0]} /></Field>
              <Field label={copy.fields[6]} error={form.formState.errors.capabilityGoal?.message}><Textarea {...form.register("capabilityGoal")} /></Field>
              <Field label={copy.fields[7]} error={form.formState.errors.aiComfort?.message}><select {...form.register("aiComfort")} className="w-full h-10 rounded-md border border-white/10 bg-[#0B0F14] px-3 text-sm text-white"><option value="">{copy.choose}</option>{copy.options.map((option) => <option key={option}>{option}</option>)}</select></Field>
              <Field label={copy.fields[8]}><Input {...form.register("cohortTiming")} placeholder={copy.placeholders[1]} /></Field>
              <label className="flex gap-3 items-start text-sm text-gray-400"><input type="checkbox" {...form.register("consent")} className="mt-1 accent-[#5EEBFF]" /> {copy.consent}</label>
              {form.formState.errors.consent && <p className="text-sm text-red-300">{form.formState.errors.consent.message}</p>}
              <Button type="submit" disabled={mutation.isPending} className="bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider">{mutation.isPending ? copy.saving : copy.join} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>}
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-gray-200">{label}</label>{children}{error && <p className="text-sm text-red-300">{error}</p>}</div>;
}