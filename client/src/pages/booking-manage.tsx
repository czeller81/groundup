import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";

export default function BookingManage() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const reservationId = params.get("id") || "";
  const manageToken = params.get("manageToken") || "";
  const queryKey = [`/api/classes/reservations/${reservationId}/manage?manageToken=${encodeURIComponent(manageToken)}`];
  const query = useQuery<any>({
    queryKey,
    enabled: Boolean(reservationId && manageToken),
  });
  const cancel = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/classes/reservations/${reservationId}/cancel`, { manageToken })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: locale === "es" ? "Reserva cancelada" : "Reservation cancelled" });
    },
    onError: () => toast({
      title: locale === "es" ? "No se pudo cancelar" : "Could not cancel reservation",
      variant: "destructive",
    }),
  });

  if (query.isLoading) return <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] text-white"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></main>;
  if (query.isError || !query.data) return <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-4 text-white"><div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center"><AlertCircle className="mx-auto mb-3 text-red-300" /><p>{locale === "es" ? "Este enlace de reserva no es válido o ya no está disponible." : "This reservation link is invalid or no longer available."}</p></div></main>;

  const { reservation, occurrence, operations } = query.data;
  const spanish = locale === "es";
  const date = new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", {
    timeZone: operations.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(occurrence.start));
  const active = ["confirmed", "waitlisted"].includes(reservation.status);

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#121826] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">{spanish ? "Ground Up · Reserva" : "Ground Up · Reservation"}</p>
        <h1 className="mt-3 text-3xl font-black">{reservation.status === "waitlisted" ? (spanish ? "Estás en la lista de espera" : "You’re on the waitlist") : spanish ? "Tu reserva" : "Your reservation"}</h1>
        <h2 className="mt-6 text-xl font-bold">{occurrence.title}</h2>
        <p className="mt-2 text-gray-300">{date}</p>
        <p className="mt-1 text-sm text-gray-400">{operations.address}</p>
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 p-4 text-sm text-gray-300">
          <p>{operations.guidance.arrival}</p>
          <p>{operations.guidance.whatToBring}</p>
          <p className="text-amber-200">{operations.cancellationPolicy}</p>
        </div>
        {reservation.waitlistPosition && <p className="mt-5 text-amber-200">{spanish ? "Posición en lista de espera" : "Waitlist position"}: {reservation.waitlistPosition}</p>}
        {active && <Button className="mt-6 w-full bg-red-600 text-white hover:bg-red-700" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{spanish ? "Cancelar reserva" : "Cancel reservation"}</Button>}
        {!active && <p className="mt-6 text-sm text-gray-400">{spanish ? "Esta reserva ya está cerrada." : "This reservation is already closed."}</p>}
      </div>
    </main>
  );
}