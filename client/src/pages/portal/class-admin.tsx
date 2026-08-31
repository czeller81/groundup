import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, RefreshCw, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
import { useToast } from "@/hooks/use-toast";

export default function ClassAdmin() {
  const { toast } = useToast();
  const [calendarId, setCalendarId] = useState("");
  const [rosterOccurrence, setRosterOccurrence] = useState<any>(null);
  const status = useQuery<any>({ queryKey: ["/api/portal/admin/class-booking/status"] });
  const calendars = useQuery<any[]>({ queryKey: ["/api/portal/admin/class-booking/calendars"] });
  const occurrences = useQuery<any[]>({ queryKey: ["/api/portal/admin/class-booking/occurrences"] });
  const roster = useQuery<any>({
    queryKey: ["/api/portal/admin/class-booking/occurrences", rosterOccurrence?.id, "roster"],
    enabled: Boolean(rosterOccurrence),
  });
  const configure = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/portal/admin/class-booking/calendar", { calendarId })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/status"] });
      toast({ title: "Calendar selected", description: "Run synchronization to import its class occurrences." });
    },
    onError: (error: Error) => toast({ title: "Calendar could not be selected", description: error.message, variant: "destructive" }),
  });
  const sync = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/admin/class-booking/sync", {})).json(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences"] });
      toast({ title: "Schedule synchronized", description: `${result.synced} mapped, ${result.unmapped} awaiting review.` });
    },
    onError: (error: Error) => toast({ title: "Synchronization failed", description: `${error.message} Last-known-good schedule data was preserved.`, variant: "destructive" }),
  });
  const attendance = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => (await apiRequest("PATCH", `/api/portal/admin/class-booking/reservations/${id}`, { attendance: value })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences", rosterOccurrence?.id, "roster"] }),
  });
  const connection = status.data?.connection;
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">Operations</p>
      <h1 className="mt-2 text-3xl font-black uppercase">Class Booking Control</h1>
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold">Google Calendar synchronization</h2>
            <p className="mt-1 text-sm text-gray-400">{connection?.calendarName || "No approved calendar selected"}</p>
            <div className="mt-3 flex items-center gap-2">
              {connection?.status === "healthy" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
              <span className="text-sm text-gray-300">{connection?.status || "not configured"}</span>
              {connection?.lastSuccessfulAt && <span className="text-xs text-gray-500">Last success {new Date(connection.lastSuccessfulAt).toLocaleString()}</span>}
            </div>
            {connection?.lastError && <p className="mt-2 max-w-2xl text-sm text-red-300">{connection.lastError}</p>}
          </div>
          <Button onClick={() => sync.mutate()} disabled={!connection?.calendarId || sync.isPending} className="bg-[#5EEBFF] text-black hover:bg-[#5EEBFF]/90">
            <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />Sync now
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Approved schedule calendar</Label>
            <Select value={calendarId} onValueChange={setCalendarId}>
              <SelectTrigger className="mt-1 border-white/10 bg-black/20"><SelectValue placeholder="Choose a connected calendar" /></SelectTrigger>
              <SelectContent>
                {(calendars.data || []).map((calendar) => <SelectItem key={calendar.id} value={calendar.id}>{calendar.summary || calendar.id} · {calendar.accessRole}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => configure.mutate()} disabled={!calendarId || configure.isPending} className="self-end bg-[#B06CFF]">Use calendar</Button>
        </div>
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Synchronized occurrences</h2><span className="text-sm text-gray-500">{occurrences.data?.length || 0} in current window</span></div>
        <div className="space-y-3">
          {(occurrences.data || []).map((occurrence) => (
            <article key={occurrence.id} className="rounded-2xl border border-white/10 bg-[#121826] p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{occurrence.title}</p>
                    <Badge className={occurrence.syncState === "unmapped" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>{occurrence.syncState}</Badge>
                    {occurrence.status !== "active" && <Badge variant="destructive">{occurrence.status}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{classDateLabel(occurrence.start)} · {classTimeLabel(occurrence.start, occurrence.end)} · capacity {occurrence.capacity}</p>
                  {occurrence.syncError && <p className="mt-2 text-xs text-amber-300">{occurrence.syncError}</p>}
                </div>
                <Button variant="outline" onClick={() => setRosterOccurrence(occurrence)} className="border-white/15 text-white"><Users className="mr-2 h-4 w-4" />Roster</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {rosterOccurrence && (
        <section className="mt-8 rounded-2xl border border-[#5EEBFF]/20 bg-[#121826] p-6">
          <div className="flex justify-between"><div><h2 className="font-bold">Roster · {rosterOccurrence.title}</h2><p className="text-sm text-gray-400">{classDateLabel(rosterOccurrence.start)}</p></div><Button variant="ghost" onClick={() => setRosterOccurrence(null)}>Close</Button></div>
          {(["confirmed", "waitlisted"] as const).map((group) => (
            <div key={group} className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">{group}</h3>
              {(roster.data?.[group] || []).map((reservation: any) => (
                <div key={reservation.id} className="flex flex-col justify-between gap-3 border-t border-white/5 py-3 sm:flex-row sm:items-center">
                  <div><p className="text-sm font-medium">{reservation.visitorFirstName} {reservation.visitorLastName}</p><p className="text-xs text-gray-500">{reservation.visitorEmail}</p></div>
                  {group === "confirmed" && <Select value={reservation.attendance || ""} onValueChange={(value) => attendance.mutate({ id: reservation.id, value })}><SelectTrigger className="w-36 border-white/10 bg-black/20"><SelectValue placeholder="Attendance" /></SelectTrigger><SelectContent>{["present", "absent", "late", "excused"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}