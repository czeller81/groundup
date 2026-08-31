import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ClassCard } from "@/components/class-card";
import type { LiveClass } from "@/lib/class-booking";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PortalClasses() {
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery<LiveClass[]>({ queryKey: ["/api/portal/classes"] });
  const reserve = useMutation({
    mutationFn: async (occurrenceId: string) => (await apiRequest("POST", "/api/portal/class-reservations", { occurrenceId })).json(),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/my-classes"] });
      toast({ title: reservation.status === "waitlisted" ? "Added to waitlist" : "Class booked", description: reservation.status === "waitlisted" ? "We'll email you if a spot opens." : "Your spot is confirmed." });
    },
    onError: (error: Error) => toast({ title: "Could not book class", description: error.message, variant: "destructive" }),
  });
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">Pacific time · Live availability</p>
      <h1 className="mt-2 text-3xl font-black uppercase">Book a class</h1>
      <p className="mt-2 text-gray-400">Ground Up—not Google attendees—owns your reservation and waitlist status.</p>
      {isLoading ? <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-[#5EEBFF]" /> : (
        <div className="mt-8 space-y-4">
          {data.length ? data.map((occurrence) => (
            <ClassCard key={occurrence.id} occurrence={occurrence} actionLabel={occurrence.bookingState === "waitlist" ? "Join waitlist" : "Book class"} busy={reserve.isPending && reserve.variables === occurrence.id} onAction={() => reserve.mutate(occurrence.id)} />
          )) : <div className="rounded-2xl border border-white/10 bg-[#121826] p-8 text-center text-gray-400">No bookable classes are currently listed.</div>}
        </div>
      )}
    </main>
  );
}