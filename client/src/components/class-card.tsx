import { CalendarDays, Clock, MapPin, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LiveClass } from "@/lib/class-booking";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";

export function ClassCard({
  occurrence,
  actionLabel,
  onAction,
  busy,
}: {
  occurrence: LiveClass;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  const waitlist = occurrence.bookingState === "waitlist";
  return (
    <article className="rounded-2xl border border-white/10 bg-[#121826] p-5 shadow-lg shadow-black/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-[#5EEBFF]/25 bg-[#5EEBFF]/10 text-[#5EEBFF]">
              <CalendarDays className="mr-1 h-3 w-3" />
              {classDateLabel(occurrence.start)}
            </Badge>
            {occurrence.classType?.beginnerFriendly && (
              <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-300">Beginner friendly</Badge>
            )}
          </div>
          <h2 className="text-lg font-bold text-white">{occurrence.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{classTimeLabel(occurrence.start, occurrence.end)}</span>
            {occurrence.instructorName && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{occurrence.instructorName}</span>}
            {occurrence.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{occurrence.location}</span>}
          </div>
          <p className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${waitlist ? "text-amber-300" : "text-emerald-300"}`}>
            <Users className="h-4 w-4" />
            {waitlist ? `Class full · ${occurrence.waitlistCount} waiting` : `${occurrence.spotsRemaining} spot${occurrence.spotsRemaining === 1 ? "" : "s"} left`}
          </p>
        </div>
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            disabled={busy}
            className={waitlist ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90"}
          >
            {busy ? "Saving…" : actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
}