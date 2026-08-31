import { useMemo, useState } from "react";
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

export default function FirstVisitBooking() {
  const search = useSearch();
  const selectedId = useMemo(() => new URLSearchParams(search).get("occurrence"), [search]);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", phone: "", experience: "" });
  const [confirmation, setConfirmation] = useState<any>(null);
  const { data, isLoading } = useQuery<ClassScheduleResponse>({
    queryKey: ["/api/classes?firstVisit=true"],
  });
  const selected = data?.occurrences.find((item) => item.id === selectedId) || data?.occurrences[0];
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
          <h1 className="text-3xl font-black">{confirmation.reservation.status === "waitlisted" ? "You're on the waitlist" : "Your spot is confirmed"}</h1>
          <p className="mt-3 text-gray-400">We sent an accurate status update to {details.email}. Keep this browser to manage the reservation.</p>
          <Button asChild className="mt-6 bg-[#B06CFF]"><Link href="/schedule">Back to schedule</Link></Button>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 pb-20 pt-28 text-white">
      <SEO title="Book Your First Class | Ground Up" description="Reserve an eligible first class with live availability." canonical="/book" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFB199]">No account or credit card required</p>
          <h1 className="mt-3 text-4xl font-black uppercase">Reserve your first visit</h1>
        </div>
        {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#5EEBFF]" /> : !selected ? (
          <div className="rounded-2xl border border-white/10 bg-[#121826] p-8 text-center">
            <p className="text-gray-300">No first-visit classes are currently available.</p>
            <Button asChild variant="outline" className="mt-4 border-white/15 text-white"><Link href="/schedule">View schedule</Link></Button>
          </div>
        ) : (
          <>
            <ClassCard occurrence={selected} />
            <form className="mt-5 rounded-2xl border border-white/10 bg-[#121826] p-6" onSubmit={(event) => { event.preventDefault(); reserve.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["firstName", "lastName", "email", "phone"] as const).map((field) => (
                  <div key={field}>
                    <Label htmlFor={field} className="text-gray-300">{({ firstName: "First name", lastName: "Last name", email: "Email", phone: "Phone" } as const)[field]}</Label>
                    <Input id={field} required type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={details[field]} onChange={(event) => setDetails({ ...details, [field]: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Label htmlFor="experience" className="text-gray-300">Training experience (optional)</Label>
                <Input id="experience" value={details.experience} onChange={(event) => setDetails({ ...details, experience: event.target.value })} className="mt-1 border-white/10 bg-black/20 text-white" placeholder="New to jiu-jitsu, some experience, etc." />
              </div>
              {reserve.error && <p className="mt-4 text-sm text-red-300">{(reserve.error as Error).message}</p>}
              <Button type="submit" disabled={reserve.isPending} className="mt-6 w-full bg-[#FFB199] font-bold text-black hover:bg-[#FFB199]/90">
                {reserve.isPending ? "Reserving…" : selected.bookingState === "waitlist" ? "Join waitlist" : "Confirm free first visit"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}