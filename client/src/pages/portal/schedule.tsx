import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays, ChevronRight, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/class-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { classDateLabel, localizedClassTitle, type LiveClass } from "@/lib/class-booking";
import { useLocale } from "@/lib/locale";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT: Record<DayOfWeek, { en: string; es: string }> = {
  Monday: { en: "Mon", es: "Lun" }, Tuesday: { en: "Tue", es: "Mar" }, Wednesday: { en: "Wed", es: "Mié" },
  Thursday: { en: "Thu", es: "Jue" }, Friday: { en: "Fri", es: "Vie" }, Saturday: { en: "Sat", es: "Sáb" },
  Sunday: { en: "Sun", es: "Dom" },
};
const DAY_LABEL: Record<DayOfWeek, { en: string; es: string }> = {
  Monday: { en: "Monday", es: "Lunes" }, Tuesday: { en: "Tuesday", es: "Martes" }, Wednesday: { en: "Wednesday", es: "Miércoles" },
  Thursday: { en: "Thursday", es: "Jueves" }, Friday: { en: "Friday", es: "Viernes" }, Saturday: { en: "Saturday", es: "Sábado" },
  Sunday: { en: "Sunday", es: "Domingo" },
};

function dayForOccurrence(value: string): DayOfWeek {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "long" }).format(new Date(value)) as DayOfWeek;
}

function currentDay(): DayOfWeek {
  return dayForOccurrence(new Date().toISOString());
}

export default function PortalSchedule() {
  const { locale } = useLocale();
  const todayDay = currentDay();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);
  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 90);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);
  const schedule = useQuery<LiveClass[]>({
    queryKey: [`/api/portal/classes?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`],
  });
  const reserve = useMutation({
    mutationFn: async (occurrenceId: string) => (await apiRequest("POST", "/api/portal/class-reservations", { occurrenceId })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] }),
  });
  const classes = schedule.data || [];
  const classesForDay = (day: DayOfWeek) => classes.filter((item) => dayForOccurrence(item.start) === day);
  const todayClasses = classesForDay(todayDay);
  const selectedClasses = classesForDay(activeDay);
  const copy = locale === "es" ? {
    title: "HORARIO DE LA ACADEMIA", subtitle: "Programa semanal autorizado por el calendario de la academia",
    today: "Hoy", classes: "clases", browse: "Ver por día", noClasses: "No hay clases programadas.",
    book: "Reservar", waitlist: "Unirse a lista de espera", notAvailable: "Consulta al equipo",
    notEligible: "Tu plan actual no incluye esta clase.", loading: "Cargando horario…",
    error: "No se pudo cargar el horario.", type: "Tipos de clase", full: "Ver horario completo",
    fullDescription: "Consulta todas las clases en el sitio público.",
  } : {
    title: "ACADEMY SCHEDULE", subtitle: "Weekly program authorized by the academy calendar",
    today: "Today", classes: "classes", browse: "Browse by day", noClasses: "No classes scheduled.",
    book: "Reserve", waitlist: "Join waitlist", notAvailable: "Contact the team",
    notEligible: "Your current plan does not include this class.", loading: "Loading schedule…",
    error: "The schedule could not be loaded.", type: "Class types", full: "View full schedule",
    fullDescription: "See every class on the public website.",
  };
  const actionFor = (item: LiveClass) => {
    if (!item.bookable) return undefined;
    if (item.eligibility && !item.eligibility.eligible) return undefined;
    return item.bookingState === "waitlist" ? copy.waitlist : copy.book;
  };

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <div className="border-b border-white/5 bg-[#121826]/50 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold text-white">{copy.title}</h1>
          <p className="text-sm text-gray-400">{copy.subtitle}</p>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-4">
        {schedule.isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></div> :
          schedule.error ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">{copy.error}</p> : (
            <>
              <section className="mb-5 rounded-2xl border border-[#5EEBFF]/15 bg-[#121826] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#5EEBFF]" />
                  <span className="text-sm font-bold uppercase tracking-wider text-[#5EEBFF]">{copy.today} — {DAY_LABEL[todayDay][locale]}</span>
                  <span className="ml-auto text-xs text-gray-600">{todayClasses.length} {copy.classes}</span>
                </div>
                {todayClasses.length ? <div className="space-y-3">{todayClasses.map((item) => <ClassCard key={item.id} occurrence={item} actionLabel={actionFor(item)} busy={reserve.isPending} onAction={() => reserve.mutate(item.id)} />)}</div> :
                  <p className="py-3 text-center text-sm text-gray-500">{copy.noClasses}</p>}
              </section>
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">{copy.browse}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {DAYS.map((day) => {
                    const active = day === activeDay;
                    return <button key={day} onClick={() => setActiveDay(day)} className={`relative flex min-h-14 flex-shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-semibold ${active ? "bg-[#B06CFF] text-white" : "border border-white/5 bg-[#121826] text-gray-400"}`}>
                      {day === todayDay && !active && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#5EEBFF]" />}
                      <span className="uppercase tracking-wide">{DAY_SHORT[day][locale]}</span><span className={active ? "text-white/60" : "text-gray-600"}>{classesForDay(day).length}</span>
                    </button>;
                  })}
                </div>
              </div>
              <section className="rounded-2xl border border-white/5 bg-[#121826] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-white">{DAY_LABEL[activeDay][locale]} <span className="text-sm font-normal text-gray-500">— {selectedClasses.length} {copy.classes}</span></h2>
                  {activeDay === todayDay && <span className="rounded-full border border-[#5EEBFF]/20 bg-[#5EEBFF]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#5EEBFF]">{copy.today}</span>}
                </div>
                {selectedClasses.length ? <div className="space-y-3">{selectedClasses.map((item) => <div key={item.id}>
                  <ClassCard occurrence={item} actionLabel={actionFor(item)} busy={reserve.isPending} onAction={() => reserve.mutate(item.id)} />
                  {item.bookable && item.eligibility && !item.eligibility.eligible && <p className="mt-1 px-2 text-xs text-amber-300">{item.eligibility.message || copy.notEligible}</p>}
                </div>)}</div> :
                  <div className="py-10 text-center text-gray-600"><CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-30" /><p className="text-sm">{copy.noClasses}</p></div>}
              </section>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/5 bg-gradient-to-r from-[#B06CFF]/10 to-[#5EEBFF]/10 p-4">
                <div><p className="text-sm font-semibold text-white">{copy.full}</p><p className="text-xs text-gray-500">{copy.fullDescription}</p></div>
                <Button asChild variant="ghost" size="sm" className="text-[#5EEBFF]"><Link href="/schedule"><ChevronRight className="mr-1 h-3.5 w-3.5" /></Link></Button>
              </div>
            </>
          )}
      </main>
    </div>
  );
}