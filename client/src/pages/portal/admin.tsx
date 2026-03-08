import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalAuth } from "@/lib/portal-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, Users, ArrowLeft, FileText, Calendar, Mail, Phone, Clock, 
  CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, DollarSign, 
  TrendingUp, UserPlus, Activity, StickyNote, ChevronLeft, Shield,
  Award, Hash, AlertTriangle, Filter
} from "lucide-react";
import { format } from "date-fns";

export default function PortalAdmin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin } = usePortalAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [incompleteFormsOnly, setIncompleteFormsOnly] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formDetailOpen, setFormDetailOpen] = useState<{ open: boolean; response: any | null }>({ open: false, response: null });
  const [adminNotes, setAdminNotes] = useState("");
  const [newSessionNote, setNewSessionNote] = useState("");
  const PAGE_SIZE = 15;

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/portal/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery<{ users: any[]; total: number }>({
    queryKey: ["/api/portal/admin/members", searchQuery, currentPage, incompleteFormsOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));
      if (incompleteFormsOnly) params.set("incompleteFormsOnly", "true");
      const res = await fetch(`/api/portal/admin/members?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAuthenticated && isAdmin,
  });

  const members = membersData?.users || [];
  const totalMembers = membersData?.total || 0;
  const totalPages = Math.ceil(totalMembers / PAGE_SIZE);

  const { data: memberProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/portal/admin/members", selectedMemberId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/admin/members/${selectedMemberId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedMemberId && isAuthenticated && isAdmin,
  });

  const notesMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/notes`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      toast({ title: "Notes saved" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members"] });
      toast({ title: "Role updated" });
    },
  });

  const beltMutation = useMutation({
    mutationFn: async ({ userId, beltRank }: { userId: string; beltRank: string }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/belt`, { beltRank });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      toast({ title: "Belt rank updated" });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ userId, attendanceCount }: { userId: string; attendanceCount: number }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/attendance`, { attendanceCount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      toast({ title: "Attendance updated" });
    },
  });

  const sessionNoteMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/portal/session-notes/${userId}`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      setNewSessionNote("");
      toast({ title: "Session note added" });
    },
  });

  useEffect(() => {
    if (memberProfile?.user?.adminNotes !== undefined) {
      setAdminNotes(memberProfile.user.adminNotes || "");
    }
  }, [memberProfile?.user?.adminNotes]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      setLocation("/portal/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, setLocation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#B06CFF]" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const renderFormAnswers = (response: any) => {
    if (!response?.answers || !response?.form?.fields) return null;
    const fields = Array.isArray(response.form.fields) ? response.form.fields : [];
    return (
      <div className="space-y-3">
        {fields.map((field: any) => {
          const fieldKey = field.name || field.id;
          const answer = response.answers[fieldKey];
          const isCheckbox = field.type === "checkbox";
          const isBoolean = field.type === "boolean";
          if (!isCheckbox && !isBoolean && (answer === undefined || answer === null || answer === "")) return null;
          if (isCheckbox) {
            const agreed = answer === true;
            return (
              <div key={fieldKey} className="flex items-start gap-3 py-2 border-b border-white/5">
                {agreed ? (
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm text-white leading-snug">{field.label || fieldKey}</p>
                  <p className={`text-xs mt-0.5 font-medium ${agreed ? "text-green-400" : "text-red-400"}`}>
                    {agreed ? "Agreed" : "Not agreed"}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div key={fieldKey} className="border-b border-white/5 pb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{field.label || fieldKey}</p>
              <p className="text-sm text-white mt-1">
                {isBoolean ? (answer ? "Yes" : "No") : String(answer)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Not Started</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Admin</Badge>;
      case "coach":
        return <Badge className="bg-[#5EEBFF]/20 text-[#5EEBFF] border-[#5EEBFF]/30">Coach</Badge>;
      default:
        return <Badge className="bg-[#B06CFF]/20 text-[#B06CFF] border-[#B06CFF]/30">Member</Badge>;
    }
  };

  const hasUncheckedCheckboxes = (response: any): boolean => {
    if (!response?.form?.fields || !response?.answers) return false;
    return response.form.fields.some((field: any) =>
      field.type === "checkbox" && !response.answers[field.name || field.id]
    );
  };

  const formsCompleted = memberProfile?.formResponses?.filter((r: any) => r.status === "submitted").length || 0;
  const totalRequiredForms = stats?.totalRequiredForms || 0;
  const formsCompletion = totalRequiredForms > 0 ? Math.round((formsCompleted / totalRequiredForms) * 100) : 0;

  return (
    <div>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            ADMIN <span className="gradient-text-purple">DASHBOARD</span>
          </h1>
          <p className="text-sm text-gray-400">Manage members, track performance & analytics</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#B06CFF]/10">
                  <Users className="h-5 w-5 text-[#B06CFF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{statsLoading ? "..." : stats?.totalUsers || 0}</p>
                  <p className="text-xs text-gray-400">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#5EEBFF]/10">
                  <UserPlus className="h-5 w-5 text-[#5EEBFF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{statsLoading ? "..." : stats?.newUsers30Days || 0}</p>
                  <p className="text-xs text-gray-400">New (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{statsLoading ? "..." : stats?.activeMemberships || 0}</p>
                  <p className="text-xs text-gray-400">Active Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FFB199]/10">
                  <Calendar className="h-5 w-5 text-[#FFB199]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{statsLoading ? "..." : stats?.upcomingSessions7Days || 0}</p>
                  <p className="text-xs text-gray-400">Upcoming (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${statsLoading ? "..." : ((stats?.monthlyRevenue || 0) / 100).toFixed(0)}</p>
                  <p className="text-xs text-gray-400">Revenue (Mo)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forms Incomplete Alert */}
        {!statsLoading && stats?.membersNeedingForms > 0 && (
          <div
            className="mb-6 flex items-center justify-between gap-4 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 cursor-pointer hover:bg-orange-500/15 transition-colors"
            onClick={() => { setIncompleteFormsOnly(true); setCurrentPage(1); }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-300">
                  {stats.membersNeedingForms} member{stats.membersNeedingForms !== 1 ? "s" : ""} {stats.membersNeedingForms !== 1 ? "have" : "has"} incomplete required forms
                </p>
                <p className="text-xs text-orange-400/70">Click to filter member list</p>
              </div>
            </div>
            <span className="text-xs text-orange-400 underline underline-offset-2">View all</span>
          </div>
        )}

        {/* Member Management */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="bg-[#121826] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-[#B06CFF]" />
                  Members ({totalMembers})
                </CardTitle>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => { setIncompleteFormsOnly(false); setCurrentPage(1); }}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      !incompleteFormsOnly
                        ? "bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { setIncompleteFormsOnly(true); setCurrentPage(1); }}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                      incompleteFormsOnly
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Needs Forms
                    {stats?.membersNeedingForms > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        incompleteFormsOnly ? "bg-orange-500/30 text-orange-200" : "bg-orange-500/20 text-orange-400"
                      }`}>
                        {stats.membersNeedingForms}
                      </span>
                    )}
                  </button>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500"
                    data-testid="input-member-search"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-420px)] overflow-y-auto">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#B06CFF]" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No members found</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((member: any) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                          selectedMemberId === member.id
                            ? "bg-[#B06CFF]/20 border border-[#B06CFF]/30"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                        data-testid={`member-item-${member.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-white truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            {getRoleBadge(member.role)}
                            {incompleteFormsOnly && member.missingFormsCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/20">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {member.missingFormsCount} missing
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{member.email}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          selectedMemberId === member.id ? "text-[#B06CFF]" : "text-gray-500 group-hover:text-gray-300"
                        }`} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              {totalPages > 1 && (
                <div className="px-4 pb-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            {!selectedMemberId ? (
              <Card className="bg-[#121826] border-white/5">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <Users className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 text-lg">Select a member to view their profile</p>
                  <p className="text-gray-500 text-sm mt-1">Use the search bar to find members</p>
                </CardContent>
              </Card>
            ) : profileLoading ? (
              <Card className="bg-[#121826] border-white/5">
                <CardContent className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#B06CFF]" />
                </CardContent>
              </Card>
            ) : memberProfile ? (
              <div className="space-y-4">
                {/* Profile Header */}
                <Card className="bg-[#121826] border-white/5">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {memberProfile.user.firstName} {memberProfile.user.lastName}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(memberProfile.user.role)}
                          {memberProfile.user.beltRank && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              <Award className="h-3 w-3 mr-1" />{memberProfile.user.beltRank}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Forms Completion</p>
                        <p className="text-lg font-bold text-[#5EEBFF]">{formsCompletion}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300 truncate">{memberProfile.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">{memberProfile.user.phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">Joined {format(new Date(memberProfile.user.createdAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">{memberProfile.user.attendanceCount} sessions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabbed Content */}
                <Tabs defaultValue="forms" className="space-y-4">
                  <TabsList className="bg-[#121826] border border-white/5 w-full justify-start">
                    <TabsTrigger value="forms" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">Forms</TabsTrigger>
                    <TabsTrigger value="bookings" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">Bookings</TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">Session Notes</TabsTrigger>
                    <TabsTrigger value="admin" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">Admin</TabsTrigger>
                  </TabsList>

                  <TabsContent value="forms">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#B06CFF]" />
                          Forms ({formsCompleted}/{totalRequiredForms} completed)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!memberProfile.formResponses?.length ? (
                          <p className="text-gray-400 text-sm text-center py-4">No form responses yet</p>
                        ) : (
                          <div className="space-y-2">
                            {memberProfile.formResponses.map((response: any) => {
                              const unchecked = response.status === "submitted" && hasUncheckedCheckboxes(response);
                              return (
                                <div key={response.id} className={`p-3 rounded-lg border flex items-center justify-between ${
                                  unchecked
                                    ? "bg-orange-500/5 border-orange-500/30"
                                    : "bg-[#0B0F14] border-white/5"
                                }`}>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white">{response.form.title}</p>
                                      {unchecked && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                          <AlertTriangle className="h-2.5 w-2.5" />
                                          Not fully agreed
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {response.submittedAt
                                        ? `Submitted ${format(new Date(response.submittedAt), "MMM d, yyyy")}`
                                        : `Updated ${format(new Date(response.updatedAt), "MMM d, yyyy")}`}
                                    </p>
                                    {unchecked && (
                                      <p className="text-xs text-orange-400/80 mt-0.5">
                                        One or more agreement checkboxes were left unchecked — review required
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    {getStatusBadge(response.status)}
                                    {response.status === "submitted" && (
                                      <Button variant="ghost" size="sm" className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10"
                                        onClick={() => setFormDetailOpen({ open: true, response })}>
                                        View
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="bookings">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-[#B06CFF]" />
                          Bookings & Payments ({memberProfile.bookings?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!memberProfile.bookings?.length ? (
                          <p className="text-gray-400 text-sm text-center py-4">No bookings yet</p>
                        ) : (
                          <div className="space-y-2">
                            {memberProfile.bookings.map((booking: any) => (
                              <div key={booking.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5 flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {format(new Date(booking.start), "EEEE, MMM d, yyyy")}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")} with {booking.trainer?.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-300">${(booking.amountCents / 100).toFixed(2)}</span>
                                  <Badge className={
                                    booking.status === "paid" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                    booking.status === "canceled" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }>
                                    {booking.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <StickyNote className="h-5 w-5 text-[#B06CFF]" />
                          Session Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Add a session note..."
                            value={newSessionNote}
                            onChange={(e) => setNewSessionNote(e.target.value)}
                            className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500 min-h-[80px]"
                          />
                        </div>
                        <Button
                          onClick={() => selectedMemberId && sessionNoteMutation.mutate({ userId: selectedMemberId, notes: newSessionNote })}
                          disabled={!newSessionNote.trim() || sessionNoteMutation.isPending}
                          className="bg-[#B06CFF] hover:bg-[#B06CFF]/90 text-white"
                          size="sm"
                        >
                          {sessionNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add Note
                        </Button>

                        <div className="space-y-3 mt-4">
                          {!memberProfile.sessionNotes?.length ? (
                            <p className="text-gray-400 text-sm text-center py-4">No session notes yet</p>
                          ) : (
                            memberProfile.sessionNotes.map((note: any) => (
                              <div key={note.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs text-gray-400">
                                    {format(new Date(note.sessionDate), "MMM d, yyyy")} - by {note.coach?.firstName} {note.coach?.lastName}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.notes}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="admin">
                    <div className="space-y-4">
                      {/* Role & Belt Management */}
                      <Card className="bg-[#121826] border-white/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <Shield className="h-5 w-5 text-[#B06CFF]" />
                            Member Settings
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Role</label>
                              <Select
                                value={memberProfile.user.role}
                                onValueChange={(role) => selectedMemberId && roleMutation.mutate({ userId: selectedMemberId, role })}
                              >
                                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="coach">Coach</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Belt Rank</label>
                              <Select
                                value={memberProfile.user.beltRank || "none"}
                                onValueChange={(beltRank) => selectedMemberId && beltMutation.mutate({ userId: selectedMemberId, beltRank: beltRank === "none" ? "" : beltRank })}
                              >
                                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white">
                                  <SelectValue placeholder="Select belt" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Belt</SelectItem>
                                  <SelectItem value="White Belt">White Belt</SelectItem>
                                  <SelectItem value="Blue Belt">Blue Belt</SelectItem>
                                  <SelectItem value="Purple Belt">Purple Belt</SelectItem>
                                  <SelectItem value="Brown Belt">Brown Belt</SelectItem>
                                  <SelectItem value="Black Belt">Black Belt</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Attendance Count</label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={memberProfile.user.attendanceCount}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    if (selectedMemberId) attendanceMutation.mutate({ userId: selectedMemberId, attendanceCount: val });
                                  }}
                                  className="bg-[#0B0F14] border-white/10 text-white"
                                  min="0"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Admin Notes */}
                      <Card className="bg-[#121826] border-white/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <StickyNote className="h-5 w-5 text-[#FFB199]" />
                            Admin Internal Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea
                            placeholder="Add internal notes about this member..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
                          />
                          <Button
                            onClick={() => selectedMemberId && notesMutation.mutate({ userId: selectedMemberId, notes: adminNotes })}
                            disabled={notesMutation.isPending}
                            className="bg-[#FFB199] hover:bg-[#FFB199]/90 text-black"
                            size="sm"
                          >
                            {notesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Notes
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <Dialog open={formDetailOpen.open} onOpenChange={(open) => setFormDetailOpen({ open, response: open ? formDetailOpen.response : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {formDetailOpen.response?.form?.title}
            </DialogTitle>
            {formDetailOpen.response?.submittedAt && (
              <p className="text-xs text-gray-400">
                Submitted {format(new Date(formDetailOpen.response.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            {renderFormAnswers(formDetailOpen.response)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
