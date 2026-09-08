import { useState, useEffect, useRef } from "react";
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
import { localizeFormText, useLocale } from "@/lib/locale";
import { classDateLabel, classTimeLabel, localizedClassTitle } from "@/lib/class-booking";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, Users, ArrowLeft, FileText, Calendar, Mail, Phone, Clock, 
  CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, DollarSign, 
  TrendingUp, UserPlus, Activity, StickyNote, ChevronLeft, Shield,
  Award, Hash, AlertTriangle, Filter, BarChart3, RefreshCw
} from "lucide-react";
import AdminPilotOps from "./admin-pilot-ops";

type StripeStatus = {
  configured: boolean;
  connected: boolean;
  mode: "test" | "live" | "unknown" | "unconfigured";
  publishableKeyConfigured: boolean;
  webhookConfigured: boolean;
  account?: {
    id: string;
    country: string | null;
    defaultCurrency: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  };
};

export default function PortalAdmin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin, isStaff } = usePortalAuth();
  const { toast } = useToast();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
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
  const [billingStateFilter, setBillingStateFilter] = useState<"all" | "pending" | "active" | "past_due" | "cancel_at_period_end">("all");
  const membersSectionRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 15;

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/portal/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });
  const { data: stripeStatus, isLoading: stripeStatusLoading, isError: stripeStatusError } = useQuery<StripeStatus>({
    queryKey: ["/api/portal/admin/stripe/status"],
    enabled: isAuthenticated && isAdmin,
  });
  const { data: billingData, isLoading: billingMembershipsLoading } = useQuery<{
    memberships: any[];
    reconciliation: {
      lastRunAt: string | null;
      lastRunStatus: "not_run" | "healthy" | "failures" | "failed";
      lastRunHadFailures: boolean;
      recentPasses: number;
      recentFailurePasses: number;
      consecutiveFailurePasses: number;
      lastSummary: {
        scanned: number;
        completed: number;
        expired: number;
        missing: number;
        apiFailures: number;
        processingFailures: number;
      } | null;
    };
  }>({
    queryKey: ["/api/portal/admin/billing/memberships"],
    enabled: isAuthenticated && isAdmin,
  });
  const billingMemberships = billingData?.memberships || [];
  const reconciliationHealth = billingData?.reconciliation;

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
  const filteredBillingMemberships = billingStateFilter === "all"
    ? billingMemberships
    : billingMemberships.filter((item) => item.displayState === billingStateFilter);
  const billingStateCounts = billingMemberships.reduce((counts, item) => {
    const state = item.displayState || "manual";
    counts[state] = (counts[state] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  const dateLabel = (value: string | Date, withTime = false) => new Date(value).toLocaleString(locale === "es" ? "es-US" : "en-US", withTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
  const timeLabel = (value: string | Date) => new Date(value).toLocaleTimeString(locale === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" });

  const { data: memberProfile, isLoading: profileLoading, isError: profileError, refetch: retryMemberProfile } = useQuery<any>({
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
      setLocation(portalPath("/portal/dashboard"));
    }
  }, [authLoading, isAuthenticated, isStaff, locale, setLocation]);

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
                    {agreed ? copy.agreed : copy.notAgreed}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div key={fieldKey} className="border-b border-white/5 pb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{field.label || fieldKey}</p>
              <p className="text-sm text-white mt-1">
                {isBoolean ? (answer ? copy.yes : copy.no) : String(answer)}
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> {copy.submitted}</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> {copy.draft}</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><AlertCircle className="h-3 w-3 mr-1" /> {copy.notStartedLabel}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{copy.adminRole}</Badge>;
      case "coach":
        return <Badge className="bg-[#5EEBFF]/20 text-[#5EEBFF] border-[#5EEBFF]/30">{copy.coach}</Badge>;
      default:
        return <Badge className="bg-[#B06CFF]/20 text-[#B06CFF] border-[#B06CFF]/30">{copy.member}</Badge>;
    }
  };

  const billingStateLabel = (state: string) => ({
    pending: locale === "es" ? "Pendiente" : "Pending",
    active: locale === "es" ? "Activa" : "Active",
    past_due: locale === "es" ? "Vencida" : "Past due",
    cancel_at_period_end: locale === "es" ? "Cancela al final del período" : "Cancels at period end",
    cancelled: locale === "es" ? "Cancelada" : "Cancelled",
    manual: locale === "es" ? "Manual" : "Manual",
  }[state] || state);

  const billingStateBadgeClass = (state: string) => ({
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    past_due: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    cancel_at_period_end: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
    manual: "border-white/10 bg-white/5 text-gray-300",
  }[state] || "border-white/10 bg-white/5 text-gray-300");

  const notificationTitle = (title: string) => locale === "es" && title === "New Adaptive Capacity signup"
    ? copy.newAdaptiveSignup
    : title;
  const notificationMessage = (message: string) => {
    if (locale !== "es") return message;
    const match = message.match(/^(.+) joined the Adaptive Capacity interest list list\.$/);
    return match ? copy.adaptiveSignupMessage(match[1]) : message;
  };

  const getInboxStatusBadge = (status: string) => (
    <Badge className={
      status === "new" ? "bg-orange-500/20 text-orange-300 border-orange-500/30" :
      status === "archived" ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
      "bg-green-500/20 text-green-400 border-green-500/30"
    }>{({
      new: copy.statusNew,
      archived: copy.statusArchived,
      acknowledged: copy.statusAcknowledged,
      resolved: copy.statusResolved,
      contacted: copy.statusContacted,
      qualified: copy.statusQualified,
    } as Record<string, string>)[status] || status.replace("-", " ")}</Badge>
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
              <span>{dateLabel(item.createdAt, true)}</span>
            </div>
          </div>
          <Select value={item.status} onValueChange={(status) => statusMutation.mutate({ kind, id: item.id, status })}>
            <SelectTrigger className="min-h-11 w-full bg-[#121826] border-white/10 text-white text-xs sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{({
              new: copy.statusNew,
              archived: copy.statusArchived,
              acknowledged: copy.statusAcknowledged,
              resolved: copy.statusResolved,
              contacted: copy.statusContacted,
              qualified: copy.statusQualified,
            } as Record<string, string>)[status] || status.replace("-", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isMessage ? (
          <div><p className="text-sm font-medium text-[#FFB199]">{item.subject}</p><p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{item.message}</p></div>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-300">
            <span>{copy.program}: <strong className="text-white">{item.program}</strong></span>
            {item.classTitle && <span>{copy.classLabel}: {item.classTitle}</span>}
            {item.experience && <span>{copy.experience}: {item.experience}</span>}
            {item.source && <span>{copy.source}: {item.source}</span>}
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
  const showIncompleteMembers = () => {
    setIncompleteFormsOnly(true);
    setCurrentPage(1);
    requestAnimationFrame(() => membersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div>
      <div className="bg-[#121826]/50 border-b border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {copy.adminDashboard}
          </h1>
          <p className="text-sm text-gray-400">{copy.adminSubtitle}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {isAdmin && <AdminPilotOps />}
        {isAdmin && (
          <Card className="mb-6 border-white/5 bg-[#121826]" data-testid="stripe-status">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Shield className="h-5 w-5 text-[#5EEBFF]" /> Stripe
              </CardTitle>
              <p className="text-xs text-gray-400">Server-side connection status for billing readiness.</p>
            </CardHeader>
            <CardContent>
              {stripeStatusLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#5EEBFF]" />
              ) : stripeStatusError || !stripeStatus ? (
                <Badge className="border-red-500/30 bg-red-500/10 text-red-300">Status unavailable</Badge>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={stripeStatus.connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}>
                    {stripeStatus.connected
                      ? `Connected — ${stripeStatus.mode === "test" ? "Test Mode" : stripeStatus.mode === "live" ? "Live Mode" : "Mode unknown"}`
                      : "Not connected"}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Publishable key: {stripeStatus.publishableKeyConfigured ? "configured" : "missing"} · Webhook secret: {stripeStatus.webhookConfigured ? "configured" : "required"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {isAdmin && (
          <Card className="mb-6 border-white/5 bg-[#121826]" data-testid="billing-memberships">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <DollarSign className="h-5 w-5 text-emerald-400" /> {locale === "es" ? "Membresías y facturación" : "Membership billing"}
              </CardTitle>
              <p className="text-xs text-gray-400">
                {locale === "es" ? "Estado de suscripciones recibido desde Stripe." : "Subscription state received from Stripe webhooks."}
              </p>
            </CardHeader>
            <CardContent>
              {billingMembershipsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#5EEBFF]" />
              ) : (
                <div className="space-y-4">
                  <div className={`rounded-lg border p-3 ${reconciliationHealth?.lastRunHadFailures ? "border-amber-500/30 bg-amber-500/10" : "border-white/5 bg-[#0B0F14]"}`}>
                    <div className="flex items-start gap-3">
                      <RefreshCw className={`mt-0.5 h-4 w-4 flex-shrink-0 ${reconciliationHealth?.lastRunHadFailures ? "text-amber-300" : "text-[#5EEBFF]"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-white">
                            {locale === "es" ? "Conciliación de checkout" : "Checkout reconciliation"}
                          </p>
                          {reconciliationHealth?.lastRunStatus === "healthy" && (
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                              {locale === "es" ? "Saludable" : "Healthy"}
                            </Badge>
                          )}
                          {reconciliationHealth?.lastRunHadFailures && (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                              {locale === "es" ? "Requiere atención" : "Needs attention"}
                            </Badge>
                          )}
                        </div>
                        {!reconciliationHealth || reconciliationHealth.lastRunStatus === "not_run" ? (
                          <p className="mt-1 text-xs text-gray-400">
                            {locale === "es" ? "Todavía no hay una ejecución registrada." : "No reconciliation pass has been recorded yet."}
                          </p>
                        ) : (
                          <>
                            <p className="mt-1 text-xs text-gray-400">
                              {locale === "es" ? "Última ejecución: " : "Last run: "}
                              {reconciliationHealth.lastRunAt ? dateLabel(reconciliationHealth.lastRunAt, true) : "—"}
                              {" · "}
                              {locale === "es"
                                ? `${reconciliationHealth.recentFailurePasses} de ${reconciliationHealth.recentPasses} recientes con fallas`
                                : `${reconciliationHealth.recentFailurePasses} of ${reconciliationHealth.recentPasses} recent passes had failures`}
                            </p>
                            {reconciliationHealth.consecutiveFailurePasses > 1 && (
                              <p className="mt-1 text-xs text-amber-200">
                                {locale === "es"
                                  ? `${reconciliationHealth.consecutiveFailurePasses} ejecuciones consecutivas requieren atención.`
                                  : `${reconciliationHealth.consecutiveFailurePasses} consecutive passes need attention.`}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {billingMemberships.length === 0 ? (
                    <p className="text-sm text-gray-500">{locale === "es" ? "Todavía no hay membresías registradas." : "No memberships have been recorded yet."}</p>
                  ) : (
                  <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(["pending", "active", "past_due", "cancel_at_period_end"] as const).map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setBillingStateFilter(billingStateFilter === state ? "all" : state)}
                        className={`rounded-lg border p-3 text-left transition-colors ${billingStateFilter === state ? "border-[#5EEBFF]/50 bg-[#5EEBFF]/10" : "border-white/5 bg-[#0B0F14] hover:border-white/20"}`}
                      >
                        <p className="text-lg font-semibold text-white">{billingStateCounts[state] || 0}</p>
                        <p className="text-[11px] leading-tight text-gray-400">{billingStateLabel(state)}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBillingStateFilter("all")}
                      className={`rounded-lg border p-3 text-left transition-colors ${billingStateFilter === "all" ? "border-white/30 bg-white/10" : "border-white/5 bg-[#0B0F14] hover:border-white/20"}`}
                    >
                      <p className="text-lg font-semibold text-white">{billingMemberships.length}</p>
                      <p className="text-[11px] leading-tight text-gray-400">{locale === "es" ? "Todos" : "All records"}</p>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {locale === "es"
                      ? "Los identificadores son referencias de soporte; no se muestran datos de pago."
                      : "Identifiers are support references only; payment details are not shown."}
                  </p>
                  {filteredBillingMemberships.length === 0 ? (
                    <p className="rounded-lg border border-white/5 bg-[#0B0F14] p-4 text-sm text-gray-500">
                      {locale === "es" ? "No hay registros con este estado." : "No records match this state."}
                    </p>
                  ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="pb-2 pr-4">{locale === "es" ? "Miembro" : "Member"}</th>
                        <th className="pb-2 pr-4">{locale === "es" ? "Plan" : "Plan"}</th>
                        <th className="pb-2 pr-4">{locale === "es" ? "Estado" : "State"}</th>
                        <th className="pb-2 pr-4">{locale === "es" ? "Referencias Stripe" : "Stripe references"}</th>
                        <th className="pb-2">{locale === "es" ? "Período" : "Period"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBillingMemberships.map((item) => (
                        <tr key={item.id} className={`border-b border-white/5 last:border-0 ${item.isStalePending ? "bg-amber-500/[0.04]" : ""}`}>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-white">{item.member.firstName} {item.member.lastName}</p>
                            <p className="text-xs text-gray-500">{item.member.email}</p>
                          </td>
                          <td className="py-3 pr-4 text-gray-300">{item.plan?.displayName || item.type}</td>
                          <td className="py-3 pr-4">
                            <Badge className={billingStateBadgeClass(item.displayState || item.billingState || item.status)}>
                              {billingStateLabel(item.displayState || item.billingState || item.status)}
                            </Badge>
                            {item.isStalePending && (
                              <p className="mt-1 text-xs text-amber-300">
                                <AlertTriangle className="mr-1 inline h-3 w-3" />
                                {locale === "es" ? `Pendiente ${item.pendingAgeMinutes} min` : `Pending ${item.pendingAgeMinutes} min`}
                              </p>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="space-y-1 text-xs text-gray-400">
                              <p><span className="text-gray-500">Checkout:</span> <span className="font-mono text-gray-300">{item.stripeCheckoutSessionId || "—"}</span></p>
                              <p><span className="text-gray-500">Subscription:</span> <span className="font-mono text-gray-300">{item.stripeSubscriptionId || "—"}</span></p>
                              <p><span className="text-gray-500">Invoice:</span> <span className="font-mono text-gray-300">{item.stripeLatestInvoiceId || "—"}</span></p>
                            </div>
                          </td>
                          <td className="py-3 text-xs text-gray-400">{item.currentPeriodEnd ? dateLabel(item.currentPeriodEnd) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  )}
                  </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Stats Cards */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <Card className="bg-[#121826] border-white/5">
            <CardContent className="p-3 sm:p-5 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-[#B06CFF]/10 flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#B06CFF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-white">{statsLoading ? "..." : stats?.totalUsers || 0}</p>
                   <p className="text-xs text-gray-400 break-words">{copy.totalUsers}</p>
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
                   <p className="text-xs text-gray-400 break-words">{copy.new30Days}</p>
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
                   <p className="text-xs text-gray-400 break-words">{copy.activePlans}</p>
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
                   <p className="text-xs text-gray-400 break-words">{copy.upcoming7Days}</p>
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
                   <p className="text-xs text-gray-400 break-words">{copy.revenueMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forms Incomplete Alert */}
        {!statsLoading && stats?.membersNeedingForms > 0 && (
          <button
            type="button"
            className="mb-6 flex w-full items-center justify-between gap-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-left transition-colors hover:bg-orange-500/15"
            onClick={showIncompleteMembers}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-300">
                  {copy.incompleteFormsSummary(stats.membersNeedingForms)}
                </p>
                  <p className="text-xs text-orange-400/70">{copy.filterMembers}</p>
              </div>
            </div>
            <span className="text-xs text-orange-400 underline underline-offset-2">{copy.viewAll}</span>
          </button>
        )}

        <Card className="bg-[#121826] border-[#FFB199]/20 mb-6" data-testid="staff-notifications">
          <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
               <AlertCircle className="h-5 w-5 text-[#FFB199]" /> {copy.staffAlerts}
               {!!notifications.filter((item: any) => !item.readAt).length && <Badge className="bg-[#FFB199] text-[#0B0F14]">{notifications.filter((item: any) => !item.readAt).length} {copy.newLabel}</Badge>}
            </CardTitle>
            <p className="text-xs text-gray-400">{copy.staffAlertsDescription}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {notificationsLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#FFB199]" /></div> : notifications.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{copy.noStaffAlerts}</p>
            ) : notifications.slice(0, 8).map((notification: any) => (
              <div key={notification.id} className={`flex flex-col items-start justify-between gap-3 rounded-lg border p-3 sm:flex-row ${notification.readAt ? "border-white/5 bg-[#0B0F14]/60" : "border-[#FFB199]/20 bg-[#FFB199]/5"}`}>
                <div className="min-w-0">
                   <p className="text-sm font-medium text-white">{notificationTitle(notification.title)}</p>
                   <p className="text-xs text-gray-400 mt-1">{notificationMessage(notification.message)}</p>
                   <p className="text-[11px] text-gray-500 mt-1">{dateLabel(notification.createdAt, true)}</p>
                </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-shrink-0">
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
               <Mail className="h-5 w-5 text-[#5EEBFF]" /> {copy.leadMessageInbox}
            </CardTitle>
            <p className="text-xs text-gray-400">{copy.inboxDescription}</p>
            <div className="flex gap-1 pt-2 overflow-x-auto">
               {([[ "training", `${copy.trainingLeads} (${trainingLeads.length})`], ["adaptive", `${copy.adaptiveLeads} (${adaptiveLeads.length})`], ["messages", `${copy.contactMessages} (${contactMessages.length})`]] as const).map(([value, label]) => (
                 <button key={value} onClick={() => setInboxTab(value as typeof inboxTab)} className={`min-h-11 px-3 text-xs rounded-lg whitespace-nowrap ${inboxTab === value ? "bg-[#5EEBFF]/15 text-[#5EEBFF] border border-[#5EEBFF]/30" : "text-gray-400 hover:text-white"}`}>{label}</button>
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
               <BarChart3 className="h-5 w-5 text-[#FFB199]" /> {copy.campaignReport}
            </CardTitle>
            <p className="text-xs text-gray-400">
               {copy.campaignReportDescription}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-3">
              <Select value={reportFunnel} onValueChange={(value: "training" | "adaptive_capacity") => setReportFunnel(value)}>
                <SelectTrigger className="bg-[#0B0F14] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="training">{copy.training}</SelectItem><SelectItem value="adaptive_capacity">{copy.adaptiveLeads}</SelectItem></SelectContent>
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
                    [copy.pageViews, campaignReport?.totals?.pageViews],
                    [copy.funnelSteps, campaignReport?.totals?.funnelSteps],
                    [copy.formStarts, campaignReport?.totals?.formStarts],
                    [copy.submissions, campaignReport?.totals?.submissions],
                    [copy.successfulLeads, campaignReport?.totals?.successfulLeads],
                    [copy.totalLeads, campaignReport?.totals?.totalLeads],
                    [copy.consentedSessions, campaignReport?.totals?.consentedSessions],
                  ].map(([label, value]) => <div key={label as string} className="rounded-lg border border-white/5 bg-[#0B0F14] p-3"><p className="text-lg font-bold text-white">{value ?? 0}</p><p className="text-[11px] text-gray-500 leading-tight">{label as string}</p></div>)}
                </div>
                {!campaignReport?.breakdown?.length ? <p className="text-gray-400 text-sm text-center py-8">{copy.campaignNoData}</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-gray-500 border-b border-white/10"><th className="p-2">{copy.sourceCampaign}</th><th className="p-2">{copy.landingPath}</th><th className="p-2">{copy.views}</th><th className="p-2">{copy.starts}</th><th className="p-2">{copy.submitted}</th><th className="p-2">{copy.successfulLeads}</th><th className="p-2">{copy.totalLeads}</th></tr></thead>
                      <tbody>{campaignReport.breakdown.map((row: any) => <tr key={`${row.source}-${row.medium}-${row.campaign}-${row.landingPath}`} className="border-b border-white/5 text-gray-300"><td className="p-2"><span className="text-white">{row.source}</span><span className="block text-xs text-gray-500">{row.medium} · {row.campaign}</span></td><td className="p-2 text-xs">{row.landingPath}</td><td className="p-2">{row.pageViews}</td><td className="p-2">{row.formStarts}</td><td className="p-2">{row.submissions}</td><td className="p-2 text-[#5EEBFF]">{row.successfulLeads}</td><td className="p-2 text-[#FFB199]">{row.totalLeads}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Member Management */}
        <div ref={membersSectionRef} className="grid scroll-mt-6 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="min-w-0 lg:col-span-1">
            <Card className="min-w-0 bg-[#121826] border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-[#B06CFF]" />
                  {copy.members} ({totalMembers})
                </CardTitle>
                <div className="grid min-w-0 grid-cols-2 gap-1 mt-2">
                  <button
                    onClick={() => { setIncompleteFormsOnly(false); setCurrentPage(1); }}
                    className={`min-w-0 min-h-11 text-xs rounded-lg font-medium transition-colors ${
                      !incompleteFormsOnly
                        ? "bg-[#B06CFF]/20 text-[#B06CFF] border border-[#B06CFF]/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                     {copy.all}
                  </button>
                  <button
                    onClick={() => { setIncompleteFormsOnly(true); setCurrentPage(1); }}
                    className={`min-w-0 min-h-11 text-xs rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                      incompleteFormsOnly
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                     {copy.needsForms}
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
                    className="min-h-11 min-w-11 text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-400">
                    {copy.pageOf(currentPage, totalPages)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="min-h-11 min-w-11 text-gray-400 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div className="min-w-0 lg:col-span-2">
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
            ) : profileError ? (
              <Card className="border-red-500/30 bg-[#121826]">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
                  <p className="text-sm text-red-300">{copy.loadError}</p>
                  <Button type="button" variant="outline" className="mt-4 border-white/15 text-white" onClick={() => retryMemberProfile()}>
                    {copy.tryAgain}
                  </Button>
                </CardContent>
              </Card>
            ) : memberProfile ? (
              <div className="space-y-4">
                {/* Profile Header */}
                <Card className="bg-[#121826] border-white/5">
                  <CardContent className="pt-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
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
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-400">{copy.formsCompletionLabel}</p>
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
                        <span className="text-gray-300">{copy.joined} {new Date(memberProfile.user.createdAt).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-[#5EEBFF]" />
                        <span className="text-gray-300">{copy.sessionCount(memberProfile.user.attendanceCount)}</span>
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
                            {copy.healthConditionsFlagged}
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
                  <TabsList className="h-auto min-h-10 w-full flex-wrap justify-start bg-[#121826] border border-white/5">
                    <TabsTrigger value="forms" className="min-h-11 min-w-0 flex-1 px-2 text-xs whitespace-normal leading-tight data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{copy.forms}</TabsTrigger>
                    <TabsTrigger value="bookings" className="min-h-11 min-w-0 flex-1 px-2 text-xs whitespace-normal leading-tight data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{copy.bookings}</TabsTrigger>
                    <TabsTrigger value="notes" className="min-h-11 min-w-0 flex-1 px-2 text-xs whitespace-normal leading-tight data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{copy.sessionNotes}</TabsTrigger>
                    <TabsTrigger value="admin" className="min-h-11 min-w-0 flex-1 px-2 text-xs whitespace-normal leading-tight data-[state=active]:bg-[#B06CFF]/20 data-[state=active]:text-white text-gray-400">{copy.admin}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="forms">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#B06CFF]" />
                          {copy.formsProgress(formsCompleted, totalRequiredForms)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!memberProfile.formResponses?.length ? (
                          <p className="text-gray-400 text-sm text-center py-4">{copy.noFormResponses}</p>
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
                                      <p className="text-sm font-medium text-white">{localizeFormText(locale, response.form.slug, "title", response.form.title)}</p>
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
                                        ? `${copy.submitted} ${dateLabel(response.submittedAt)}`
                                        : `${copy.updated} ${dateLabel(response.updatedAt)}`}
                                    </p>
                                    {hasParqFlags && (
                                      <p className="text-xs text-red-400/80 mt-0.5">
                                        {copy.healthConditionDetails}
                                      </p>
                                    )}
                                    {!hasParqFlags && unchecked && (
                                      <p className="text-xs text-orange-400/80 mt-0.5">
                                        {copy.agreementReviewRequired}
                                      </p>
                                    )}
                                  </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 flex-shrink-0 sm:ml-3">
                                    {getStatusBadge(response.status)}
                                    {response.status === "submitted" && (
                                      <Button variant="ghost" size="sm" className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10"
                                        onClick={() => setFormDetailOpen({ open: true, response })}>
                                        {copy.view}
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
                    <div className="space-y-4">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-[#B06CFF]" />
                          {copy.classReservations} ({memberProfile.classReservations?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!memberProfile.classReservations?.length ? (
                          <p className="text-gray-400 text-sm text-center py-4">{copy.noClassReservations}</p>
                        ) : (
                          <div className="space-y-2">
                            {memberProfile.classReservations.map((reservation: any) => {
                              const participantName = reservation.minorProfile
                                ? `${reservation.minorProfile.firstName} ${reservation.minorProfile.lastName}`
                                : `${memberProfile.user.firstName} ${memberProfile.user.lastName}`;
                              const statusLabel = reservation.status === "confirmed"
                                ? copy.confirmed
                                : reservation.status === "waitlisted"
                                  ? copy.waitlisted
                                  : reservation.status === "cancelled"
                                    ? copy.cancelled
                                    : reservation.status;
                              return (
                              <div key={reservation.id} className="flex flex-col items-start gap-2 rounded-lg border border-white/5 bg-[#0B0F14] p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white">{localizedClassTitle(reservation.occurrence, locale)}</p>
                                  <p className="text-xs text-gray-400">
                                    {classDateLabel(reservation.occurrence.start, locale)} · {classTimeLabel(reservation.occurrence.start, reservation.occurrence.end, locale)}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">{copy.participant}: {participantName}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={
                                    reservation.status === "confirmed" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                    reservation.status === "cancelled" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }>
                                    {statusLabel}
                                  </Badge>
                                  {reservation.attendance && <Badge variant="outline">{reservation.attendance}</Badge>}
                                </div>
                              </div>
                            )})}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Clock className="h-5 w-5 text-[#5EEBFF]" />
                          {copy.privateSessions} ({memberProfile.bookings?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!memberProfile.bookings?.length ? (
                          <p className="text-gray-400 text-sm text-center py-4">{copy.noBookings}</p>
                        ) : (
                          <div className="space-y-2">
                            {memberProfile.bookings.map((booking: any) => (
                              <div key={booking.id} className="flex flex-col items-start gap-2 rounded-lg border border-white/5 bg-[#0B0F14] p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white">{dateLabel(booking.start)}</p>
                                  <p className="text-xs text-gray-400">{timeLabel(booking.start)} - {timeLabel(booking.end)} {copy.with} {booking.trainer?.name}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-gray-300">${(booking.amountCents / 100).toFixed(2)}</span>
                                  <Badge>{booking.status}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes">
                    <Card className="bg-[#121826] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <StickyNote className="h-5 w-5 text-[#B06CFF]" />
                          {copy.sessionNotes}
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
                            {copy.addNote}
                        </Button>

                        <div className="space-y-3 mt-4">
                          {!memberProfile.sessionNotes?.length ? (
                            <p className="text-gray-400 text-sm text-center py-4">{copy.noSessionNotes}</p>
                          ) : (
                            memberProfile.sessionNotes.map((note: any) => (
                              <div key={note.id} className="p-3 rounded-lg bg-[#0B0F14] border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs text-gray-400">
                                    {dateLabel(note.sessionDate)} · {copy.with} {note.coach?.firstName} {note.coach?.lastName}
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
                            {copy.memberSettings}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">{copy.role}</label>
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
                                  <SelectItem value="White Belt">{copy.beltWhite}</SelectItem>
                                  <SelectItem value="Blue Belt">{copy.beltBlue}</SelectItem>
                                  <SelectItem value="Purple Belt">{copy.beltPurple}</SelectItem>
                                  <SelectItem value="Brown Belt">{copy.beltBrown}</SelectItem>
                                  <SelectItem value="Black Belt">{copy.beltBlack}</SelectItem>
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
                            {copy.adminInternalNotes}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Textarea
                            placeholder={copy.addInternalNotes}
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
                            {copy.saveNotes}
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
                {copy.submitted} {new Date(formDetailOpen.response.submittedAt).toLocaleString(locale === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
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
