import { Link } from "wouter";
import SEO from "@/components/seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { localizeApiError, localizedPublicPath, useLocale } from "@/lib/locale";
import { TurnstileField } from "@/components/turnstile";

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  website?: string;
};

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

export default function Contact() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const discoveryPassPath = localizedPublicPath("/discovery-pass", locale);
  const copy = locale === "es" ? {
    seoTitle: "Contacta a Ground Up | Entrenamiento Solo para Mujeres en Oxnard",
    seoDescription: "¿Tienes preguntas sobre jiu-jitsu brasileño, defensa personal, fuerza, movimiento o elegibilidad para niñas? Contacta a Ground Up en Oxnard.",
    title: "HABLEMOS", intro: "¿Tienes una pregunta? ¿Te interesa un programa? ¿No sabes por dónde empezar? Estamos aquí para ayudarte.",
    sendTitle: "ENVÍA UN MENSAJE", firstName: "Nombre", lastName: "Apellido", email: "Correo electrónico", phone: "Teléfono (opcional)", subject: "Tema", selectSubject: "Selecciona un tema",
    subjects: [["general", "Consulta general"], ["training", "Entrenamiento personal"], ["pricing", "Información de precios"], ["schedule", "Pregunta sobre el horario"]] as const,
    message: "Mensaje", messagePlaceholder: "Cuéntanos tus objetivos o tus preguntas...", send: "Enviar mensaje", sending: "Enviando…",
    sent: "¡Mensaje enviado!", sentDescription: "Recibimos tu mensaje y nos comunicaremos contigo.", failed: "No se pudo enviar el mensaje",
    contactInfo: "INFORMACIÓN DE CONTACTO", location: "Ubicación", hours: "Horario de entrenamiento", ready: "¿LISTA PARA COMENZAR?",
     readyDescription: "Obtén tu Discovery Pass gratis: crea una cuenta, completa los formularios requeridos, activa el pase y reserva una clase elegible de SKILL y una de STRENGTH.",
     book: "Obtén tu Discovery Pass gratis", phoneLabel: "Teléfono", emailLabel: "Correo", contactButton: "Obtén tu Discovery Pass gratis",
    validation: { firstName: "El nombre es obligatorio", lastName: "El apellido es obligatorio", email: "Escribe un correo válido", subject: "Selecciona un tema", message: "El mensaje es obligatorio" },
  } : {
    seoTitle: "Contact Ground Up | Women-Only Training in Oxnard",
    seoDescription: "Questions about women-only Brazilian Jiu-Jitsu, practical self-defense, strength, movement, or girls/female-youth eligibility? Contact Ground Up in Oxnard.",
    title: "GET IN TOUCH", intro: "Have a question? Curious about a program? Not sure where to start? We're here — reach out any time.",
    sendTitle: "SEND A MESSAGE", firstName: "First Name", lastName: "Last Name", email: "Email", phone: "Phone (optional)", subject: "Subject", selectSubject: "Select a subject",
    subjects: [["general", "General Inquiry"], ["training", "Personal Training"], ["pricing", "Pricing Information"], ["schedule", "Schedule Question"]] as const,
    message: "Message", messagePlaceholder: "Tell us about your goals or any questions...", send: "Send Message", sending: "Sending…",
    sent: "Message Sent!", sentDescription: "We received your message and will be in touch.", failed: "Failed to Send Message",
    contactInfo: "CONTACT INFO", location: "Location", hours: "Training Hours", ready: "READY TO BEGIN?",
     readyDescription: "Get your free Discovery Pass: create an account, complete the required forms, activate the pass, then book one eligible SKILL class and one eligible STRENGTH class.",
     book: "Get Your Free Discovery Pass", phoneLabel: "Phone", emailLabel: "Email", contactButton: "Get Your Free Discovery Pass",
    validation: { firstName: "First name is required", lastName: "Last name is required", email: "Please enter a valid email", subject: "Please select a subject", message: "Message is required" },
  };
  const contactSchema = z.object({
    firstName: z.string().min(1, copy.validation.firstName),
    lastName: z.string().min(1, copy.validation.lastName),
    email: z.string().email(copy.validation.email),
    phone: z.string().optional(),
    subject: z.string().min(1, copy.validation.subject),
    message: z.string().min(1, copy.validation.message),
    website: z.string().max(0).optional(),
  });

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      website: "",
    },
  });
  const [formStartedAt] = useState(() => Date.now());
  const [turnstileToken, setTurnstileToken] = useState("");
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      return await apiRequest("POST", "/api/contact", { ...data, locale, formStartedAt, turnstileToken });
    },
    onSuccess: async (response) => {
      const result = await response.json();
      toast({ title: copy.sent, description: locale === "es" ? copy.sentDescription : result.message });
      form.reset();
    },
    onError: (error) => {
      toast({ title: copy.failed, description: localizeApiError(error.message, locale, copy.failed), variant: "destructive" });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="flex flex-col bg-[#0B0F14]">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/contact", locale)}
      />
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#121826] to-[#0B0F14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FFB199]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 break-words" style={{ fontFamily: 'var(--font-display)' }}>
            {copy.title.includes("HABLEMOS") ? <>HABLE<span className="gradient-text-warm">MOS</span></> : <>GET IN <span className="gradient-text-warm">TOUCH</span></>}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {copy.intro}
          </p>
        </div>
      </section>

      <Section className="py-24 bg-[#0B0F14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
               <div id="contact-form" className="rounded-2xl border border-white/10 bg-[#121826] p-4 sm:p-8" data-testid="contact-form">
                <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>{copy.sendTitle}</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <input type="text" {...form.register("website")} tabIndex={-1} autoComplete="off" className="absolute -left-[10000px] h-px w-px opacity-0" aria-hidden="true" />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">{copy.firstName}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="given-name"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#5EEBFF]"
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">{copy.lastName}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                autoComplete="family-name"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#5EEBFF]"
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{copy.email}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              {...field}
                              autoComplete="email"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#5EEBFF]"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{copy.phone}</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              {...field}
                              autoComplete="tel"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#5EEBFF]"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{copy.subject}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder={copy.selectSubject} />
                              </SelectTrigger>
                              <SelectContent className="bg-[#121826] border-white/10">
                                {copy.subjects.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">{copy.message}</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={5}
                              placeholder={copy.messagePlaceholder}
                              {...field}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#5EEBFF]"
                              data-testid="input-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <TurnstileField onToken={onTurnstileToken} />
                    <Button
                      type="submit"
                      className="w-full bg-[#FFB199] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#FFB199]/90 h-12"
                      disabled={contactMutation.isPending}
                      data-testid="button-send-message"
                    >
                      {contactMutation.isPending ? (
                        copy.sending
                      ) : (
                        <>
                          {copy.send}
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#121826] p-4 sm:p-8" data-testid="contact-info">
                <h3 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>{copy.contactInfo}</h3>
                <div className="space-y-5">
                  <a href="tel:786-757-1175" className="flex min-h-11 items-start gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-[#5EEBFF]" />
                    </div>
                    <div>
                       <div className="text-gray-400 text-sm">{copy.phoneLabel}</div>
                      <div className="text-white group-hover:text-[#5EEBFF] transition-colors">(786) 757-1175</div>
                    </div>
                  </a>
                  <a href="mailto:info@groundupbjj.com" className="flex min-h-11 items-start gap-4 group">
                    <div className="w-10 h-10 rounded-lg bg-[#B06CFF]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-[#B06CFF]" />
                    </div>
                    <div>
                       <div className="text-gray-400 text-sm">{copy.emailLabel}</div>
                      <div className="text-white group-hover:text-[#B06CFF] transition-colors">info@groundupbjj.com</div>
                    </div>
                  </a>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#FFB199]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-[#FFB199]" />
                    </div>
                    <div>
                       <div className="text-gray-400 text-sm">{copy.location}</div>
                      <div className="text-white">Oxnard, CA</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-[#5EEBFF]" />
                    </div>
                    <div>
                       <div className="text-gray-400 text-sm">{copy.hours}</div>
                       <div className="text-white">{locale === "es" ? "Consulta el horario en vivo" : "See the live schedule for current times"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#5EEBFF]/5 to-[#B06CFF]/5 p-4 sm:p-8 text-center">
                 <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>{copy.ready}</h3>
                <p className="text-gray-400 text-sm mb-6">
                   {copy.readyDescription}
                </p>
                <Button
                  asChild
                  className="w-full bg-[#5EEBFF] text-[#0B0F14] font-bold uppercase tracking-wider hover:bg-[#5EEBFF]/90"
                >
                    <Link href={discoveryPassPath}>
                     {copy.contactButton}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
