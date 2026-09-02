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
import { useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, Users, ArrowLeft, FileText, Calendar, Mail, Phone, Clock, 
  CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, DollarSign, 
  TrendingUp, UserPlus, Activity, StickyNote, ChevronLeft, Shield,
  Award, Hash, AlertTriangle, Filter, BarChart3
} from "lucide-react";
import { format } from "date-fns";

export default function PortalAdmin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin, isStaff } = usePortalAuth();
  const { toast } = useToast();
  const { locale, copy } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [incompleteFormsOnly, setIncompleteFormsOnly] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formDetailOpen, setFormDetailOpen] = useState<{ open: boolean; response: any | null }>({ open: false, response: null });
  const [adminNotes, setAdminNotes] = useState("");
  const [newSessionNote, setNewSessionNote] = useState("");
  const [inboxTab, setInboxTab] = useState<"training" | "adaptive" | "messages">("training");
  const [reportFunnel, setReportFunnel] = useState<"training" | "adaptive_capacity">("training");
  const [reportFilters, setReportFilters] = useState({ source: "", medium: "", campaign: "", landingPath: "" });
  const PAGE_SIZE = 15;

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/portal/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: trainingLeads = [], isLoading: trainingLeadsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/admin/trial-leads", "training"],
    queryFn: async () => (await fetch("/api/portal/admin/trial-leads?program=training")).json(),
    enabled: isAuthenticated && isAdmin,
  });
  const { data: adaptiveLeads = [], isLoading: adaptiveLeadsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/admin/trial-leads", "adaptive-capacity"],
    queryFn: async () => (await fetch("/api/portal/admin/trial-leads?program=adaptive-capacity")).json(),
    enabled: isAuthenticated && isAdmin,
  });
  const { data: contactMessages = [], isLoading: contactMessagesLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/admin/contact-submissions"],
    enabled: isAuthenticated && isAdmin,
  });
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/notifications"],
    enabled: isAuthenticated && isStaff,
    refetchInterval: 30000,
  });
  const notificationReadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/portal/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/notifications"] }),
  });
  const { data: campaignReport, isLoading: campaignReportLoading } = useQuery<any>({
    queryKey: ["/api/portal/admin/campaign-report", reportFunnel, reportFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ funnel: reportFunnel });
      Object.entries(reportFilters).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`/api/portal/admin/campaign-report?${params}`);
      if (!response.ok) throw new Error("Failed to load campaign report");
      return response.json();
    },
    enabled: isAuthenticated && isStaff,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ kind, id, status }: { kind: "lead" | "message"; id: string; status: string }) =>
      apiRequest("PATCH", kind === "lead"
        ? `/api/portal/admin/trial-leads/${id}/status`
        : `/api/portal/admin/contact-submissions/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.kind === "lead" ? "/api/portal/admin/trial-leads" : "/api/portal/admin/contact-submissions"] });
      toast({ title: copy.statusUpdated });
    },
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
      toast({ title: copy.notesSaved });
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
      toast({ title: copy.roleUpdated });
    },
  });

  const beltMutation = useMutation({
    mutationFn: async ({ userId, beltRank }: { userId: string; beltRank: string }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/belt`, { beltRank });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      toast({ title: copy.beltUpdated });
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ userId, attendanceCount }: { userId: string; attendanceCount: number }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/members/${userId}/attendance`, { attendanceCount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId] });
      toast({ title: copy.attendanceUpdated });
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
      toast({ title: copy.sessionNoteAdded });
    },
  });

  useEffect(() => {
    if (memberProfile?.user?.adminNotes !== undefined) {
      setAdminNotes(memberProfile.user.adminNotes || "");
    }
  }, [memberProfile?.user?.adminNotes]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isStaff)) {
      setLocation("/portal/dashboard");
    }
  }, [authLoading, isAuthenticated, isAdmin, setLocation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const inbox = new URLSearchParams(window.location.search).get("inbox");
    if (inbox === "training" || inbox === "adaptive" || inbox === "messages") {
      setInboxTab(inbox);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#B06CFF]" />
      </div>
    );
  }

  if (!isAuthenticated || !isStaff) {
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

  const getInboxStatusBadge = (status: string) => (
    <Badge className={
      status === "new" ? "bg-orange-500/20 text-orange-300 border-orange-500/30" :
      status === "archived" ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
      "bg-green-500/20 text-green-400 border-green-500/30"
    }>{status.replace("-", " ")}</Badge>
  );

  const renderInboxRow = (item: any, kind: "lead" | "message") => {
    const isMessage = kind === "message";
    const name = isMessage ? `${item.firstName} ${item.lastName}` : `${item.firstName} ${item.lastName}`;
    const statuses = isMessage ? ["new", "acknowledged", "resolved", "archived"] : ["new", "contacted", "qualified", "archived"];
    return (
      <div key={item.id} className="rounded-lg bg-[#0B0F14] border border-white/5 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-white">{name}</p>
              {getInboxStatusBadge(item.status)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
              <a className="hover:text-[#5EEBFF]" href={`mailto:${item.email}`}>{item.email}</a>
              {item.phone && item.phone !== "not-provided" && <span>{item.phone}</span>}
              <span>{format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
          <Select value={item.status} onValueChange={(status) => statusMutation.mutate({ kind, id: item.id, status })}>
            <SelectTrigger className="w-full sm:w-36 h-8 bg-[#121826] border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status.replace("-", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isMessage ? (
          <div><p className="text-sm font-medium text-[#FFB199]">{item.subject}</p><p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{item.message}</p></div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-300">
            <span>Program: <strong className="text-white">{item.program}</strong></span>
            {item.classTitle && <span>Class: {item.classTitle}</span>}
            {item.experience && <span>Experience: {item.experience}</span>}
            {item.source && <span>Source: {item.source}</span>}
          </div>
        )}
      </div>
    );
  };

  const hasUncheckedCheckboxes = (response: any): boolean => {
    if (!response?.form?.fields || !response?.answers) return false;
    return response.form.fields.some((field: any) =>
      field.type === "checkbox" && !response.answers[field.name || field.id]
    );
  };

  const getHealthFlags = (formResponses: any[]): { label: string; answer: string }[] => {
    const parq = formResponses?.find((r: any) => r.form?.slug === "health-parq" && r.status === "submitted");
    if (!parq?.form?.fields || !parq?.answers) return [];
    const flags: { label: string; answer: string }[] = [];
    for (const field of parq.form.fields) {
      const key = field.name || field.id;
      const val = parq.answers[key];
      if (field.type === "boolean" && val === true) {
        flags.push({ label: field.label, answer: "Yes" });
      } else if ((field.type === "textarea" || field.type === "text") && typeof val === "string" && val.trim()) {
        flags.push({ label: field.label, answer: val.trim() });
      }
    }
    return flags;
  };

  const formsCompleted = memberProfile?.formResponses?.filter((r: any) => r.status === "submitted").length || 0;
  const totalRequiredForms = stats?.totalRequiredForms || 0;
  const formsCompletion = totalRequiredForms > 0 ? Math.round((formsCompleted / totalRequiredForms) * 100) : 0;

  return (
    <div>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            ADMIN <span className="gradient-text-purple">DASHBOARD</span>
          </h1>
          <p className="text-sm text-gray-400">{copy.adminSubtitle}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-[#B06CFF]/10 flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#B06CFF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">{statsLoading ? "..." : stats?.totalUsers || 0}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{copy.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-[#5EEBFF]/10 flex-shrink-0">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-[#5EEBFF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">{statsLoading ? "..." : stats?.newUsers30Days || 0}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{copy.new30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">{statsLoading ? "..." : stats?.activeMemberships || 0}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{copy.activePlans}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-[#FFB199]/10 flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFB199]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">{statsLoading ? "..." : stats?.upcomingSessions7Days || 0}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{copy.upcoming7Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">${statsLoading ? "..." : ((stats?.monthlyRevenue || 0) / 100).toFixed(0)}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{copy.revenueMonth}</p>
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
                <p className="text-xs text-orange-400/70">{locale === "es" ? "Haz clic para filtrar la lista de miembros" : "Click to filter member list"}</p>
              </div>
            </div>
            <span className="text-xs text-orange-400 underline underline-offset-2">{locale === "es" ? "Ver todo" : "View all"}</span>
          </div>
        )}

        <Card className="bg-[#121826] border-[#FFB199]/20 mb-6" data-testid="staff-notifications">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-[#FFB199]" /> Staff alerts
              {!!notifications.filter((item: any) => !item.readAt).length && <Badge className="bg-[#FFB199] text-[#0B0F14]">{notifications.filter((item: any) => !item.readAt).length} new</Badge>}
            </CardTitle>
            <p className="text-xs text-gray-400">{copy.staffAlertsDescription}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {notificationsLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#FFB199]" /></div> : notifications.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{copy.noStaffAlerts}</p>
            ) : notifications.slice(0, 8).map((notification: any) => (
              <div key={notification.id} className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${notification.readAt ? "border-white/5 bg-[#0B0F14]/60" : "border-[#FFB199]/20 bg-[#FFB199]/5"}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{notification.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.readAt && <button className="min-h-11 px-2 text-[11px] text-gray-400 hover:text-white" onClick={() => notificationReadMutation.mutate(notification.id)}>{copy.markRead}</button>}
                  <a className="text-xs text-[#5EEBFF] hover:underline" href={notification.href}>{copy.openInbox}</a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#121826] border-white/5 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-[#5EEBFF]" /> Lead & Message Inbox
            </CardTitle>
            <p className="text-xs text-gray-400">{copy.inboxDescription}</p>
            <div className="flex gap-1 pt-2 overflow-x-auto">
              {([["training", `Training leads (${trainingLeads.length})`], ["adaptive", `Adaptive Capacity (${adaptiveLeads.length})`], ["messages", `Contact messages (${contactMessages.length})`]] as const).map(([value, label]) => (
                <button key={value} onClick={() => setInboxTab(value as typeof inboxTab)} className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${inboxTab === value ? "bg-[#5EEBFF]/15 text-[#5EEBFF] border border-[#5EEBFF]/30" : "text-gray-400 hover:text-white"}`}>{label}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {((inboxTab === "training" && trainingLeadsLoading) || (inboxTab === "adaptive" && adaptiveLeadsLoading) || (inboxTab === "messages" && contactMessagesLoading)) ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#5EEBFF]" /></div>
            ) : inboxTab === "messages" ? (
              contactMessages.length ? contactMessages.map((item) => renderInboxRow(item, "message")) : <p className="text-gray-400 text-sm text-center py-6">{copy.noContactMessages}</p>
            ) : (inboxTab === "training" ? trainingLeads : adaptiveLeads).length ? (
              (inboxTab === "training" ? trainingLeads : adaptiveLeads).map((item) => renderInboxRow(item, "lead"))
            ) : <p className="text-gray-400 text-sm text-center py-6">{copy.noLeads}</p>}
          </CardContent>
        </Card>

        <Card className="bg-[#121826] border-white/5 mb-6" data-testid="campaign-report">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-[#FFB199]" /> Campaign & Funnel Report
            </CardTitle>
            <p className="text-xs text-gray-400">
              Consent-aware analytics are shown alongside total leads. Totals may differ because analytics require visitor consent.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-3">
              <Select value={reportFunnel} onValueChange={(value: "training" | "adaptive_capacity") => setReportFunnel(value)}>
                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="training">Training</SelectItem><SelectItem value="adaptive_capacity">Adaptive Capacity</SelectItem></SelectContent>
              </Select>
              {([["source", "UTM source"], ["medium", "UTM medium"], ["campaign", "UTM campaign"], ["landingPath", "Landing path"]] as const).map(([key, label]) => (
                <Input
                  key={key}
                  value={reportFilters[key]}
                  onChange={(event) => setReportFilters((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={label}
                  className="bg-[#0B0F14] border-white/10 text-white placeholder:text-gray-500"
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {campaignReportLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#FFB199]" /></div> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
                  {[
                    ["Page views", campaignReport?.totals?.pageViews],
                    ["Funnel steps", campaignReport?.totals?.funnelSteps],
                    ["Form starts", campaignReport?.totals?.formStarts],
                    ["Submissions", campaignReport?.totals?.submissions],
                    ["Successful leads", campaignReport?.totals?.successfulLeads],
                    ["Total leads", campaignReport?.totals?.totalLeads],
                    ["Consented sessions", campaignReport?.totals?.consentedSessions],
                  ].map(([label, value]) => <div key={label as string} className="rounded-lg border border-white/5 bg-[#0B0F14] p-3"><p className="text-lg font-bold text-white">{value ?? 0}</p><p className="text-[11px] text-gray-500 leading-tight">{label as string}</p></div>)}
                </div>
                {!campaignReport?.breakdown?.length ? <p className="text-gray-400 text-sm text-center py-8">{locale === "es" ? "Aún no hay datos de campañas o análisis con consentimiento para estos filtros." : "No campaign or consented analytics data matches these filters yet."}</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-500 border-b border-white/10"><th className="p-2">{locale === "es" ? "Fuente / campaña" : "Source / campaign"}</th><th className="p-2">{locale === "es" ? "Ruta de llegada" : "Landing path"}</th><th className="p-2">{locale === "es" ? "Vistas" : "Views"}</th><th className="p-2">{locale === "es" ? "Inicios" : "Starts"}</th><th className="p-2">{locale === "es" ? "Enviados" : "Submitted"}</th><th className="p-2">{locale === "es" ? "Exitosos" : "Successful"}</th><th className="p-2">{locale === "es" ? "Contactos totales" : "Total leads"}</th></tr></thead>
                      <tbody>{campaignReport.breakdown.map((row: any) => <tr key={`${row.source}-${row.medium}-${row.campaign}-${row.landingPath}`} className="border-b border-white/5 text-gray-300"><td className="p-2"><span className="text-white">{row.source}</span><span className="block text-xs text-gray-500">{row.medium} · {row.campaign}</span></td><td className="p-2 text-xs">{row.landingPath}</td><td className="p-2">{row.pageViews}</td><td className="p-2">{row.formStarts}</td><td className="p-2">{row.submissions}</td><td className="p-2 text-[#5EEBFF]">{row.successfulLeads}</td><td className="p-2 text-[#FFB199]">{row.totalLeads}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Member Management */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
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
                    placeholder={copy.searchMembersDetailed}
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
                  <p className="text-gray-400 text-sm text-center py-8">{copy.noMembersFound}</p>
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
                  <p className="text-gray-400 text-lg">{copy.selectMemberProfile}</p>
                  <p className="text-gray-500 text-sm mt-1">{copy.useSearchToFind}</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-sm">
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

                {/* Health Flags Alert */}
                {(() => {
                  const healthFlags = getHealthFlags(memberProfile.formResponses);
                  if (healthFlags.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/20 flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-300 mb-2">
                            Health Conditions Flagged — Coach Awareness Required
                          </p>
                          <div className="space-y-1.5">
                            {healthFlags.map((flag, i) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <span className="text-red-400/70 flex-shrink-0">•</span>
                                <span className="text-gray-300">
                                  <span className="text-red-300/80">{flag.label}:</span>{" "}
                                  <span className="text-white font-medium">{flag.answer}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabbed Content */}
                <Tabs defaultValue="forms" className="space-y-4">
                  <TabsList className="bg-[#121826] border border-white/5 w-full justify-start">
                    <TabsTrigger value="forms" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{locale === "es" ? "Formularios" : "Forms"}</TabsTrigger>
                    <TabsTrigger value="bookings" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{locale === "es" ? "Reservas" : "Bookings"}</TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{copy.sessionNotes}</TabsTrigger>
                    <TabsTrigger value="admin" className="data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{locale === "es" ? "Administración" : "Admin"}</TabsTrigger>
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
                          <p className="text-gray-400 text-sm text-center py-4">{locale === "es" ? "Aún no hay respuestas de formularios" : "No form responses yet"}</p>
                        ) : (
                          <div className="space-y-2">
                            {memberProfile.formResponses.map((response: any) => {
                              const unchecked = response.status === "submitted" && hasUncheckedCheckboxes(response);
                              const isParq = response.form?.slug === "health-parq";
                              const parqFlags = isParq && response.status === "submitted"
                                ? getHealthFlags(memberProfile.formResponses)
                                : [];
                              const hasParqFlags = parqFlags.length > 0;
                              const borderClass = hasParqFlags
                                ? "bg-red-500/5 border-red-500/30"
                                : unchecked
                                  ? "bg-orange-500/5 border-orange-500/30"
                                  : "bg-[#0B0F14] border-white/5";
                              return (
                                <div key={response.id} className={`p-3 rounded-lg border flex items-center justify-between ${borderClass}`}>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white">{response.form.title}</p>
                                      {hasParqFlags && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                          <AlertTriangle className="h-2.5 w-2.5" />
                                          Health conditions flagged
                                        </span>
                                      )}
                                      {!hasParqFlags && unchecked && (
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
                                    {hasParqFlags && (
                                      <p className="text-xs text-red-400/80 mt-0.5">
                                        Member reported health conditions — view form for details
                                      </p>
                                    )}
                                    {!hasParqFlags && unchecked && (
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
                          <p className="text-gray-400 text-sm text-center py-4">{locale === "es" ? "Aún no hay reservas" : "No bookings yet"}</p>
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
                            placeholder={copy.addSessionNotes}
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
                            <p className="text-gray-400 text-sm text-center py-4">{copy.noSessionNotes}</p>
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
                              <label className="text-xs text-gray-400 mb-1 block">{locale === "es" ? "Rol" : "Role"}</label>
                              <Select
                                value={memberProfile.user.role}
                                onValueChange={(role) => selectedMemberId && roleMutation.mutate({ userId: selectedMemberId, role })}
                              >
                                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">{copy.member}</SelectItem>
                                  <SelectItem value="coach">{copy.coach}</SelectItem>
                                  <SelectItem value="admin">{copy.administrator}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">{copy.beltRank}</label>
                              <Select
                                value={memberProfile.user.beltRank || "none"}
                                onValueChange={(beltRank) => selectedMemberId && beltMutation.mutate({ userId: selectedMemberId, beltRank: beltRank === "none" ? "" : beltRank })}
                              >
                                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white">
                                  <SelectValue placeholder={copy.selectBelt} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{copy.noBelt}</SelectItem>
                                  <SelectItem value="White Belt">White Belt</SelectItem>
                                  <SelectItem value="Blue Belt">Blue Belt</SelectItem>
                                  <SelectItem value="Purple Belt">Purple Belt</SelectItem>
                                  <SelectItem value="Brown Belt">Brown Belt</SelectItem>
                                  <SelectItem value="Black Belt">Black Belt</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">{copy.attendanceCount}</label>
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
                            placeholder={locale === "es" ? "Agregar notas internas sobre esta miembro…" : "Add internal notes about this member..."}
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
