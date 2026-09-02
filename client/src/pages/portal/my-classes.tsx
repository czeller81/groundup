import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useLocale } from "@/lib/locale";
import { usePortalAuth } from "@/lib/portal-auth";

export default function MyClasses() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { locale, copy } = useLocale();
  const { toast } = useToast();
  const { data = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ["/api/portal/my-classes"],
    enabled: isAuthenticated,
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/portal/class-reservations/${id}/cancel`, {})).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] });
      toast({ title: locale === "es" ? "Reserva cancelada" : "Reservation cancelled" });
    },
    onError: (error: Error) => toast({ title: "Could not cancel", description: error.message, variant: "destructive" }),
  });
  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/portal/login");
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || (isAuthenticated && isLoading)) {
    return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#0B0F14]"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></main>;
  }
  if (!isAuthenticated) return null;

  const active = data.filter((item) => ["confirmed", "waitlisted"].includes(item.status));
  const history = data.filter((item) => !["confirmed", "waitlisted"].includes(item.status));
  const statusLabel = (status: string) => status === "confirmed" ? (locale === "es" ? "Confirmada" : "Confirmed") : status === "waitlisted" ? copy.waitlisted : copy.cancelled;
  const section = (title: string, items: any[]) => (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-[#121826] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-white">{item.occurrence.title}</p>
                <p className="mt-1 text-sm text-gray-400">{classDateLabel(item.occurrence.start, locale)} · {classTimeLabel(item.occurrence.start, item.occurrence.end, locale)}</p>
                <p className={`mt-2 text-sm font-semibold ${item.status === "confirmed" ? "text-emerald-300" : item.status === "waitlisted" ? "text-amber-300" : "text-gray-500"}`}>
                  {item.status === "waitlisted" ? `${copy.waitlistPosition} ${item.waitlistPosition}` : statusLabel(item.status)}
                </p>
              </div>
              {["confirmed", "waitlisted"].includes(item.status) && <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(item.id)} className="border-red-500/30 text-red-300">Cancel</Button>}
            </div>
          </article>
        )) : <p className="rounded-2xl border border-white/10 bg-[#121826] p-6 text-gray-500">{locale === "es" ? "Todavía no hay nada aquí." : "Nothing here yet."}</p>}
      </div>
    </section>
  );
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-4 py-8 sm:py-10">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#B06CFF]">{locale === "es" ? "Tus reservas" : "Your reservations"}</p>
      <h1 className="mt-3 text-3xl font-black uppercase text-white sm:text-4xl">{copy.myClasses}</h1>
      <p className="mt-3 text-gray-400">{locale === "es" ? "Aquí ves las clases que reservaste y tu historial." : "See the classes you booked and your training history."}</p>
      {isError ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
            <div>
              <p className="font-semibold text-red-200">{copy.loadError}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 border-red-400/30 text-red-200 hover:bg-red-400/10"><RefreshCw className="mr-2 h-3.5 w-3.5" />{locale === "es" ? "Intentar de nuevo" : "Try again"}</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {section(`${copy.upcoming} & ${copy.waitlisted.toLowerCase()}`, active)}
          {section(copy.history, history)}
          {!data.length && <div className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-8 text-center"><p className="text-gray-300">{copy.noUpcomingClasses}</p><p className="mt-2 text-sm text-gray-500">{copy.noUpcomingClassesDescription}</p><Button asChild className="mt-5 bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90"><Link href="/portal/schedule">{copy.viewSchedule}</Link></Button></div>}
        </>
      )}
    </main>
  );
}