import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/class-card";
import type { ClassScheduleResponse } from "@/lib/class-booking";
import SEO from "@/components/seo";
import { localizedPublicPath, switchLocalePath, useLocale } from "@/lib/locale";
import { localizedPortalEntryPath } from "@/lib/portal-navigation";

export default function LiveSchedule() {
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    seoTitle: "Horario de Clases en Vivo | Ground Up Jiu-Jitsu y Fitness",
    seoDescription: "Consulta las próximas clases de Ground Up, disponibilidad en vivo y lista de espera en horario del Pacífico.",
    eyebrow: "Horario en vivo · Hora del Pacífico",
     title: "HORARIO SEMANAL",
     description: "Jiu-Jitsu, defensa personal y entrenamiento de fuerza para mujeres y niñas. Las fechas, horarios y disponibilidad se sincronizan desde el calendario de la academia.",
    loadError: "No se pudo cargar el horario en vivo.",
    configuring: "La reserva de clases está en configuración. Todavía no se está anunciando disponibilidad en vivo.",
    noClasses: "No hay clases reservables disponibles en este momento.",
     waitlist: "Unirme a la lista de espera", firstVisit: "Reservar primera visita", member: "Reserva para miembros", girls: "Consultar disponibilidad",
    login: "Acceso de miembros",
  } : {
    seoTitle: "Live Class Schedule | Ground Up Jiu-Jitsu & Fitness",
    seoDescription: "See upcoming Ground Up classes, live availability, and waitlist status in Pacific time.",
    eyebrow: "Live schedule · Pacific time",
     title: "WEEKLY SCHEDULE",
     description: "Women’s Jiu-Jitsu, Self-Defense & Strength Training. Dates, times, availability, and cancellations are synchronized from the academy calendar.",
    loadError: "The live schedule could not be loaded.",
    configuring: "Online class booking is being configured. No live availability is being claimed yet.",
    noClasses: "No bookable classes are currently listed.",
     waitlist: "Join waitlist", firstVisit: "Book first visit", member: "Member booking", girls: "Contact / inquire",
    login: "Member login",
  };
  const { data, isLoading, error } = useQuery<ClassScheduleResponse>({
    queryKey: ["/api/classes"],
  });
  return (
    <div className="min-h-screen bg-[#0B0F14] px-4 pb-20 pt-28 text-white">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/schedule", locale)}
      />
      <main className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">{copy.eyebrow}</p>
          <h1 className="text-4xl font-black uppercase sm:text-5xl">{copy.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">{copy.description}</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200"><AlertCircle className="mr-2 inline h-5 w-5" />{copy.loadError}</div>
        ) : !data?.sync.configured ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
            <AlertCircle className="mr-2 inline h-5 w-5" />{copy.configuring}
          </div>
        ) : data.occurrences.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121826] p-10 text-center text-gray-400"><CalendarDays className="mx-auto mb-3 h-9 w-9" />{copy.noClasses}</div>
        ) : (
          <div className="space-y-4">
            {data.occurrences.map((occurrence) => (
              <ClassCard
                key={occurrence.id}
                occurrence={occurrence}
                 actionLabel={occurrence.bookingState === "not_available" ? copy.girls : occurrence.firstVisitEligible ? (occurrence.bookingState === "waitlist" ? copy.waitlist : copy.firstVisit) : copy.member}
                 onAction={occurrence.bookingState === "not_available" ? () => { window.location.href = localizedPublicPath("/contact#contact-form", locale); } : () => { window.location.href = occurrence.firstVisitEligible ? localizedPublicPath("/contact#contact-form", locale) : switchLocalePath("/portal/booking", locale); }}
              />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="border-white/15 bg-transparent text-white"><Link href={localizedPortalEntryPath("/portal/login", locale)}>{copy.login}</Link></Button>
        </div>
      </main>
    </div>
  );
}