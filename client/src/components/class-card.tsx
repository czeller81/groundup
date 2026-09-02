import { CalendarDays, Clock, MapPin, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LiveClass } from "@/lib/class-booking";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
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
  const currentLocale = useLocale().locale;
  const activeLocale = locale || currentLocale;
  const waitlist = occurrence.bookingState === "waitlist";
  const copy = activeLocale === "es"
    ? { beginner: "Ideal para principiantes", full: "Clase llena", waiting: "en espera", spot: "lugar disponible", spots: "lugares disponibles", saving: "Guardando…" }
    : { beginner: "Beginner friendly", full: "Class full", waiting: "waiting", spot: "spot left", spots: "spots left", saving: "Saving…" };
  return (
    <article className="rounded-2xl border border-white/10 bg-[#121826] p-5 shadow-lg shadow-black/10">
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
          <h2 className="text-lg font-bold text-white">{occurrence.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{classTimeLabel(occurrence.start, occurrence.end, activeLocale)}</span>
            {occurrence.instructorName && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{occurrence.instructorName}</span>}
            {occurrence.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{occurrence.location}</span>}
          </div>
          <p className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${waitlist ? "text-amber-300" : "text-emerald-300"}`}>
            <Users className="h-4 w-4" />
            {waitlist
              ? `${copy.full} · ${occurrence.waitlistCount} ${copy.waiting}`
              : `${occurrence.spotsRemaining} ${occurrence.spotsRemaining === 1 ? copy.spot : copy.spots}`}
          </p>
        </div>
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            disabled={busy}
            className={waitlist ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90"}
          >
            {busy ? copy.saving : actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
}