import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/class-card";
import type { ClassScheduleResponse } from "@/lib/class-booking";
import SEO from "@/components/seo";

export default function LiveSchedule() {
  const { data, isLoading, error } = useQuery<ClassScheduleResponse>({
    queryKey: ["/api/classes"],
  });
  return (
    <div className="min-h-screen bg-[#0B0F14] px-4 pb-20 pt-28 text-white">
      <SEO
        title="Live Class Schedule | Ground Up Jiu-Jitsu & Fitness"
        description="See upcoming Ground Up classes, live availability, and waitlist status in Pacific time."
        canonical="/schedule"
      />
      <main className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">Live schedule · Pacific time</p>
          <h1 className="text-4xl font-black uppercase sm:text-5xl">Choose your next class</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">Dates, times, availability, and cancellations are synchronized from the academy calendar.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200"><AlertCircle className="mr-2 inline h-5 w-5" />The live schedule could not be loaded.</div>
        ) : !data?.sync.configured ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
            <AlertCircle className="mr-2 inline h-5 w-5" />Online class booking is being configured. No live availability is being claimed yet.
          </div>
        ) : data.occurrences.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121826] p-10 text-center text-gray-400"><CalendarDays className="mx-auto mb-3 h-9 w-9" />No bookable classes are currently listed.</div>
        ) : (
          <div className="space-y-4">
            {data.occurrences.map((occurrence) => (
              <ClassCard
                key={occurrence.id}
                occurrence={occurrence}
                actionLabel={occurrence.firstVisitEligible ? (occurrence.bookingState === "waitlist" ? "Join waitlist" : "Book first visit") : "Member booking"}
                onAction={() => { window.location.href = occurrence.firstVisitEligible ? `/book?occurrence=${occurrence.id}` : "/portal/booking"; }}
              />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="border-white/15 bg-transparent text-white"><Link href="/portal/login">Member login</Link></Button>
        </div>
      </main>
    </div>
  );
}