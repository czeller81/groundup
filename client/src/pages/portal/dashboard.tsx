import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePortalAuth } from "@/lib/portal-auth";
import { localizeApiError, localizeFormOption, localizeFormText, useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { classDateLabel, classTimeLabel } from "@/lib/class-booking";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { track, trackEvent } from "@/lib/analytics";
import PortalForm from "@/pages/portal/form";
import {
  getMetaDiscoveryVerification,
  isMetaDiscoveryTestMode,
  sendMetaDiscoveryTestEvent,
  trackMetaDiscoveryPassActivation,
  type MetaDiscoveryVerification,
} from "@/lib/meta-pixel";
import {
  FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle, X, Loader2, Eye,
  Shield, Camera, Book, Users, CreditCard, Dumbbell, ArrowRight, ExternalLink,
  User, TrendingUp, Home, Star, ChevronRight
} from "lucide-react";
import { isPast, isFuture, isSameDay, addDays } from "date-fns";

const FORM_ICONS: Record<string, any> = {
  "liability-waiver": Shield,
  "media-release": Camera,
  "gym-rules": Book,
  "minor-consent": Users,
  "personal-training-intake": FileText,
  "health-parq": CheckCircle,
  "goals-preferences": TrendingUp,
};

const MEMBERSHIP_LABELS: Record<string, { name: string; price: string; classes: string }> = {
  "womens_bjj": { name: "", price: "$120/mo", classes: "2 per week" },
  "kids_bjj": { name: "", price: "$100/mo", classes: "2 per week" },
  "strength_conditioning_unlimited": { name: "", price: "$60/mo", classes: "Unlimited" },
  "self_defense_program": { name: "", price: "$199 total", classes: "2 per week" },
  "per_session": { name: "", price: "$15–$60/session", classes: "Flexible" },
  "monthly_unlimited": { name: "", price: "$60/mo", classes: "Unlimited" },
};

const AI_DELEGATION_SCOPES = [
  "self:profile:read",
  "self:schedule:read",
  "self:reservations:read",
  "self:booking:preview",
  "self:waiver:initiate",
  "self:reservation:create",
  "self:dependents:read",
] as const;
type AiDelegationScope = typeof AI_DELEGATION_SCOPES[number];
type AiDelegation = {
  id: string;
  label?: string | null;
  scopes: string[];
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  active: boolean;
};

function getMembershipInfo(type: string, copy: ReturnType<typeof useLocale>["copy"]) {
  const info = MEMBERSHIP_LABELS[type] || { name: type.replace(/_/g, " "), price: copy.contactGym, classes: copy.varies };
  const names: Record<string, string> = {
    womens_bjj: copy.membershipWomensBjj,
    kids_bjj: copy.membershipKidsBjj,
    strength_conditioning_unlimited: copy.membershipStrength,
    self_defense_program: copy.membershipSelfDefense,
    per_session: copy.membershipPerSession,
    monthly_unlimited: copy.membershipMonthly,
  };
  const classes: Record<string, string> = { "2 per week": copy.twoPerWeek, Unlimited: copy.unlimited, Flexible: copy.flexible, Varies: copy.varies };
  return { ...info, name: names[type] || info.name, classes: classes[info.classes] || info.classes, price: info.price };
}

export default function PortalDashboard() {
  const [location, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = usePortalAuth();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
  const { toast } = useToast();
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: any | null }>({ open: false, booking: null });
  const [formViewDialog, setFormViewDialog] = useState<{ open: boolean; slug: string | null }>({ open: false, slug: null });
  const [requiredFormSlug, setRequiredFormSlug] = useState<string | null>(null);
  const [metaTestVerification, setMetaTestVerification] = useState<MetaDiscoveryVerification | null>(
    () => getMetaDiscoveryVerification(),
  );
  const discoveryIntent = typeof window !== "undefined"
    && (new URLSearchParams(location.split("?")[1] || "").get("intent") === "discovery-pass"
      || window.localStorage.getItem("groundup-discovery-onboarding") === "1");
  const trackedFormsComplete = useRef(false);
  const discoveryVariant = typeof window !== "undefined" && window.localStorage.getItem("groundup-discovery-variant") === "B" ? "B" : "A";

  const { data: forms = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/forms"],
    enabled: isAuthenticated,
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/bookings"],
    enabled: isAuthenticated,
  });

  const { data: classReservations = [], isLoading: classReservationsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/my-classes"],
    enabled: isAuthenticated,
  });

  const { data: minorReservations = [], isLoading: minorReservationsLoading } = useQuery<any[]>({
    queryKey: ["/api/portal/minor-reservations"],
    enabled: isAuthenticated,
  });

  const { data: membership } = useQuery<any>({
    queryKey: ["/api/portal/my-membership"],
    enabled: isAuthenticated,
  });

  const { data: memberProgram } = useQuery<any>({
    queryKey: ["/api/portal/member-program"],
    enabled: isAuthenticated,
  });

  const { data: aiDelegationsData, isLoading: aiDelegationsLoading, isError: aiDelegationsError } = useQuery<{ delegations: AiDelegation[] }>({
    queryKey: ["/api/portal/me/ai-delegations"],
    enabled: import.meta.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED === "true"
      && isAuthenticated
      && user?.role === "member",
  });
  const [delegationLabel, setDelegationLabel] = useState("");
  const [delegationScopes, setDelegationScopes] = useState<AiDelegationScope[]>([
    "self:profile:read",
    "self:schedule:read",
    "self:reservations:read",
    "self:booking:preview",
  ]);
  const [delegationExpiresInHours, setDelegationExpiresInHours] = useState("24");
  const [newDelegationToken, setNewDelegationToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const createAiDelegation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/me/ai-delegations", {
      label: delegationLabel.trim() || undefined,
      scopes: delegationScopes,
      expiresInHours: Number(delegationExpiresInHours),
    })).json(),
    onSuccess: (result: { token: string }) => {
      setNewDelegationToken(result.token);
      setTokenCopied(false);
      setDelegationLabel("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me/ai-delegations"] });
      toast({ title: copy.aiDelegationCreated });
    },
    onError: (error: Error) => toast({
      title: copy.error,
      description: localizeApiError(error.message, locale, copy.aiDelegationFailed),
      variant: "destructive",
    }),
  });
  const revokeAiDelegation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/portal/me/ai-delegations/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me/ai-delegations"] });
      setNewDelegationToken(null);
      toast({ title: copy.aiDelegationRevoked });
    },
    onError: (error: Error) => toast({
      title: copy.error,
      description: localizeApiError(error.message, locale, copy.aiDelegationFailed),
      variant: "destructive",
    }),
  });

  const claimDiscovery = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/discovery/claim", {})).json(),
    onSuccess: (pass: { id?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/member-program"] });
       trackEvent("discovery_pass_activated", { locale, variant: discoveryVariant });
       track("discovery_pass_activated", "training", { funnel_kind: "discovery_pass", locale, variant: discoveryVariant });
      if (pass.id) trackMetaDiscoveryPassActivation(pass.id, locale);
      toast({ title: copy.discoveryPassTitle });
    },
    onError: (error: Error) => toast({
      title: copy.error,
      description: localizeApiError(error.message, locale, copy.loadError),
      variant: "destructive",
    }),
  });

  const { data: formDetail } = useQuery<any>({
    queryKey: ["/api/portal/forms", formViewDialog.slug],
    enabled: !!formViewDialog.slug && formViewDialog.open,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest("PUT", `/api/portal/bookings/${bookingId}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookings"] });
       toast({ title: copy.bookingCancelled, description: copy.sessionCancelled });
      setCancelDialog({ open: false, booking: null });
    },
    onError: (error: any) => {
      toast({ title: copy.error, description: localizeApiError(error.message, locale, copy.failedToCancelBooking), variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(portalPath("/portal/login"));
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const requiredForms = forms.filter((f: any) => f.isRequired);
  const completedRequired = requiredForms.filter((f: any) => f.responseStatus === "submitted").length;
  const allFormsComplete = requiredForms.length === 0 || completedRequired >= requiredForms.length;
  const discoveryOnboarding = discoveryIntent && user?.role === "member";
  const discoveryPassActive = Boolean(memberProgram?.discoveryPass);

  useEffect(() => {
    if (!isAuthenticated || authLoading || user?.role !== "member" || forms.length === 0) {
      setRequiredFormSlug(null);
      return;
    }
    const nextForm = requiredForms.find((form: any) => form.responseStatus !== "submitted");
    setRequiredFormSlug((current) => current || nextForm?.slug || null);
  }, [authLoading, forms, isAuthenticated, user?.role]);

  useEffect(() => {
    if (!discoveryOnboarding || !allFormsComplete || trackedFormsComplete.current) return;
    trackedFormsComplete.current = true;
    track("discovery_required_forms_completed", "training", { funnel_kind: "discovery_pass", locale, variant: discoveryVariant });
    trackEvent("discovery_required_forms_completed", { locale, variant: discoveryVariant });
  }, [allFormsComplete, discoveryOnboarding, locale]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <Loader2 className="animate-spin h-8 w-8 text-[#5EEBFF]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const metaTestMode = isMetaDiscoveryTestMode();

  const upcomingBookings = bookings.filter((b: any) => isFuture(new Date(b.start)) && b.status !== "canceled");
  const pastBookings = bookings.filter((b: any) => isPast(new Date(b.start)) || b.status === "canceled");
  const nextClassReservation = classReservations
    .filter((item: any) => ["confirmed", "waitlisted"].includes(item.status) && isFuture(new Date(item.occurrence?.start)))
    .sort((a: any, b: any) => new Date(a.occurrence.start).getTime() - new Date(b.occurrence.start).getTime())[0];

  const handleRequiredFormSubmitted = (completedSlug: string) => {
    const completedIndex = requiredForms.findIndex((form: any) => form.slug === completedSlug);
    const nextForm = requiredForms
      .slice(Math.max(0, completedIndex + 1))
      .find((form: any) => form.responseStatus !== "submitted");
    queryClient.invalidateQueries({ queryKey: ["/api/portal/forms"] });
    setRequiredFormSlug(nextForm?.slug || null);
  };

  const discoveryStep = !allFormsComplete ? 1 : !discoveryPassActive ? 2 : nextClassReservation ? 4 : 3;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" />{copy.complete}</Badge>;
      case "draft":
        return <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />{copy.draft}</Badge>;
      default:
        return <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs"><AlertCircle className="h-3 w-3 mr-1" />{copy.required}</Badge>;
    }
  };

  const bookingStatusLabel = (status: string) => ({
    canceled: copy.cancelled,
    confirmed: copy.confirmed,
    waitlisted: copy.waitlisted,
  }[status] || status);

  const nextCommunityClass = (() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 14) % 14;
    return addDays(today, daysUntilSaturday === 0 ? 14 : daysUntilSaturday);
  })();

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col">
      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {discoveryOnboarding && (
          <Card className="mb-4 border-[#5EEBFF]/30 bg-gradient-to-br from-[#5EEBFF]/10 via-[#121826] to-[#B06CFF]/10" data-testid="discovery-onboarding-card">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Dumbbell className="h-5 w-5 text-[#5EEBFF]" />
                {copy.discoveryOnboardingTitle}
              </CardTitle>
              <div className="grid grid-cols-4 gap-1 pt-3">
                {([
                  [copy.discoveryStepAccount, 0],
                  [copy.discoveryStepForms, 1],
                  [copy.discoveryStepActivate, 2],
                  [copy.discoveryStepBook, 3],
                ] as const).map(([label, index]) => {
                  const complete = index < discoveryStep;
                  const current = index === discoveryStep - 1;
                  return (
                    <div key={label as string} className="min-w-0">
                      <div className={`h-1.5 rounded-full ${complete ? "bg-[#5EEBFF]" : "bg-white/10"}`} />
                      <p className={`mt-1 truncate text-[10px] font-semibold ${current ? "text-[#5EEBFF]" : complete ? "text-gray-300" : "text-gray-500"}`}>{label as string}</p>
                    </div>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {!allFormsComplete ? (
                <>
                  <p className="text-lg font-bold text-white">{copy.discoveryAccountReady}</p>
                  <p className="mt-1 max-w-2xl text-sm text-gray-300">{copy.discoveryFormsNextStep}</p>
                  <Button asChild className="mt-4 min-h-11 bg-[#FFB199] font-bold text-[#0B0F14] hover:bg-[#FFCDB9]">
                    <Link href={`${portalPath(`/portal/forms/${requiredForms.find((f: any) => f.responseStatus !== "submitted")?.slug || ""}`)}?intent=discovery-pass`}>
                      {copy.discoveryCompleteForms}<ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : !discoveryPassActive ? (
                <>
                  <p className="text-lg font-bold text-white">{copy.discoveryFormsComplete}</p>
                  <p className="mt-1 max-w-2xl text-sm text-gray-300">{copy.discoveryActivationReady}</p>
                  <Button onClick={() => claimDiscovery.mutate()} disabled={claimDiscovery.isPending} className="mt-4 min-h-11 bg-[#5EEBFF] font-bold text-[#0B0F14] hover:bg-[#8af1ff]">
                    {claimDiscovery.isPending ? copy.loading : copy.discoveryActivate}<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-white">{copy.discoveryActive}</p>
                  <p className="mt-1 max-w-2xl text-sm text-gray-300">{copy.discoveryActiveBody}</p>
                  <Button asChild className="mt-4 min-h-11 bg-[#5EEBFF] font-bold text-[#0B0F14] hover:bg-[#8af1ff]">
                    <Link href={portalPath("/portal/schedule")}>{copy.discoveryBookFirstClass}<ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Welcome + Status Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
             <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">{copy.portalLabel}</p>
            <h2 className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
               {copy.welcomeBack}, <span className="text-[#5EEBFF]">{user?.firstName}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {allFormsComplete ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                 <span className="text-green-400 text-xs font-medium">{copy.allFormsDone}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 text-xs font-medium">{copy.formsCount(completedRequired, requiredForms.length)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Incomplete Forms Alert Banner */}
        {!allFormsComplete && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
               <p className="text-amber-300 text-sm font-medium">{copy.actionRequired}</p>
               <p className="text-amber-400/80 text-xs mt-0.5">{copy.completeRequiredForms}</p>
            </div>
            <Button size="sm" className="min-h-11 flex-shrink-0 bg-amber-500 px-3 text-xs text-white hover:bg-amber-600" asChild>
              <Link href={portalPath(`/portal/forms/${requiredForms.find((f: any) => f.responseStatus !== "submitted")?.slug || ""}`)}>
                 {copy.start}
              </Link>
            </Button>
          </div>
        )}

        {/* Quick Action Tiles — mobile-first 2-col row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href={portalPath("/portal/schedule")}>
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#B06CFF]/15 border border-[#B06CFF]/30 hover:bg-[#B06CFF]/20 transition-colors cursor-pointer h-full min-h-[80px]">
              <Calendar className="h-6 w-6 text-[#B06CFF]" />
              <span className="text-white text-sm font-semibold text-center leading-tight">{copy.viewSchedule}</span>
            </div>
          </Link>
          <Link href={portalPath("/portal/forms/personal-training-intake")}>
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#5EEBFF]/10 border border-[#5EEBFF]/20 hover:bg-[#5EEBFF]/15 transition-colors cursor-pointer h-full min-h-[80px]">
              <FileText className="h-6 w-6 text-[#5EEBFF]" />
               <span className="text-white text-sm font-semibold text-center leading-tight">{copy.forms}</span>
            </div>
          </Link>
        </div>

        {import.meta.env.VITE_MEMBER_AI_SELF_SERVICE_ENABLED === "true"
          && user?.role === "member"
          && <Card className="mb-4 border-[#B06CFF]/20 bg-[#121826]" data-testid="ai-delegation-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Shield className="h-4 w-4 text-[#B06CFF]" />
              {copy.aiDelegationTitle}
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">{copy.aiDelegationDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              {copy.aiDelegationSecurityWarning}
            </div>
            {newDelegationToken && (
              <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm font-semibold text-emerald-200">{copy.aiDelegationTokenTitle}</p>
                <p className="text-xs text-emerald-100/80">{copy.aiDelegationTokenWarning}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input readOnly value={newDelegationToken} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white" aria-label={copy.aiDelegationTokenTitle} />
                  <Button type="button" size="sm" variant="outline" className="border-white/15 text-gray-200 hover:bg-white/5" onClick={async () => {
                    try {
                      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
                      await navigator.clipboard.writeText(newDelegationToken);
                      setTokenCopied(true);
                    } catch {
                      setTokenCopied(false);
                      toast({
                        title: copy.error,
                        description: copy.aiDelegationCopyFailed,
                        variant: "destructive",
                      });
                    }
                  }}>
                    {tokenCopied ? copy.aiDelegationCopied : copy.aiDelegationCopy}
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-300">
                {copy.aiDelegationLabel}
                <input value={delegationLabel} onChange={(event) => setDelegationLabel(event.target.value)} placeholder={copy.aiDelegationLabelPlaceholder} maxLength={80} className="mt-1 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-gray-600" />
              </label>
              <label className="text-xs text-gray-300">
                {copy.aiDelegationExpiration}
                <select value={delegationExpiresInHours} onChange={(event) => setDelegationExpiresInHours(event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-[#0B0F14] px-3 py-2 text-sm text-white">
                  <option value="1">1 {copy.aiDelegationHour}</option>
                  <option value="24">24 {copy.aiDelegationHours}</option>
                  <option value="72">72 {copy.aiDelegationHours}</option>
                  <option value="168">7 {copy.aiDelegationDays}</option>
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="mb-2 text-xs text-gray-300">{copy.aiDelegationScopes}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {AI_DELEGATION_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-start gap-2 rounded-md border border-white/5 bg-white/[0.02] p-2 text-xs text-gray-300">
                    <input type="checkbox" checked={delegationScopes.includes(scope)} onChange={(event) => setDelegationScopes((current) => event.target.checked ? [...current, scope] : current.filter((item) => item !== scope))} className="mt-0.5 accent-[#5EEBFF]" />
                    <span>
                      <span className="font-medium">{copy.aiDelegationScopeLabels[scope]}</span>
                      {scope === "self:dependents:read" && <span className="mt-0.5 block text-[11px] text-gray-500">{copy.aiDelegationDependentsDescription}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="button" disabled={createAiDelegation.isPending || delegationScopes.length === 0} onClick={() => createAiDelegation.mutate()} className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90">
              {createAiDelegation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createAiDelegation.isPending ? copy.aiDelegationCreating : copy.aiDelegationCreate}
            </Button>
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{copy.aiDelegationCurrent}</p>
              {aiDelegationsLoading ? <p className="text-xs text-gray-500">{copy.loading}…</p> :
                aiDelegationsError ? <p className="text-xs text-amber-300">{copy.aiDelegationLoadError}</p> :
                !(aiDelegationsData?.delegations || []).length ? <p className="text-xs text-gray-500">{copy.aiDelegationNone}</p> :
                <div className="space-y-2">{aiDelegationsData?.delegations.map((delegation) => (
                  <div key={delegation.id} className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{delegation.label || copy.aiDelegationUnnamed}</p>
                      <p className="text-xs text-gray-400">{delegation.scopes.map((scope) => copy.aiDelegationScopeLabels[scope as AiDelegationScope] || scope).join(" · ")}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {delegation.revokedAt
                          ? copy.aiDelegationRevokedStatus
                          : delegation.active
                            ? copy.aiDelegationExpires
                            : copy.aiDelegationExpiredStatus}
                        : {new Date(delegation.expiresAt).toLocaleString(locale)}
                      </p>
                    </div>
                    {delegation.active && <Button type="button" size="sm" variant="outline" disabled={revokeAiDelegation.isPending} className="border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={() => {
                      if (window.confirm(copy.aiDelegationRevokeConfirm)) revokeAiDelegation.mutate(delegation.id);
                    }}>{revokeAiDelegation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}{copy.aiDelegationRevoke}</Button>}
                  </div>
                ))}</div>}
            </div>
          </CardContent>
        </Card>}

        <Card className="mb-4 border-[#5EEBFF]/20 bg-gradient-to-r from-[#5EEBFF]/10 to-[#B06CFF]/10">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Calendar className="h-4 w-4 text-[#5EEBFF]" />
              {copy.nextClass}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {classReservationsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin text-[#5EEBFF]" />{copy.loading}…</div>
            ) : nextClassReservation ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{nextClassReservation.occurrence.title}</p>
                  <p className="mt-1 text-sm text-gray-300">
                    {classDateLabel(nextClassReservation.occurrence.start, locale)} · {classTimeLabel(nextClassReservation.occurrence.start, nextClassReservation.occurrence.end, locale)}
                  </p>
                  <p className={`mt-2 text-xs font-semibold uppercase tracking-wider ${nextClassReservation.status === "waitlisted" ? "text-amber-300" : "text-emerald-300"}`}>
                    {nextClassReservation.status === "waitlisted" ? copy.waitlisted : copy.confirmed}
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full border-white/15 text-gray-200 hover:bg-white/5 sm:w-auto">
                  <Link href={portalPath("/portal/my-classes")}>{copy.viewMyClasses}</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-300">{copy.noUpcomingClasses}</p>
                  <p className="mt-1 text-xs text-gray-500">{copy.noUpcomingClassesDescription}</p>
                </div>
                <Button asChild size="sm" className="w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 sm:w-auto">
                  <Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {(minorReservationsLoading || minorReservations.length > 0) && (
          <Card className="mb-4 border-[#B06CFF]/20 bg-[#121826]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Users className="h-4 w-4 text-[#B06CFF]" />
                {copy.participantHistory}
              </CardTitle>
              <CardDescription className="text-xs">{copy.participantHistoryDescription}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {minorReservationsLoading ? <div className="flex items-center gap-2 py-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin text-[#5EEBFF]" />{copy.loading}…</div> :
                <div className="space-y-2">
                  {minorReservations.slice(0, 4).map((reservation: any) => (
                    <div key={reservation.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{reservation.participant.firstName} {reservation.participant.lastName}</p>
                          <p className="mt-1 break-words text-sm text-gray-300">{reservation.occurrence.title}</p>
                          <p className="mt-1 text-xs text-gray-500">{classDateLabel(reservation.occurrence.start, locale)} · {classTimeLabel(reservation.occurrence.start, reservation.occurrence.end, locale)}</p>
                        </div>
                        {reservation.participant.consentRevokedAt && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">{copy.consentRevokedStatus}</span>}
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {copy.reservationStatus}: <span className="text-gray-200">{reservation.status === "confirmed" ? copy.confirmed : reservation.status === "waitlisted" ? copy.waitlisted : copy.cancelled}</span>
                        {" · "}
                        {copy.attendanceOutcome}: <span className="text-gray-200">{reservation.attendance === "PRESENT" ? copy.attendancePresent : reservation.attendance === "NO_SHOW" ? copy.attendanceNoShow : reservation.attendance === "LATE_CANCEL" ? copy.attendanceLateCancel : reservation.attendance === "EXCUSED" ? copy.attendanceExcused : copy.attendanceNotRecorded}</span>
                      </p>
                    </div>
                  ))}
                  {minorReservations.length > 4 && <Button variant="outline" size="sm" className="mt-1 w-full border-white/10 text-gray-300 hover:bg-white/5" asChild><Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link></Button>}
                </div>}
            </CardContent>
          </Card>
        )}

        {metaTestMode && (
          <Card className="mb-4 border-amber-400/30 bg-amber-400/5">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base text-amber-200">Meta test events</CardTitle>
              <CardDescription className="text-xs text-amber-100/70">
                Development-only check. Open this Pixel in Meta Events Manager → Test Events first.
                This sends no activation request and uses no member data.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Button
                size="sm"
                className="bg-amber-300 text-[#0B0F14] hover:bg-amber-200"
                onClick={() => setMetaTestVerification(sendMetaDiscoveryTestEvent(locale))}
              >
                Send synthetic activation
              </Button>
              {metaTestVerification && (
                <div className="mt-3 space-y-1 text-xs text-amber-100/80">
                  <p>Event: {metaTestVerification.eventName}</p>
                  <p>Event ID: {metaTestVerification.eventId}</p>
                  <p>Consent: {metaTestVerification.consent}</p>
                  <p>
                    Exactly once:{" "}
                    {metaTestVerification.exactlyOnce === null
                      ? "blocked without consent"
                      : metaTestVerification.exactlyOnce
                        ? "yes"
                        : "no"}
                  </p>
                  <p>Payload: {metaTestVerification.payloadKeys.join(", ")} only</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main content grid: 1-col mobile, 2-col md, 3-col lg */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* MEMBERSHIP STATUS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <CreditCard className="h-4 w-4 text-[#B06CFF]" />
                 {copy.membership}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {membership ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#B06CFF]/10 border border-[#B06CFF]/20 rounded-lg">
                     <p className="text-xs text-[#B06CFF] font-semibold uppercase tracking-wider mb-1">{copy.activePlan}</p>
                        <p className="text-white font-semibold text-sm">{getMembershipInfo(membership.type, copy).name}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                       <span className="text-gray-400">{copy.price}</span>
                        <span className="text-white font-medium">{getMembershipInfo(membership.type, copy).price}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-gray-400">{copy.classesPerWeek}</span>
                        <span className="text-white font-medium">{getMembershipInfo(membership.type, copy).classes}</span>
                    </div>
                    {membership.endDate && (
                      <div className="flex justify-between">
                         <span className="text-gray-400">{copy.renews}</span>
                        <span className="text-white font-medium">{new Date(membership.endDate).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                       <span className="text-gray-400">{copy.status}</span>
                       <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs">{copy.active}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="w-10 h-10 rounded-full bg-[#B06CFF]/10 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-5 w-5 text-[#B06CFF]" />
                  </div>
                   <p className="text-gray-400 text-sm mb-3">{copy.noActiveMembership}</p>
                  <Button asChild size="sm" className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 w-full">
                     <Link href={locale === "es" ? "/es/programas" : "/pricing"}>{copy.viewPrograms}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MEMBER PROGRAM / DISCOVERY PASS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Dumbbell className="h-4 w-4 text-[#5EEBFF]" />
                {copy.memberProgram}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {memberProgram?.discoveryPass ? (
                <>
                  <div className="rounded-lg border border-[#5EEBFF]/20 bg-[#5EEBFF]/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5EEBFF]">{copy.discoveryPassTitle}</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {copy.discoveryUsage(
                        memberProgram.discoveryPass.entitlements.filter((entitlement: any) => ["BOOKED", "ATTENDED"].includes(entitlement.status)).length,
                        memberProgram.discoveryPass.entitlements.length,
                      )}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      {memberProgram.discoveryPass.entitlements.map((entitlement: any) => (
                        <div key={entitlement.id} className="flex items-center justify-between gap-3">
                          <span className="text-gray-300">{entitlement.category === "SKILL" ? copy.skillExperience : copy.strengthExperience}</span>
                          <Badge className="border-white/10 bg-black/20 text-gray-200">
                            {entitlement.status === "AVAILABLE" ? copy.available : entitlement.status === "BOOKED" ? copy.booked : copy.attended}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full bg-[#5EEBFF] text-[#0B0F14] hover:bg-[#5EEBFF]/90">
                    <Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link>
                  </Button>
                </>
              ) : memberProgram?.membership ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{copy.weeklyTraining}</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {copy.sessionsUsed(
                      Math.max(0, (memberProgram.weekly?.reserved || 0) - (memberProgram.weekly?.released || 0)),
                      memberProgram.weekly?.limit ?? null,
                    )}
                  </p>
                  <Button asChild size="sm" className="mt-3 w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90">
                    <Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-400">{copy.noActiveMembership}</p>
                  <Button onClick={() => claimDiscovery.mutate()} disabled={claimDiscovery.isPending || !allFormsComplete} size="sm" className="mt-3 w-full bg-[#5EEBFF] text-[#0B0F14] hover:bg-[#5EEBFF]/90">
                    {claimDiscovery.isPending ? copy.loading : copy.claimDiscoveryPass}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* UPCOMING SESSIONS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Calendar className="h-4 w-4 text-[#FFB199]" />
                 {copy.privateSessions}
              </CardTitle>
              <CardDescription className="text-xs">
                 {upcomingBookings.length} {copy.upcomingPrivateSessions}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-3">
                   <p className="text-gray-400 text-sm mb-3">{copy.noUpcomingSessions}</p>
                  <Button asChild size="sm" className="bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 w-full">
                    <Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm text-white">{new Date(booking.start).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}</p>
                        <p className="text-xs text-gray-400">{new Date(booking.start).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} · {booking.trainer?.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 w-11 flex-shrink-0 p-0 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                        onClick={() => setCancelDialog({ open: true, booking })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-1 border-white/10 hover:bg-white/5 text-gray-300 text-xs" asChild>
                    <Link href={portalPath("/portal/schedule")}>{copy.viewSchedule}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* REQUIRED FORMS */}
          <Card className="lg:col-span-2 bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <FileText className="h-4 w-4 text-[#5EEBFF]" />
                 {copy.requiredForms}
              </CardTitle>
              <CardDescription className="text-xs">
                {allFormsComplete
                   ? copy.allRequiredFormsComplete
                   : `${completedRequired} ${copy.of} ${requiredForms.length} ${copy.requiredFormsSubmitted}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {forms.map((form: any) => {
                  const IconComp = FORM_ICONS[form.slug] || FileText;
                  const statusColor =
                    form.responseStatus === "submitted" ? "bg-green-400" :
                    form.responseStatus === "draft" ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div key={form.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                      {/* Top row: icon + title + status dot */}
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <IconComp className="h-3.5 w-3.5 text-[#5EEBFF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-medium text-sm text-white leading-snug">{localizeFormText(locale, form.slug, "title", form.title)}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{form.isRequired ? copy.required : copy.optional}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${statusColor}`} />
                      </div>
                      {/* Bottom row: status badge + action button */}
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/5">
                        {getStatusBadge(form.responseStatus)}
                        {form.responseStatus === "submitted" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 px-3 text-xs text-[#5EEBFF] hover:bg-[#5EEBFF]/10 hover:text-[#5EEBFF]/80"
                            onClick={() => setFormViewDialog({ open: true, slug: form.slug })}
                          >
                              <Eye className="h-3 w-3 mr-1" />{copy.view}
                          </Button>
                        ) : (
                          <Button size="sm" className="min-h-11 px-4 text-xs bg-[#5EEBFF]/10 text-[#5EEBFF] border border-[#5EEBFF]/20 hover:bg-[#5EEBFF]/20" asChild>
                            <Link href={portalPath(`/portal/forms/${form.slug}`)}>
                               {form.responseStatus === "draft" ? copy.continue : `${copy.start} →`}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* COMMUNITY EVENTS */}
          <Card className="bg-[#121826] border-[#FFB199]/20">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Star className="h-4 w-4 text-[#FFB199]" />
                {copy.communityEvent}
              </CardTitle>
              <CardDescription className="text-xs">{copy.freeClassOpen}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="p-3 bg-[#FFB199]/10 border border-[#FFB199]/20 rounded-lg mb-3">
                <p className="text-[#FFB199] font-semibold text-sm mb-1">{copy.freeCommunitySelfDefense}</p>
                <p className="text-white text-base font-bold">{nextCommunityClass.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}</p>
                <p className="text-gray-400 text-xs mt-1">{copy.repeatsEveryTwoWeeks}</p>
              </div>
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                {copy.openToEveryone}
              </p>
              <Button asChild size="sm" className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href={locale === "es" ? "/es/contacto" : "/contact"}>{copy.learnMore}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS — desktop only (mobile has tile row above) */}
          <Card className="hidden md:block bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-white text-base">{copy.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <a
                href="https://1club.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-[#5EEBFF]/10 border border-[#5EEBFF]/20 text-[#5EEBFF] text-sm font-medium hover:bg-[#5EEBFF]/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                    {copy.trackMyProgress}
                </div>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button className="w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 justify-between" asChild>
                <Link href={portalPath("/portal/schedule")}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {copy.viewSchedule}
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-gray-300 justify-between text-sm" asChild>
                <Link href={locale === "es" ? "/es" : "/"}>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                     {copy.backToWebsiteLabel}
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* PAST SESSIONS */}
        {pastBookings.length > 0 && (
          <Card className="mt-4 bg-[#121826] border-white/10">
            <CardHeader className="pt-4 px-4">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-gray-400" />
                {copy.pastSessions}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {pastBookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div>
                         <p className="font-medium text-sm text-white">{new Date(booking.start).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}</p>
                      <p className="text-xs text-gray-400">{booking.trainer?.name}</p>
                    </div>
                    <Badge variant={booking.status === "canceled" ? "destructive" : "secondary"} className="text-xs">
                       {bookingStatusLabel(booking.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* PORTAL FOOTER */}
      <footer className="border-t border-white/5 mt-6 py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Ground Up Jiu-Jitsu &amp; Fitness
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 text-xs">
            <Link href={portalPath("/portal/forms/liability-waiver")} className="text-gray-500 hover:text-gray-300 transition-colors">{copy.liabilityWaiver}</Link>
            <Link href={portalPath("/portal/forms/gym-rules")} className="text-gray-500 hover:text-gray-300 transition-colors">{copy.gymRules}</Link>
            <Link href={locale === "es" ? "/es/contacto" : "/contact"} className="text-gray-500 hover:text-gray-300 transition-colors">{copy.contactUs}</Link>
          </div>
        </div>
      </footer>

      {/* CANCEL DIALOG */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: open ? cancelDialog.booking : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white mx-4 rounded-xl">
          <DialogHeader>
             <DialogTitle className="text-white">{copy.cancelReservation}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {cancelDialog.booking && (
                <>
                   {copy.cancelSessionPrompt}{" "}
                   <strong className="text-white">{new Date(cancelDialog.booking.start).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}</strong> {copy.at}{" "}
                   <strong className="text-white">{new Date(cancelDialog.booking.start).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}</strong>?
                  {isSameDay(new Date(), new Date(cancelDialog.booking.start)) && (
                    <div className="mt-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-300 text-sm">
                       <strong>{copy.sameDayCancellationFee}</strong> {copy.sameDayFeeCharged}
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5" onClick={() => setCancelDialog({ open: false, booking: null })}>
               {copy.keepBooking}
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelDialog.booking && cancelMutation.mutate(cancelDialog.booking.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {cancelDialog.booking && isSameDay(new Date(), new Date(cancelDialog.booking.start))
                  ? copy.cancelWithFee
                  : copy.cancelReservation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FORM VIEW DIALOG */}
      <Dialog open={formViewDialog.open} onOpenChange={(open) => setFormViewDialog({ open, slug: open ? formViewDialog.slug : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto mx-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {formDetail?.form?.title ? localizeFormText(locale, formViewDialog.slug || undefined, "title", formDetail.form.title) : copy.formDetails}
            </DialogTitle>
            {formDetail?.response?.submittedAt && (
              <p className="text-xs text-gray-400">
                {copy.submittedAt} {new Date(formDetail.response.submittedAt).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })} {copy.at} {new Date(formDetail.response.submittedAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {formDetail?.form?.fields && formDetail?.response?.answers && (
              (Array.isArray(formDetail.form.fields) ? formDetail.form.fields : []).map((field: any) => {
                const fieldKey = field.name || field.id;
                const answer = formDetail.response.answers[fieldKey];
                const isCheckbox = field.type === "checkbox";
                const isBoolean = field.type === "boolean";
                if (!isCheckbox && !isBoolean && (answer === undefined || answer === null || answer === "")) return null;
                if (isCheckbox) {
                  const agreed = answer === true;
                  return (
                    <div key={fieldKey} className="flex items-start gap-3 py-2 border-b border-white/5">
                      <div className={`mt-0.5 flex-shrink-0 ${agreed ? "text-green-400" : "text-red-400"}`}>
                        {agreed ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{localizeFormText(locale, formViewDialog.slug || undefined, "field", field.label, fieldKey)}</p>
                        <p className={`text-sm font-medium ${agreed ? "text-green-300" : "text-red-300"}`}>
                          {agreed ? copy.agreed : copy.notAgreed}
                        </p>
                      </div>
                    </div>
                  );
                }
                if (isBoolean) {
                  const val = answer === true || answer === "true";
                  return (
                    <div key={fieldKey} className="flex items-start gap-3 py-2 border-b border-white/5">
                      <div className={`mt-0.5 flex-shrink-0 ${val ? "text-amber-400" : "text-green-400"}`}>
                        {val ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{localizeFormText(locale, formViewDialog.slug || undefined, "field", field.label, fieldKey)}</p>
                        <p className="text-sm font-medium text-white">{val ? copy.yes : copy.no}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={fieldKey} className="py-2 border-b border-white/5">
                    <p className="text-xs text-gray-400 mb-0.5">{localizeFormText(locale, formViewDialog.slug || undefined, "field", field.label, fieldKey)}</p>
                    <p className="text-sm text-white break-words">{String(answer)}</p>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!requiredFormSlug}
        onOpenChange={() => undefined}
      >
        <DialogContent
          className="max-w-3xl border-[#5EEBFF]/30 bg-[#0B0F14] p-0 text-white"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="border-b border-white/10 px-5 pb-4 pt-5 pr-12">
            <DialogTitle className="text-left text-white">{copy.actionRequired}</DialogTitle>
            <DialogDescription className="text-left text-gray-400">
              {copy.completeRequiredForms}{" "}
              {requiredForms.length > 0 && `(${copy.formsCount(completedRequired, requiredForms.length)})`}
            </DialogDescription>
          </DialogHeader>
          {requiredFormSlug && (
            <PortalForm
              embedded
              formSlug={requiredFormSlug}
              onSubmitted={handleRequiredFormSubmitted}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
