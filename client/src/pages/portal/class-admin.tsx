import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, RefreshCw, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
import { localizedClassTitle } from "@/lib/class-booking";
import { useToast } from "@/hooks/use-toast";
import { localizeApiError, useLocale } from "@/lib/locale";

export default function ClassAdmin() {
  const { toast } = useToast();
  const { locale, copy } = useLocale();
  const [calendarId, setCalendarId] = useState("");
  const [rosterOccurrence, setRosterOccurrence] = useState<any>(null);
  const [movingReservation, setMovingReservation] = useState<any>(null);
  const [replacementOccurrenceId, setReplacementOccurrenceId] = useState("");
  const [moveReason, setMoveReason] = useState("");
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
       toast({ title: copy.calendarSelected, description: copy.runSyncToImport });
    },
     onError: (error: Error) => toast({ title: copy.calendarCouldNotBeSelected, description: localizeApiError(error.message, locale, copy.calendarCouldNotBeSelected), variant: "destructive" }),
  });
  const sync = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/admin/class-booking/sync", {})).json(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences"] });
       toast({ title: copy.scheduleSynchronized, description: `${result.synced} ${copy.mapped}, ${result.unmapped} ${copy.awaitingReview}.` });
    },
     onError: (error: Error) => toast({ title: copy.synchronizationFailed, description: `${localizeApiError(error.message, locale, copy.synchronizationFailed)} ${copy.lastKnownSchedulePreserved}`, variant: "destructive" }),
  });
  const attendance = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => (await apiRequest("PATCH", `/api/portal/admin/class-booking/reservations/${id}`, { attendance: value })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences", rosterOccurrence?.id, "roster"] }),
  });
  const moveReservation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/portal/admin/class-booking/reservations/${movingReservation.id}/move`, {
      replacementOccurrenceId,
      reason: moveReason,
    })).json(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/class-booking/occurrences", rosterOccurrence?.id, "roster"] });
      toast({
        title: copy.reservationMoved,
        description: result.discoveryExceptionApplied ? copy.discoveryExceptionLimited : copy.replacementReservationCreated,
      });
      setMovingReservation(null);
      setReplacementOccurrenceId("");
      setMoveReason("");
    },
    onError: (error: Error) => toast({ title: copy.reservationMoveFailed, description: localizeApiError(error.message, locale, copy.reservationMoveFailed), variant: "destructive" }),
  });
  const connection = status.data?.connection;
  const syncStateLabel = (state: string) => ({
    synced: copy.syncStateSynced,
    manual: copy.syncStateManual,
    unmapped: copy.syncStateUnmapped,
  } as Record<string, string>)[state] || state;
  const occurrenceStatusLabel = (value: string) => value === "cancelled" || value === "canceled" ? copy.cancelled : value;
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 text-white">
       <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">{copy.operations}</p>
        <h1 className="mt-2 break-words text-2xl font-black uppercase sm:text-3xl">{copy.classBookingControl}</h1>
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#121826] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
             <h2 className="font-bold">{copy.calendarSync}</h2>
             <p className="mt-1 text-sm text-gray-400">{connection?.calendarName || copy.noCalendarSelected}</p>
            <div className="mt-3 flex items-center gap-2">
              {connection?.status === "healthy" ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
              <span className="text-sm text-gray-300">{connection?.status === "healthy" ? copy.connectionHealthy : connection?.status || copy.notConfigured}</span>
               {connection?.lastSuccessfulAt && <span className="text-xs text-gray-500">{copy.lastSuccess} {new Date(connection.lastSuccessfulAt).toLocaleString(locale === "es" ? "es-US" : "en-US")}</span>}
            </div>
            {connection?.lastError && <p className="mt-2 max-w-2xl text-sm text-red-300">{connection.lastError}</p>}
          </div>
          <Button onClick={() => sync.mutate()} disabled={!connection?.calendarId || sync.isPending} className="bg-[#5EEBFF] text-black hover:bg-[#5EEBFF]/90">
             <RefreshCw className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />{copy.syncNowLabel}
           </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
             <Label>{copy.approvedScheduleCalendar}</Label>
            <Select value={calendarId} onValueChange={setCalendarId}>
               <SelectTrigger className="mt-1 border-white/10 bg-black/20"><SelectValue placeholder={copy.chooseConnectedCalendar} /></SelectTrigger>
              <SelectContent>
                {(calendars.data || []).map((calendar) => <SelectItem key={calendar.id} value={calendar.id}>{calendar.summary || calendar.id} · {calendar.accessRole}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
            <Button onClick={() => configure.mutate()} disabled={!calendarId || configure.isPending} className="w-full self-end bg-[#B06CFF] sm:w-auto">{copy.useCalendar}</Button>
        </div>
      </section>
      <section className="mt-8">
         <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{copy.synchronizedOccurrences}</h2><span className="text-sm text-gray-500">{occurrences.data?.length || 0} {copy.currentWindow}</span></div>
        {occurrences.isLoading ? (
          <p className="rounded-2xl border border-white/10 bg-[#121826] p-5 text-sm text-gray-400">{copy.loading}…</p>
        ) : occurrences.isError ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">{copy.loadError}</p>
        ) : (
        <div className="space-y-3">
          {!occurrences.data?.length && (
            <div className="rounded-2xl border border-white/10 bg-[#121826] p-5 text-center">
              <p className="text-sm text-gray-400">{copy.noClasses}</p>
              <p className="mt-1 text-xs text-gray-500">{copy.noClassesDescription}</p>
            </div>
          )}
          {(occurrences.data || []).map((occurrence) => (
            <button type="button" key={occurrence.id} onClick={() => setRosterOccurrence(occurrence)} className="block w-full rounded-2xl border border-white/10 bg-[#121826] p-5 text-left transition-colors hover:border-[#5EEBFF]/40 hover:bg-[#151d2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEBFF]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{localizedClassTitle(occurrence, locale)}</p>
                    <Badge className={occurrence.syncState === "unmapped" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}>{syncStateLabel(occurrence.syncState)}</Badge>
                    {occurrence.status !== "active" && <Badge variant="destructive">{occurrenceStatusLabel(occurrence.status)}</Badge>}
                  </div>
                    <p className="mt-1 text-sm text-gray-400">{classDateLabel(occurrence.start, locale)} · {classTimeLabel(occurrence.start, occurrence.end, locale)} · {copy.confirmed}: {occurrence.confirmedCount || 0} · {copy.waitlisted}: {occurrence.waitlistCount || 0} · {copy.capacity} {occurrence.capacity}</p>
                    <p className="mt-1 text-xs text-gray-500">{occurrence.audienceGroup || "ALL"} · {occurrence.canonicalCategory || "LEGACY"}{occurrence.strengthFocus ? ` · ${occurrence.strengthFocus}` : ""} · Google {occurrence.googleRecurringEventId || occurrence.googleEventId}</p>
                  {occurrence.syncError && <p className="mt-2 text-xs text-amber-300">{occurrence.syncError}</p>}
                </div>
                 <span className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-medium text-white"><Users className="mr-2 h-4 w-4" />{copy.roster}</span>
              </div>
            </button>
          ))}
        </div>
        )}
      </section>
      {rosterOccurrence && (
         <section className="mt-8 rounded-2xl border border-[#5EEBFF]/20 bg-[#121826] p-4 sm:p-6">
             <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold"> {copy.roster} · {localizedClassTitle(rosterOccurrence, locale)}</h2><p className="text-sm text-gray-400">{classDateLabel(rosterOccurrence.start, locale)}</p></div><Button variant="ghost" className="min-h-11" onClick={() => setRosterOccurrence(null)}>{copy.close}</Button></div>
          {roster.isLoading ? (
            <p className="mt-5 text-sm text-gray-400">{copy.loading}…</p>
          ) : roster.isError ? (
            <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{copy.loadError}</p>
          ) : (["confirmed", "waitlisted", "cancelled"] as const).map((group) => (
            <div key={group} className="mt-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">{group === "confirmed" ? copy.confirmed : group === "waitlisted" ? copy.waitlisted : copy.cancelled}</h3>
              {!(roster.data?.[group] || []).length && <p className="border-t border-white/5 py-3 text-sm text-gray-500">{copy.noRosterReservations}</p>}
              {(roster.data?.[group] || []).map((reservation: any) => (
                <div key={reservation.id} className="flex flex-col justify-between gap-3 border-t border-white/5 py-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium">{reservation.minorProfile ? `${reservation.minorProfile.firstName} ${reservation.minorProfile.lastName}` : `${reservation.visitorFirstName} ${reservation.visitorLastName}`}</p>
                    <p className="text-xs text-gray-500">{reservation.visitorEmail}</p>
                  </div>
                    {group === "confirmed" && <Select value={reservation.attendance || ""} onValueChange={(value) => attendance.mutate({ id: reservation.id, value })}><SelectTrigger className="min-h-11 w-36 border-white/10 bg-black/20"><SelectValue placeholder={copy.attendance} /></SelectTrigger><SelectContent>{(["present", "absent", "late", "excused"] as const).map((value) => <SelectItem key={value} value={value}>{copy[value]}</SelectItem>)}</SelectContent></Select>}
                    {group === "cancelled" && reservation.userId && !reservation.moveCompleted && <Button variant="outline" className="min-h-11 border-white/15" onClick={() => { setMovingReservation(reservation); setReplacementOccurrenceId(""); setMoveReason(""); }}>{copy.moveReservation}</Button>}
                    {group === "cancelled" && reservation.moveCompleted && <Badge className="bg-emerald-500/15 text-emerald-300">{copy.reservationMoved}</Badge>}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      {movingReservation && (
        <section className="mt-6 rounded-2xl border border-[#B06CFF]/30 bg-[#121826] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-bold">{copy.moveReservation}</h2><p className="mt-1 text-sm text-gray-400">{movingReservation.visitorFirstName} {movingReservation.visitorLastName}</p></div>
            <Button variant="ghost" onClick={() => setMovingReservation(null)}>{copy.close}</Button>
          </div>
          <div className="mt-5 grid gap-4">
            <div>
              <Label>{copy.replacementOccurrence}</Label>
              <Select value={replacementOccurrenceId} onValueChange={setReplacementOccurrenceId}>
                <SelectTrigger className="mt-1 min-h-11 border-white/10 bg-black/20"><SelectValue placeholder={copy.chooseReplacementOccurrence} /></SelectTrigger>
                <SelectContent>
                  {(occurrences.data || []).filter((occurrence) =>
                    occurrence.id !== rosterOccurrence?.id
                    && occurrence.status === "active"
                    && occurrence.bookingEnabled
                    && occurrence.canonicalCategory === rosterOccurrence?.canonicalCategory
                    && new Date(occurrence.start) > new Date()
                  ).map((occurrence) => <SelectItem key={occurrence.id} value={occurrence.id}>{localizedClassTitle(occurrence, locale)} · {classDateLabel(occurrence.start, locale)} · {classTimeLabel(occurrence.start, occurrence.end, locale)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="move-reason">{copy.moveReason}</Label>
              <Textarea id="move-reason" value={moveReason} onChange={(event) => setMoveReason(event.target.value)} maxLength={240} className="mt-1 border-white/10 bg-black/20" placeholder={copy.moveReasonPlaceholder} />
            </div>
            <Button className="w-full bg-[#B06CFF] sm:w-auto" disabled={!replacementOccurrenceId || moveReason.trim().length < 10 || moveReservation.isPending} onClick={() => moveReservation.mutate()}>{moveReservation.isPending ? copy.loading : copy.confirmMove}</Button>
          </div>
        </section>
      )}
    </main>
  );
}