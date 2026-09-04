import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { CheckCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClassCard } from "@/components/class-card";
import type { ClassScheduleResponse } from "@/lib/class-booking";
import SEO from "@/components/seo";
import { track } from "@/lib/analytics";
import { localizeApiError, localizedPublicPath, useLocale } from "@/lib/locale";

export default function FirstVisitBooking() {
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    seoTitle: "Reserva tu Primera Visita Gratis | Ground Up",
    seoDescription: "Reserva una primera visita gratis en Ground Up, un centro de entrenamiento solo para mujeres en Oxnard. No necesitas cuenta ni tarjeta.",
    noAccount: "No necesitas cuenta ni tarjeta", title: "Reserva tu primera visita gratis",
    intro: "Entrenamiento solo para mujeres en Oxnard. No necesitas experiencia. Elige una clase disponible, dinos cómo contactarte y te explicaremos qué esperar cuando llegues.",
    noClasses: "No hay clases para primeras visitas disponibles en este momento.", contact: "Contáctanos y te ayudaremos a encontrar la próxima opción disponible.",
    contactButton: "Contactar a Ground Up", firstName: "Nombre", lastName: "Apellido", email: "Correo electrónico", phone: "Teléfono",
    experience: "Experiencia de entrenamiento (opcional)", experiencePlaceholder: "Nueva en jiu-jitsu, con algo de experiencia, etc.",
    error: "No se pudo reservar. Intenta de nuevo o contáctanos.", reserving: "Reservando…", waitlist: "Unirme a la lista de espera", confirm: "Confirmar mi primera visita",
    confirmed: "Tu lugar está confirmado", waitlisted: "Estás en la lista de espera", confirmation: "Enviamos el estado de tu reserva a tu correo. Mantén este navegador para administrar la reserva.", back: "Volver al horario",
  } : {
    seoTitle: "Book Your Free First Visit | Ground Up",
    seoDescription: "Reserve a free first visit at Ground Up, a women-only training center in Oxnard. No account or credit card required.",
    noAccount: "No account or credit card required", title: "Book your free first visit",
    intro: "Women-only training in Oxnard. No experience is required. Choose an available class, tell us how to reach you, and we’ll explain what to expect when you arrive.",
    noClasses: "No first-visit classes are currently available right now.", contact: "Contact us and we’ll help you find the next appropriate opening.",
    contactButton: "Contact Ground Up", firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone",
    experience: "Training experience (optional)", experiencePlaceholder: "New to jiu-jitsu, some experience, etc.",
    error: "Could not reserve. Please try again or contact us.", reserving: "Reserving…", waitlist: "Join waitlist", confirm: "Confirm free first visit",
    confirmed: "Your spot is confirmed", waitlisted: "You're on the waitlist", confirmation: "Your reservation status was sent to your email. Keep this browser to manage the reservation.", back: "Back to schedule",
  };
  const search = useSearch();
  const selectedId = useMemo(() => new URLSearchParams(search).get("occurrence"), [search]);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", phone: "", experience: "" });
  const [confirmation, setConfirmation] = useState<any>(null);
  const { data, isLoading } = useQuery<ClassScheduleResponse>({
    queryKey: ["/api/classes?firstVisit=true"],
  });
  const selected = data?.occurrences.find((item) => item.id === selectedId) || data?.occurrences[0];
  useEffect(() => {
    track("funnel_step", "training", { step: "view_booking" });
  }, []);
  const reserve = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Choose an available class.");
      const response = await apiRequest("POST", "/api/classes/reservations", { occurrenceId: selected.id, ...details });
      return response.json();
    },
    onSuccess: (result) => {
      setConfirmation(result);
      localStorage.setItem(`groundup-class-${result.reservation.id}`, result.manageToken);
    },
  });
  if (confirmation) {
    return (
       <main className="min-h-screen bg-[#0B0F14] px-4 pb-20 pt-32 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-emerald-500/20 bg-[#121826] p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
           <h1 className="text-3xl font-black">{confirmation.reservation.status === "waitlisted" ? copy.waitlisted : copy.confirmed}</h1>
           <p className="mt-3 text-gray-400">{copy.confirmation}</p>
           <Button asChild className="mt-6 bg-[#B06CFF]"><Link href={localizedPublicPath("/schedule", locale)}>{copy.back}</Link></Button>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 pb-20 pt-28 text-white">
         <SEO title={copy.seoTitle} description={copy.seoDescription} canonical={localizedPublicPath("/book", locale)} />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
           <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">{copy.noAccount}</p>
           <h1 className="mt-3 text-4xl font-black uppercase">{copy.title}</h1>
           <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-400">{copy.intro}</p>
        </div>
        {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#5EEBFF]" /> : !selected ? (
          <div className="rounded-2xl border border-white/10 bg-[#121826] p-8 text-center">
             <p className="text-gray-300">{copy.noClasses}</p>
             <p className="mt-2 text-sm text-gray-500">{copy.contact}</p>
             <Button asChild variant="outline" className="mt-4 border-white/15 text-white"><Link href={localizedPublicPath("/contact", locale)}>{copy.contactButton}</Link></Button>
          </div>
        ) : (
          <>
            <ClassCard occurrence={selected} />
              <form className="mt-5 rounded-2xl border border-white/10 bg-[#121826] p-6" onSubmit={(event) => { event.preventDefault(); track("funnel_step", "training", { step: "reservation_submitted" }); reserve.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["firstName", "lastName", "email", "phone"] as const).map((field) => (
                  <div key={field}>
                     <Label htmlFor={field} className="text-gray-300">{({ firstName: copy.firstName, lastName: copy.lastName, email: copy.email, phone: copy.phone } as const)[field]}</Label>
                    <Input id={field} required type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={details[field]} onChange={(event) => setDetails({ ...details, [field]: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                 <Label htmlFor="experience" className="text-gray-300">{copy.experience}</Label>
                 <Input id="experience" value={details.experience} onChange={(event) => setDetails({ ...details, experience: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" placeholder={copy.experiencePlaceholder} />
              </div>
               {reserve.error && <p className="mt-4 text-sm text-red-300" role="alert">{localizeApiError((reserve.error as Error).message, locale, copy.error)}</p>}
              <Button type="submit" disabled={reserve.isPending} className="mt-6 w-full bg-[#FFB199] font-bold text-black hover:bg-[#FFB199]/90">
                 {reserve.isPending ? copy.reserving : selected.bookingState === "waitlist" ? copy.waitlist : copy.confirm}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}