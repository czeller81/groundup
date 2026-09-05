import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays, ChevronRight, Loader2, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/class-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { classDateLabel, classTimeLabel, localizedClassTitle, type LiveClass } from "@/lib/class-booking";
import { localizeApiError, useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MinorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  consentRevokedAt: string | null;
};

type MinorReservation = {
  id: string;
  status: string;
  waitlistPosition: number | null;
  attendance: string | null;
  attendanceRecordedAt: string | null;
  participant: Pick<MinorProfile, "id" | "firstName" | "lastName" | "consentRevokedAt">;
  occurrence: { id: string; title: string; start: string; end: string; location: string | null };
};

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
  const { toast } = useToast();
  const todayDay = currentDay();
  const [activeDay, setActiveDay] = useState<DayOfWeek>(todayDay);
  const [selectedMinorId, setSelectedMinorId] = useState("");
  const [minorDialogOpen, setMinorDialogOpen] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [editingMinorId, setEditingMinorId] = useState<string | null>(null);
  const [reconsentMinorId, setReconsentMinorId] = useState<string | null>(null);
  const [minorForm, setMinorForm] = useState({
    firstName: "", lastName: "", dateOfBirth: "", emergencyContactName: "",
    emergencyContactPhone: "", emergencyContactRelationship: "", consentSignature: "", consentGiven: false,
  });
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
  const minors = useQuery<MinorProfile[]>({ queryKey: ["/api/portal/minors"] });
  const minorReservations = useQuery<MinorReservation[]>({ queryKey: ["/api/portal/minor-reservations"] });
  const reserve = useMutation({
    mutationFn: async ({ occurrenceId, minorProfileId }: { occurrenceId: string; minorProfileId?: string }) => (
      await apiRequest("POST", "/api/portal/class-reservations", { occurrenceId, minorProfileId })
    ).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/classes"] }),
    onError: (error: Error) => toast({
      title: copy.couldNotBook,
      description: localizeApiError(error.message, locale, copy.couldNotBook),
      variant: "destructive",
    }),
  });
  const createMinor = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/minors", minorForm)).json(),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/minors"] });
      setSelectedMinorId(profile.id);
      setMinorDialogOpen(false);
      setMinorForm({ firstName: "", lastName: "", dateOfBirth: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", consentSignature: "", consentGiven: false });
      toast({ title: copy.minorSaved });
    },
    onError: (error: Error) => toast({
      title: copy.minorSaveError,
      description: localizeApiError(error.message, locale, copy.minorSaveError),
      variant: "destructive",
    }),
  });
  const updateMinor = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", `/api/portal/minors/${editingMinorId}`, {
      firstName: minorForm.firstName,
      lastName: minorForm.lastName,
      dateOfBirth: minorForm.dateOfBirth,
      emergencyContactName: minorForm.emergencyContactName,
      emergencyContactPhone: minorForm.emergencyContactPhone,
      emergencyContactRelationship: minorForm.emergencyContactRelationship,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/minors"] });
      setMinorDialogOpen(false);
      setEditingMinorId(null);
      toast({ title: copy.minorUpdated });
    },
    onError: (error: Error) => toast({
      title: copy.minorSaveError,
      description: localizeApiError(error.message, locale, copy.minorSaveError),
      variant: "destructive",
    }),
  });
  const revokeConsent = useMutation({
    mutationFn: async (minorId: string) => (await apiRequest("POST", `/api/portal/minors/${minorId}/revoke-consent`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/minors"] });
      setSelectedMinorId("");
      toast({ title: copy.consentRevoked });
    },
    onError: (error: Error) => toast({
      title: copy.consentRevokeError,
      description: localizeApiError(error.message, locale, copy.consentRevokeError),
      variant: "destructive",
    }),
  });
  const reconsent = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/portal/minors/${reconsentMinorId}/restore-consent`, {
      consentGiven: minorForm.consentGiven,
      consentSignature: minorForm.consentSignature,
    })).json(),
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/minors"] });
      setSelectedMinorId(profile.id);
      setConsentDialogOpen(false);
      setReconsentMinorId(null);
      setMinorForm({ firstName: "", lastName: "", dateOfBirth: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", consentSignature: "", consentGiven: false });
      toast({ title: copy.consentRestored });
    },
    onError: (error: Error) => toast({
      title: copy.consentRestoreError,
      description: localizeApiError(error.message, locale, copy.consentRestoreError),
      variant: "destructive",
    }),
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
    error: "No se pudo cargar el horario.", couldNotBook: "No se pudo reservar la clase", type: "Tipos de clase", full: "Ver horario completo",
    fullDescription: "Consulta todas las clases en el sitio público.",
    confirmed: "Confirmada", cancelled: "Cancelada",
    minorParticipant: "Participante menor",
    addMinor: "Agregar participante",
    chooseMinor: "Selecciona quién asistirá",
    minorHelp: "Las clases para niñas requieren un perfil de menor con consentimiento de una tutora.",
    minorSaved: "Perfil de participante guardado",
    minorUpdated: "Perfil de participante actualizado",
    minorSaveError: "No se pudo guardar el perfil",
    consentRevoked: "Consentimiento revocado",
    consentRevokeError: "No se pudo revocar el consentimiento",
    consentRestored: "Consentimiento restaurado",
    consentRestoreError: "No se pudo restaurar el consentimiento",
    restoreConsent: "Restaurar consentimiento",
    restoreConsentTitle: "Restaurar consentimiento",
    restoreConsentDescription: "Confirma de nuevo el consentimiento para que esta participante pueda reservar clases.",
    restoreConsentConfirm: "Confirmo que soy la tutora autorizada y vuelvo a dar consentimiento para participar.",
    restoreConsentSave: "Confirmar y restaurar",
    minorFirstName: "Nombre de la menor",
    minorLastName: "Apellido de la menor",
    dateOfBirth: "Fecha de nacimiento",
    emergencyName: "Contacto de emergencia",
    emergencyPhone: "Teléfono de emergencia",
    emergencyRelationship: "Relación",
    guardianSignature: "Firma de madre, padre o tutora",
    consent: "Confirmo que soy la tutora autorizada y doy consentimiento para participar.",
    cancel: "Cancelar",
    saveMinor: "Guardar participante",
    editMinor: "Editar",
    revokeConsent: "Revocar consentimiento",
    consentRevokedStatus: "Consentimiento revocado",
    revokeConfirm: "¿Revocar el consentimiento de esta participante? No podrá reservar nuevas clases.",
    participantHistory: "Reservas de participantes",
    participantHistoryDescription: "Revisa las reservas próximas y anteriores de tus participantes.",
    noParticipantReservations: "Aún no hay reservas de participantes.",
    reservationStatus: "Reserva",
    attendanceOutcome: "Asistencia",
    attendanceNotRecorded: "Sin registro",
    attendancePresent: "Presente",
    attendanceNoShow: "No asistió",
    attendanceLateCancel: "Cancelación tardía",
    attendanceExcused: "Justificada",
  } : {
    title: "ACADEMY SCHEDULE", subtitle: "Weekly program authorized by the academy calendar",
    today: "Today", classes: "classes", browse: "Browse by day", noClasses: "No classes scheduled.",
    book: "Reserve", waitlist: "Join waitlist", notAvailable: "Contact the team",
    notEligible: "Your current plan does not include this class.", loading: "Loading schedule…",
    error: "The schedule could not be loaded.", couldNotBook: "Could not book class", type: "Class types", full: "View full schedule",
    fullDescription: "See every class on the public website.",
    confirmed: "Confirmed", cancelled: "Cancelled",
    minorParticipant: "Minor participant",
    addMinor: "Add participant",
    chooseMinor: "Select who will attend",
    minorHelp: "Girls’ classes require a minor profile with guardian consent.",
    minorSaved: "Participant profile saved",
    minorUpdated: "Participant profile updated",
    minorSaveError: "Could not save participant profile",
    consentRevoked: "Consent revoked",
    consentRevokeError: "Could not revoke consent",
    consentRestored: "Consent restored",
    consentRestoreError: "Could not restore consent",
    restoreConsent: "Restore consent",
    restoreConsentTitle: "Restore consent",
    restoreConsentDescription: "Confirm consent again so this participant can book classes.",
    restoreConsentConfirm: "I confirm that I am the authorized guardian and give consent again for participation.",
    restoreConsentSave: "Confirm and restore",
    minorFirstName: "Participant first name",
    minorLastName: "Participant last name",
    dateOfBirth: "Date of birth",
    emergencyName: "Emergency contact",
    emergencyPhone: "Emergency phone",
    emergencyRelationship: "Relationship",
    guardianSignature: "Guardian signature",
    consent: "I confirm that I am the authorized guardian and consent to participation.",
    cancel: "Cancel",
    saveMinor: "Save participant",
    editMinor: "Edit",
    revokeConsent: "Revoke consent",
    consentRevokedStatus: "Consent revoked",
    revokeConfirm: "Revoke consent for this participant? They will not be able to book new classes.",
    participantHistory: "Participant reservations",
    participantHistoryDescription: "Review upcoming and past reservations for your participants.",
    noParticipantReservations: "No participant reservations yet.",
    reservationStatus: "Reservation",
    attendanceOutcome: "Attendance",
    attendanceNotRecorded: "Not recorded",
    attendancePresent: "Present",
    attendanceNoShow: "No show",
    attendanceLateCancel: "Late cancellation",
    attendanceExcused: "Excused",
  };
  const openNewMinorDialog = () => {
    setEditingMinorId(null);
    setMinorForm({ firstName: "", lastName: "", dateOfBirth: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", consentSignature: "", consentGiven: false });
    setMinorDialogOpen(true);
  };
  const openEditMinorDialog = (minor: MinorProfile) => {
    setEditingMinorId(minor.id);
    setMinorForm({
      firstName: minor.firstName,
      lastName: minor.lastName,
      dateOfBirth: minor.dateOfBirth.slice(0, 10),
      emergencyContactName: minor.emergencyContactName,
      emergencyContactPhone: minor.emergencyContactPhone,
      emergencyContactRelationship: minor.emergencyContactRelationship,
      consentSignature: "",
      consentGiven: true,
    });
    setMinorDialogOpen(true);
  };
  const openReconsentDialog = (minor: MinorProfile) => {
    setReconsentMinorId(minor.id);
    setMinorForm({ firstName: "", lastName: "", dateOfBirth: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", consentSignature: "", consentGiven: false });
    setConsentDialogOpen(true);
  };
  const selectedMinor = (minors.data || []).find((minor) => minor.id === selectedMinorId);
  const actionFor = (item: LiveClass) => {
    if (!item.bookable) return undefined;
    if (item.girlsClass && !selectedMinorId) return copy.chooseMinor;
    if (item.girlsClass && selectedMinor?.consentRevokedAt) return undefined;
    if (!item.girlsClass && item.eligibility && !item.eligibility.eligible) return undefined;
    return item.bookingState === "waitlist" ? copy.waitlist : copy.book;
  };
  const reserveClass = (item: LiveClass) => {
    if (item.girlsClass && !selectedMinorId) {
      setMinorDialogOpen(true);
      return;
    }
    reserve.mutate({ occurrenceId: item.id, minorProfileId: item.girlsClass ? selectedMinorId : undefined });
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
              {(classes.some((item) => item.girlsClass) || (minors.data || []).length > 0 || (minorReservations.data || []).length > 0 || minorReservations.isLoading) && (
                <section className="mb-5 rounded-2xl border border-[#B06CFF]/20 bg-[#121826] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{copy.minorParticipant}</p>
                      <p className="mt-1 max-w-xl text-xs text-gray-400">{copy.minorHelp}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-64">
                      <label className="text-xs text-gray-400">{copy.chooseMinor}</label>
                      <select
                        value={selectedMinorId}
                        onChange={(event) => setSelectedMinorId(event.target.value)}
                        className="h-10 rounded-md border border-white/10 bg-[#0B0F14] px-3 text-sm text-white"
                      >
                        <option value="">{copy.chooseMinor}</option>
                        {(minors.data || []).map((minor) => <option key={minor.id} value={minor.id} disabled={Boolean(minor.consentRevokedAt)}>{minor.firstName} {minor.lastName}{minor.consentRevokedAt ? ` — ${copy.consentRevokedStatus}` : ""}</option>)}
                      </select>
                    </div>
                    <Button variant="outline" className="border-[#B06CFF]/40 text-[#D6B5FF]" onClick={openNewMinorDialog}>
                      <Plus className="mr-2 h-4 w-4" />{copy.addMinor}
                    </Button>
                  </div>
                  {(minors.data || []).length > 0 && <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                    {(minors.data || []).map((minor) => <div key={minor.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0B0F14] px-3 py-2">
                      <span className="text-sm text-gray-200">{minor.firstName} {minor.lastName}{minor.consentRevokedAt && <span className="ml-2 text-xs text-amber-300">{copy.consentRevokedStatus}</span>}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-[#5EEBFF]" onClick={() => openEditMinorDialog(minor)}>{copy.editMinor}</Button>
                        {minor.consentRevokedAt ? <Button variant="ghost" size="sm" className="text-[#5EEBFF]" disabled={reconsent.isPending} onClick={() => openReconsentDialog(minor)}>{copy.restoreConsent}</Button> :
                          <Button variant="ghost" size="sm" className="text-amber-300" disabled={revokeConsent.isPending} onClick={() => window.confirm(copy.revokeConfirm) && revokeConsent.mutate(minor.id)}>{copy.revokeConsent}</Button>}
                      </div>
                    </div>)}
                  </div>}
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-white">{copy.participantHistory}</p>
                      <p className="mt-1 text-xs text-gray-400">{copy.participantHistoryDescription}</p>
                    </div>
                    {minorReservations.isLoading ? <div className="flex items-center gap-2 py-3 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin text-[#5EEBFF]" />{copy.loading}…</div> :
                      minorReservations.error ? <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{copy.error}</p> :
                        minorReservations.data?.length ? <div className="space-y-2">
                          {minorReservations.data.map((reservation) => {
                            const statusLabel = reservation.status === "confirmed" ? copy.confirmed : reservation.status === "waitlisted" ? copy.waitlist : copy.cancelled;
                            const attendanceLabel = reservation.attendance === "PRESENT" ? copy.attendancePresent :
                              reservation.attendance === "NO_SHOW" ? copy.attendanceNoShow :
                                reservation.attendance === "LATE_CANCEL" ? copy.attendanceLateCancel :
                                  reservation.attendance === "EXCUSED" ? copy.attendanceExcused : copy.attendanceNotRecorded;
                            return <div key={reservation.id} className="rounded-lg bg-[#0B0F14] px-3 py-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-100">{reservation.participant.firstName} {reservation.participant.lastName}</p>
                                  <p className="mt-1 break-words text-sm text-gray-300">{reservation.occurrence.title}</p>
                                  <p className="mt-1 text-xs text-gray-500">{classDateLabel(reservation.occurrence.start, locale)} · {reservation.occurrence.location || classTimeLabel(reservation.occurrence.start, reservation.occurrence.end, locale)}</p>
                                </div>
                                {reservation.participant.consentRevokedAt && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">{copy.consentRevokedStatus}</span>}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                <span>{copy.reservationStatus}: <strong className="font-medium text-gray-200">{statusLabel}</strong></span>
                                <span>{copy.attendanceOutcome}: <strong className="font-medium text-gray-200">{attendanceLabel}</strong></span>
                              </div>
                            </div>;
                          })}
                        </div> : <p className="rounded-lg bg-[#0B0F14] p-3 text-sm text-gray-500">{copy.noParticipantReservations}</p>}
                  </div>
                </section>
              )}
              <section className="mb-5 rounded-2xl border border-[#5EEBFF]/15 bg-[#121826] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#5EEBFF]" />
                  <span className="text-sm font-bold uppercase tracking-wider text-[#5EEBFF]">{copy.today} — {DAY_LABEL[todayDay][locale]}</span>
                  <span className="ml-auto text-xs text-gray-600">{todayClasses.length} {copy.classes}</span>
                </div>
                {todayClasses.length ? <div className="space-y-3">{todayClasses.map((item) => <ClassCard key={item.id} occurrence={item} actionLabel={actionFor(item)} busy={reserve.isPending} onAction={() => reserveClass(item)} />)}</div> :
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
                  <ClassCard occurrence={item} actionLabel={actionFor(item)} busy={reserve.isPending} onAction={() => reserveClass(item)} />
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
      <Dialog open={minorDialogOpen} onOpenChange={setMinorDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#121826] text-white">
          <DialogHeader>
            <DialogTitle>{editingMinorId ? copy.editMinor : copy.addMinor}</DialogTitle>
            <DialogDescription className="text-gray-400">{copy.minorHelp}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="minor-first-name">{copy.minorFirstName}</Label><Input id="minor-first-name" value={minorForm.firstName} onChange={(event) => setMinorForm({ ...minorForm, firstName: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <div className="space-y-2"><Label htmlFor="minor-last-name">{copy.minorLastName}</Label><Input id="minor-last-name" value={minorForm.lastName} onChange={(event) => setMinorForm({ ...minorForm, lastName: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <div className="space-y-2"><Label htmlFor="minor-dob">{copy.dateOfBirth}</Label><Input id="minor-dob" type="date" value={minorForm.dateOfBirth} onChange={(event) => setMinorForm({ ...minorForm, dateOfBirth: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <div className="space-y-2"><Label htmlFor="minor-emergency-name">{copy.emergencyName}</Label><Input id="minor-emergency-name" value={minorForm.emergencyContactName} onChange={(event) => setMinorForm({ ...minorForm, emergencyContactName: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <div className="space-y-2"><Label htmlFor="minor-emergency-phone">{copy.emergencyPhone}</Label><Input id="minor-emergency-phone" type="tel" value={minorForm.emergencyContactPhone} onChange={(event) => setMinorForm({ ...minorForm, emergencyContactPhone: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <div className="space-y-2"><Label htmlFor="minor-emergency-relationship">{copy.emergencyRelationship}</Label><Input id="minor-emergency-relationship" value={minorForm.emergencyContactRelationship} onChange={(event) => setMinorForm({ ...minorForm, emergencyContactRelationship: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            {!editingMinorId && <><div className="space-y-2 sm:col-span-2"><Label htmlFor="minor-signature">{copy.guardianSignature}</Label><Input id="minor-signature" value={minorForm.consentSignature} onChange={(event) => setMinorForm({ ...minorForm, consentSignature: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" /></div>
            <label className="flex items-start gap-3 text-sm text-gray-300 sm:col-span-2"><input type="checkbox" checked={minorForm.consentGiven} onChange={(event) => setMinorForm({ ...minorForm, consentGiven: event.target.checked })} className="mt-1 h-4 w-4 accent-[#B06CFF]" />{copy.consent}</label></>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMinorDialogOpen(false)}>{copy.cancel}</Button>
            <Button onClick={() => editingMinorId ? updateMinor.mutate() : createMinor.mutate()} disabled={createMinor.isPending || updateMinor.isPending || !minorForm.firstName || !minorForm.lastName || !minorForm.dateOfBirth || !minorForm.emergencyContactName || !minorForm.emergencyContactPhone || !minorForm.emergencyContactRelationship || (!editingMinorId && (!minorForm.consentGiven || !minorForm.consentSignature))} className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90">
              {(createMinor.isPending || updateMinor.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{copy.saveMinor}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent className="border-white/10 bg-[#121826] text-white">
          <DialogHeader>
            <DialogTitle>{copy.restoreConsentTitle}</DialogTitle>
            <DialogDescription className="text-gray-400">{copy.restoreConsentDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renewed-minor-signature">{copy.guardianSignature}</Label>
              <Input id="renewed-minor-signature" value={minorForm.consentSignature} onChange={(event) => setMinorForm({ ...minorForm, consentSignature: event.target.value })} className="border-white/10 bg-[#0B0F14] text-white" />
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-300">
              <input type="checkbox" checked={minorForm.consentGiven} onChange={(event) => setMinorForm({ ...minorForm, consentGiven: event.target.checked })} className="mt-1 h-4 w-4 accent-[#B06CFF]" />
              {copy.restoreConsentConfirm}
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConsentDialogOpen(false)}>{copy.cancel}</Button>
            <Button onClick={() => reconsent.mutate()} disabled={reconsent.isPending || !minorForm.consentGiven || !minorForm.consentSignature.trim()} className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90">
              {reconsent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{copy.restoreConsentSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}