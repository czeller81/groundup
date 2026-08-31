import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
import { useToast } from "@/hooks/use-toast";

export default function MyClasses() {
  const { toast } = useToast();
  const { data = [] } = useQuery<any[]>({ queryKey: ["/api/portal/my-classes"] });
  const cancel = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/portal/class-reservations/${id}/cancel`, {})).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] });
      toast({ title: "Reservation cancelled" });
    },
    onError: (error: Error) => toast({ title: "Could not cancel", description: error.message, variant: "destructive" }),
  });
  const active = data.filter((item) => ["confirmed", "waitlisted"].includes(item.status));
  const history = data.filter((item) => !["confirmed", "waitlisted"].includes(item.status));
  const section = (title: string, items: any[]) => (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h2>
      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-[#121826] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-white">{item.occurrence.title}</p>
                <p className="mt-1 text-sm text-gray-400">{classDateLabel(item.occurrence.start)} · {classTimeLabel(item.occurrence.start, item.occurrence.end)}</p>
                <p className={`mt-2 text-sm font-semibold ${item.status === "confirmed" ? "text-emerald-300" : item.status === "waitlisted" ? "text-amber-300" : "text-gray-500"}`}>
                  {item.status === "waitlisted" ? `Waitlist position ${item.waitlistPosition}` : item.status}
                </p>
              </div>
              {["confirmed", "waitlisted"].includes(item.status) && <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(item.id)} className="border-red-500/30 text-red-300">Cancel</Button>}
            </div>
          </article>
        )) : <p className="rounded-2xl border border-white/10 bg-[#121826] p-6 text-gray-500">Nothing here yet.</p>}
      </div>
    </section>
  );
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#B06CFF]">Booking history</p>
      <h1 className="mt-2 text-3xl font-black uppercase text-white">My Classes</h1>
      {section("Upcoming & waitlisted", active)}
      {section("History", history)}
    </main>
  );
}