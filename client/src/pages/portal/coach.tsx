import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePortalAuth } from "@/lib/portal-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, ArrowLeft, ChevronRight, Loader2, StickyNote, Award, Hash, 
  Mail, Phone, Calendar
} from "lucide-react";
import { useLocale } from "@/lib/locale";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { localizedClassTitle } from "@/lib/class-booking";

export default function PortalCoach() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isCoach, isStaff } = usePortalAuth();
  const { toast } = useToast();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [quickViewMemberId, setQuickViewMemberId] = useState<string | null>(null);

  const { data: todaysClasses = [], isLoading: todaysClassesLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/coach/classes/today"],
    enabled: isAuthenticated && isStaff,
  });

  const selectedClass = todaysClasses.find((item) => item.id === selectedClassId) || todaysClasses[0];
  const quickView = useQuery<any>({
    queryKey: ["/api/portal/coach/members", quickViewMemberId, "program"],
    queryFn: async () => (await fetch(`/api/portal/coach/members/${quickViewMemberId}/program`)).json(),
    enabled: Boolean(quickViewMemberId) && isAuthenticated && isStaff,
  });

  const rosterAttendanceMutation = useMutation({
    mutationFn: async ({ id, attendance }: { id: string; attendance: string }) => {
      const existing = selectedClass?.roster?.find((reservation: any) => reservation.id === id);
      const reason = existing?.attendance ? window.prompt(copy.attendanceCorrectionReason) : undefined;
      if (existing?.attendance && !reason?.trim()) throw new Error(copy.attendanceCorrectionReason);
      return (await apiRequest("PATCH", `/api/portal/admin/class-booking/reservations/${id}/attendance`, { attendance, reason })).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/coach/classes/today"] });
      toast({ title: copy.attendanceUpdated });
    },
    onError: (error: Error) => toast({ title: copy.error, description: error.message, variant: "destructive" }),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/coach/members"],
    enabled: isAuthenticated && isStaff,
  });

  const { data: sessionNotes = [], isLoading: notesLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/session-notes", selectedMemberId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/session-notes/${selectedMemberId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedMemberId && isAuthenticated && isStaff,
  });

  const selectedMember = members.find((m: any) => m.id === selectedMemberId);

  const sessionNoteMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/portal/session-notes/${userId}`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/session-notes", selectedMemberId] });
      setNewNote("");
       toast({ title: copy.sessionNoteAdded });
    },
  });

  const beltMutation = useMutation({
    mutationFn: async ({ userId, beltRank }: { userId: string; beltRank: string }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/belt`, { beltRank });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/coach/members"] });
       toast({ title: copy.beltUpdated });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ userId, attendanceCount }: { userId: string; attendanceCount: number }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/attendance`, { attendanceCount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/coach/members"] });
       toast({ title: copy.attendanceUpdated });
    },
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isStaff)) {
      setLocation(portalPath("/portal/dashboard"));
    }
  }, [authLoading, isAuthenticated, isStaff, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" />
      </div>
    );
  }

  if (!isAuthenticated || !isStaff) {
    return null;
  }

  const filteredMembers = members.filter((m: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.firstName?.toLowerCase().includes(q) ||
      m.lastName?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
             {copy.coachCenter}
          </h1>
          <p className="text-sm text-gray-400">{copy.coachSubtitle}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Card className="mb-6 border-[#5EEBFF]/20 bg-[#121826]" data-testid="coach-todays-classes">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Calendar className="h-5 w-5 text-[#5EEBFF]" />{copy.todaysClasses}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(220px,0.75fr)_1.5fr]">
            <div className="space-y-2">
              {todaysClassesLoading ? <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-[#5EEBFF]" /> : todaysClasses.length === 0 ? <p className="rounded-lg border border-white/5 bg-[#0B0F14] p-4 text-sm text-gray-400">{copy.noClassesToday}</p> : todaysClasses.map((item: any) => (
                <button key={item.id} onClick={() => setSelectedClassId(item.id)} className={`min-h-16 w-full rounded-lg border p-3 text-left ${selectedClass?.id === item.id ? "border-[#5EEBFF]/50 bg-[#5EEBFF]/10" : "border-white/5 bg-[#0B0F14]"}`}>
                   <p className="text-sm font-semibold text-white">{localizedClassTitle(item, locale)}</p>
                   <p className="mt-1 text-[11px] text-gray-500">{item.audienceGroup} · {item.canonicalCategory}{item.strengthFocus ? ` · ${item.strengthFocus}` : ""}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(item.start).toLocaleTimeString(locale === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" })} · {item.summary.reserved} {copy.reservedLabel}</p>
                </button>
              ))}
            </div>
            {selectedClass && (
              <div className="rounded-lg border border-white/5 bg-[#0B0F14] p-4">
                <div className="flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-start sm:justify-between">
                   <div><h3 className="font-bold text-white">{localizedClassTitle(selectedClass, locale)}</h3><p className="text-sm text-gray-400">{new Date(selectedClass.start).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { weekday: "long", month: "short", day: "numeric" })} · {new Date(selectedClass.start).toLocaleTimeString(locale === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 text-xs text-gray-500">{selectedClass.audienceGroup} · {selectedClass.canonicalCategory}{selectedClass.strengthFocus ? ` · ${selectedClass.strengthFocus}` : ""}</p></div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]"><span><strong className="block text-white">{selectedClass.summary.reserved}</strong>{copy.reservedLabel}</span><span><strong className="block text-emerald-300">{selectedClass.summary.present}</strong>{copy.presentLabel}</span><span><strong className="block text-amber-300">{selectedClass.summary.waitlisted}</strong>{copy.waitlistedLabel}</span></div>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedClass.roster.map((reservation: any) => (
                    <div key={reservation.id} className="rounded-lg border border-white/5 bg-[#121826] p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button onClick={() => reservation.member?.id && setQuickViewMemberId(reservation.member.id)} className="min-w-0 text-left">
                          <p className="truncate text-sm font-semibold text-white">{reservation.minorProfile ? `${reservation.minorProfile.firstName} ${reservation.minorProfile.lastName}` : reservation.member ? `${reservation.member.firstName} ${reservation.member.lastName}` : `${reservation.visitorFirstName || ""} ${reservation.visitorLastName || ""}`}</p>
                          <p className="text-xs text-gray-400">{reservation.program === "MINOR" ? (locale === "es" ? "Participante menor" : "Minor participant") : reservation.program === "DISCOVERY_PASS" ? `${copy.discoveryPassTitle} · ${reservation.discoveryCategory}` : copy.member} · {reservation.status === "waitlisted" ? copy.waitlisted : copy.confirmed}</p>
                        </button>
                        {reservation.status === "confirmed" && (
                          <div className="grid grid-cols-2 gap-1 sm:flex">
                            {(["PRESENT", "NO_SHOW", "LATE_CANCEL", "EXCUSED"] as const).map((value) => <Button key={value} size="sm" disabled={rosterAttendanceMutation.isPending} onClick={() => rosterAttendanceMutation.mutate({ id: reservation.id, attendance: value })} className={`min-h-10 px-2 text-[11px] ${reservation.attendance === value ? "bg-[#5EEBFF] text-[#0B0F14]" : "border-white/10 bg-transparent text-gray-300 hover:bg-white/10"}`} variant={reservation.attendance === value ? "default" : "outline"}>{value === "PRESENT" ? copy.present : value === "NO_SHOW" ? copy.absent : value === "LATE_CANCEL" ? copy.late : copy.excused}</Button>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-[#121826] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-[#5EEBFF]" />
                  {copy.myMembers} ({filteredMembers.length})
                </CardTitle>
                <div className="relative mt-2">
                  <Input
                    placeholder={copy.searchMembers}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[45vh] overflow-y-auto lg:max-h-[calc(100vh-320px)]">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#5EEBFF]" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">{copy.noMembersAssigned}</p>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map((member: any) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`min-h-11 w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedMemberId === member.id
                            ? "bg-[#5EEBFF]/20 border border-[#5EEBFF]/30"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {member.beltRank && (
                              <span className="text-xs text-amber-400">{member.beltRank}</span>
                            )}
                            <span className="text-xs text-gray-400">{member.attendanceCount} {copy.sessions}</span>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 ${
                          selectedMemberId === member.id ? "text-[#5EEBFF]" : "text-gray-500"
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!selectedMemberId || !selectedMember ? (
              <Card className="bg-[#121826] border-white/5">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <Users className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">{copy.selectMember}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Member Info */}
                <Card className="bg-[#121826] border-white/5">
                  <CardContent className="pt-5">
                    <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      {selectedMember.firstName} {selectedMember.lastName}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm mb-4">
                      <div className="flex items-center gap-2 min-w-0"><Mail className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /><span className="text-gray-300 truncate">{selectedMember.email}</span></div>
                       <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /><span className="text-gray-300">{selectedMember.phone || "—"}</span></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">{copy.beltRank}</label>
                        <Select
                          value={selectedMember.beltRank || "none"}
                          onValueChange={(beltRank) => beltMutation.mutate({ userId: selectedMemberId!, beltRank: beltRank === "none" ? "" : beltRank })}
                        >
                          <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white">
                            <SelectValue placeholder={copy.selectBelt} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{copy.noBelt}</SelectItem>
                            {(["White Belt", "Blue Belt", "Purple Belt", "Brown Belt", "Black Belt"] as const).map((belt) => <SelectItem key={belt} value={belt}>{({ "White Belt": copy.beltWhite, "Blue Belt": copy.beltBlue, "Purple Belt": copy.beltPurple, "Brown Belt": copy.beltBrown, "Black Belt": copy.beltBlack })[belt]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">{copy.attendanceCount}</label>
                        <Input
                          type="number"
                          value={selectedMember.attendanceCount}
                          onChange={(e) => attendanceMutation.mutate({ userId: selectedMemberId!, attendanceCount: parseInt(e.target.value) || 0 })}
                          className="bg-[#0B0F14] border-white/10 text-white"
                          min="0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Notes */}
                <Card className="bg-[#121826] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <StickyNote className="h-5 w-5 text-[#5EEBFF]" />
                      {copy.sessionNotes}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder={copy.addSessionNotes}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500 min-h-[80px]"
                    />
                    <Button
                      onClick={() => selectedMemberId && sessionNoteMutation.mutate({ userId: selectedMemberId, notes: newNote })}
                      disabled={!newNote.trim() || sessionNoteMutation.isPending}
                      className="bg-[#5EEBFF] hover:bg-[#5EEBFF]/90 text-black"
                      size="sm"
                    >
                      {sessionNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {copy.addNote}
                    </Button>

                    <div className="space-y-3 mt-4">
                      {notesLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-[#5EEBFF]" />
                        </div>
                      ) : sessionNotes.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">{copy.noSessionNotes}</p>
                      ) : (
                        sessionNotes.map((note: any) => (
                          <div key={note.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5">
                            <p className="text-xs text-gray-400 mb-1">
                               {new Date(note.sessionDate).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" })} · {copy.with} {note.coach?.firstName} {note.coach?.lastName}
                            </p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.notes}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <Dialog open={Boolean(quickViewMemberId)} onOpenChange={(open) => !open && setQuickViewMemberId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#121826] text-white">
          <DialogHeader><DialogTitle>{copy.memberProgramQuickView}</DialogTitle></DialogHeader>
          {quickView.isLoading ? <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-[#5EEBFF]" /> : quickView.data && <div className="space-y-4">
            <div><h3 className="text-lg font-semibold">{quickView.data.member.firstName} {quickView.data.member.lastName}</h3><p className="text-sm text-gray-400">{quickView.data.lifecycle?.currentState || "PROSPECT"}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-gray-500">{copy.goals}</p>{quickView.data.goals?.length ? quickView.data.goals.map((goal: any) => <Badge key={goal.id} className="mr-2 mt-2 border-white/10 bg-white/5 text-gray-200">{goal.goal}</Badge>) : <p className="mt-1 text-sm text-gray-400">{copy.noGoals}</p>}</div>
            <div><p className="text-xs uppercase tracking-wide text-gray-500">{copy.recentAttendance}</p>{quickView.data.recentAttendance?.length ? quickView.data.recentAttendance.map((item: any) => <p key={item.reservation.id} className="mt-1 text-sm text-gray-300">{item.occurrence.title} · {item.reservation.attendance}</p>) : <p className="mt-1 text-sm text-gray-400">{copy.noRecentAttendance}</p>}</div>
            <div><p className="text-xs uppercase tracking-wide text-gray-500">{copy.discoveryPasses}</p><p className="mt-1 text-sm text-gray-300">{quickView.data.discoveryPass?.displayState || "—"}</p></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
