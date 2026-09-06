import { CalendarDays, Clock, MapPin, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LiveClass } from "@/lib/class-booking";
import { classDateLabel, classTimeLabel, localizedClassTitle } from "@/lib/class-booking";
import { useLocale } from "@/lib/locale";

export function ClassCard({
  occurrence,
  actionLabel,
  onAction,
  busy,
  locale,
}: {
  occurrence: LiveClass;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  locale?: "en" | "es";
}) {
  const { locale: currentLocale, copy: portalCopy } = useLocale();
  const activeLocale = locale || currentLocale;
  const waitlist = occurrence.bookingState === "waitlist";
  const unavailable = occurrence.bookingState === "not_available";
  const copy = {
    beginner: portalCopy.beginnerFriendly, full: portalCopy.classFull,
    saving: portalCopy.saving,
    category: occurrence.canonicalCategory === "GIRLS_JIU_JITSU_SELF_DEFENSE"
      ? (activeLocale === "es" ? "Clase para niñas" : "Girls’ class")
      : occurrence.canonicalCategory === "STRENGTH_CONDITIONING"
        ? (activeLocale === "es" ? "Fuerza y acondicionamiento" : "Strength & conditioning")
        : (activeLocale === "es" ? "Jiu-Jitsu / defensa personal" : "Jiu-Jitsu / self-defense"),
    focus: occurrence.strengthFocus === "LOWER_BODY"
      ? (activeLocale === "es" ? "Tren inferior" : "Lower body")
      : occurrence.strengthFocus === "UPPER_BODY_CORE"
        ? (activeLocale === "es" ? "Tren superior + core" : "Upper body + core")
        : occurrence.strengthFocus === "FULL_BODY"
          ? (activeLocale === "es" ? "Cuerpo completo" : "Full body")
          : null,
  };
  return (
    <article className="rounded-2xl border border-white/10 bg-[#121826] p-4 shadow-lg shadow-black/10 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-[#5EEBFF]/25 bg-[#5EEBFF]/10 text-[#5EEBFF]">
              <CalendarDays className="mr-1 h-3 w-3" />
              {classDateLabel(occurrence.start, activeLocale)}
            </Badge>
            {occurrence.classType?.beginnerFriendly && (
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">{copy.beginner}</Badge>
            )}
          </div>
           <h2 className="break-words text-lg font-bold text-white">{localizedClassTitle(occurrence, activeLocale)}</h2>
           <div className="mt-2 flex flex-wrap gap-2 text-xs">
             <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-gray-300">{copy.category}</span>
             {copy.focus && <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-200">{copy.focus}</span>}
           </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{classTimeLabel(occurrence.start, occurrence.end, activeLocale)}</span>
            {occurrence.instructorName && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{occurrence.instructorName}</span>}
            {occurrence.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{occurrence.location}</span>}
          </div>
           {unavailable && (
             <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-300">
               <Users className="h-4 w-4" />
               {activeLocale === "es" ? "Próximamente disponible — consulta al equipo" : "Not yet available — contact the team"}
             </p>
           )}
           {waitlist && !unavailable && (
             <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-300">
               <Users className="h-4 w-4" />
               {copy.full}
             </p>
           )}
        </div>
         {onAction && actionLabel && !unavailable && (
          <Button
            onClick={onAction}
            disabled={busy}
             className={`w-full sm:w-auto ${waitlist ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90"}`}
          >
            {busy ? copy.saving : actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
}