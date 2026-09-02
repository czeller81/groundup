import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalAuth } from "@/lib/portal-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, ArrowLeft, ChevronRight, Loader2, StickyNote, Award, Hash, 
  Mail, Phone, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useLocale } from "@/lib/locale";

export default function PortalCoach() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isCoach, isStaff } = usePortalAuth();
  const { toast } = useToast();
  const { locale, copy } = useLocale();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      setLocation("/portal/dashboard");
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
            COACH <span className="gradient-text-cyan">CENTER</span>
          </h1>
          <p className="text-sm text-gray-400">{copy.coachSubtitle}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
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
              <CardContent className="max-h-[calc(100vh-320px)] overflow-y-auto">
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
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
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
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#5EEBFF] flex-shrink-0" /><span className="text-gray-300">{selectedMember.phone || "N/A"}</span></div>
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
                            {["White Belt", "Blue Belt", "Purple Belt", "Brown Belt", "Black Belt"].map((belt) => <SelectItem key={belt} value={belt}>{locale === "es" ? ({ "White Belt": "Cinturón blanco", "Blue Belt": "Cinturón azul", "Purple Belt": "Cinturón morado", "Brown Belt": "Cinturón marrón", "Black Belt": "Cinturón negro" } as Record<string, string>)[belt] : belt}</SelectItem>)}
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
                              {format(new Date(note.sessionDate), "MMM d, yyyy")} - by {note.coach?.firstName} {note.coach?.lastName}
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
    </div>
  );
}
