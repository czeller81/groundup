import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, Check, ChevronRight, Loader2, Plus, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocale } from "@/lib/locale";
import { useToast } from "@/hooks/use-toast";

type PlanDraft = {
  internalKey: string;
  displayName: string;
  weeklySessionLimit: string;
  eligibleClassCategories: string[];
  bookingWindowHours: string;
  weekStartDay: string;
  timezone: string;
  waitlistAllowed: boolean;
  cancellationCutoffHours: string;
  lateCancelPolicy: string;
  noShowPolicy: string;
  rolloverPolicy: string;
  privateSessionsPerMonth: string;
  personalizedProgram: boolean;
  displayPriceCents: string;
  active: boolean;
};

const emptyPlan: PlanDraft = {
  internalKey: "",
  displayName: "",
  weeklySessionLimit: "2",
  eligibleClassCategories: ["skill", "strength"],
  bookingWindowHours: "168",
  weekStartDay: "1",
  timezone: "America/Los_Angeles",
  waitlistAllowed: true,
  cancellationCutoffHours: "4",
  lateCancelPolicy: "consume",
  noShowPolicy: "consume",
  rolloverPolicy: "none",
  privateSessionsPerMonth: "0",
  personalizedProgram: false,
  displayPriceCents: "",
  active: true,
};

function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export default function AdminPilotOps() {
  const { locale, copy } = useLocale();
  const { toast } = useToast();
  const [planDraft, setPlanDraft] = useState<PlanDraft>(emptyPlan);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [passFilter, setPassFilter] = useState("all");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reason, setReason] = useState("");

  const plans = useQuery<any[]>({ queryKey: ["/api/portal/admin/membership-plans"] });
  const passes = useQuery<any[]>({
    queryKey: ["/api/portal/admin/discovery", passFilter],
    queryFn: async () => {
      const response = await fetch(`/api/portal/admin/discovery?filter=${encodeURIComponent(passFilter)}`);
      if (!response.ok) throw new Error("DISCOVERY_LIST_FAILED");
      return response.json();
    },
  });
  const members = useQuery<{ users: any[] }>({
    queryKey: ["/api/portal/admin/members", "pilot-ops"],
    queryFn: async () => {
      const response = await fetch("/api/portal/admin/members?limit=100&page=1");
      if (!response.ok) throw new Error("MEMBERS_LOAD_FAILED");
      return response.json();
    },
  });
  const report = useQuery<any>({
    queryKey: ["/api/portal/admin/member-report"],
    queryFn: async () => {
      const response = await fetch("/api/portal/admin/member-report");
      if (!response.ok) throw new Error("REPORT_LOAD_FAILED");
      return response.json();
    },
  });
  const program = useQuery<any>({
    queryKey: ["/api/portal/admin/members", selectedMemberId, "program"],
    queryFn: async () => {
      const response = await fetch(`/api/portal/admin/members/${selectedMemberId}/program`);
      if (!response.ok) throw new Error("PROGRAM_LOAD_FAILED");
      return response.json();
    },
    enabled: Boolean(selectedMemberId),
  });

  useEffect(() => {
    if (!editingPlanId) {
      setPlanDraft(emptyPlan);
      return;
    }
    const plan = plans.data?.find((item) => item.id === editingPlanId);
    if (!plan) return;
    setPlanDraft({
      internalKey: plan.internalKey,
      displayName: plan.displayName,
      weeklySessionLimit: plan.weeklySessionLimit == null ? "" : String(plan.weeklySessionLimit),
      eligibleClassCategories: Array.isArray(plan.eligibleClassCategories) ? plan.eligibleClassCategories : ["skill", "strength"],
      bookingWindowHours: String(plan.bookingWindowHours),
      weekStartDay: String(plan.weekStartDay),
      timezone: plan.timezone,
      waitlistAllowed: plan.waitlistAllowed,
      cancellationCutoffHours: String(plan.cancellationCutoffHours),
      lateCancelPolicy: plan.lateCancelPolicy,
      noShowPolicy: plan.noShowPolicy,
      rolloverPolicy: plan.rolloverPolicy,
      privateSessionsPerMonth: String(plan.privateSessionsPerMonth),
      personalizedProgram: plan.personalizedProgram,
      displayPriceCents: plan.displayPriceCents == null ? "" : String(plan.displayPriceCents),
      active: plan.active,
    });
  }, [editingPlanId, plans.data]);

  const planMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...planDraft,
        weeklySessionLimit: numberOrNull(planDraft.weeklySessionLimit),
        bookingWindowHours: Number(planDraft.bookingWindowHours),
        weekStartDay: Number(planDraft.weekStartDay),
        cancellationCutoffHours: Number(planDraft.cancellationCutoffHours),
        privateSessionsPerMonth: Number(planDraft.privateSessionsPerMonth),
        displayPriceCents: numberOrNull(planDraft.displayPriceCents),
      };
      const response = await apiRequest(editingPlanId ? "PATCH" : "POST", editingPlanId
        ? `/api/portal/admin/membership-plans/${editingPlanId}`
        : "/api/portal/admin/membership-plans", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/membership-plans"] });
      setEditingPlanId(null);
      setPlanDraft(emptyPlan);
      toast({ title: copy.savePlan });
    },
  });

  const planToggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await apiRequest("PATCH", `/api/portal/admin/membership-plans/${id}`, { active })).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/membership-plans"] }),
  });

  const passMutation = useMutation({
    mutationFn: async ({ passId, action, category }: { passId: string; action: string; category?: string }) =>
      (await apiRequest("PATCH", `/api/portal/admin/discovery/${passId}`, {
        action,
        category,
        reason: reason.trim() || copy.actionReason,
        days: action === "extend" ? 7 : undefined,
        followUpState: action === "follow_up" ? "PENDING" : undefined,
      })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/discovery"] });
      setReason("");
      toast({ title: copy.statusUpdated });
    },
  });

  const issueMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/portal/admin/discovery/${selectedMemberId}/issue`, {
      reason: reason.trim() || copy.actionReason,
      override: false,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/discovery"] });
      setReason("");
      toast({ title: copy.issueDiscovery });
    },
  });

  const programMutation = useMutation({
    mutationFn: async ({ action, planId, lifecycle }: { action: string; planId?: string; lifecycle?: string }) =>
      (await apiRequest("PATCH", `/api/portal/admin/members/${selectedMemberId}/program`, {
        action,
        planId,
        lifecycle,
        reason: reason.trim() || copy.actionReason,
      })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members", selectedMemberId, "program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/members"] });
      setReason("");
      toast({ title: copy.statusUpdated });
    },
  });

  const reportTotals = report.data?.totals;
  const selectedPass = useMemo(() => passes.data?.find((pass) => pass.user?.id === selectedMemberId), [passes.data, selectedMemberId]);
  const dateLabel = (value: string | Date) => new Date(value).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  const updatePlan = (key: keyof PlanDraft, value: unknown) => setPlanDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="mb-6 space-y-6" data-testid="pilot-operations">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#5EEBFF]">{copy.pilotOperations}</p>
        <h2 className="mt-1 text-xl font-black uppercase text-white">{copy.memberProgramLabel}</h2>
      </div>

      <Card className="border-white/5 bg-[#121826]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Activity className="h-5 w-5 text-[#5EEBFF]" />{copy.capacityReport}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {report.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#5EEBFF]" /> : !reportTotals ? <p className="text-sm text-gray-400">{copy.noData}</p> : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  [copy.totalSeats, reportTotals.totalSeats],
                  [copy.reservedLabelLong, reportTotals.reserved],
                  [copy.attendedLabel, reportTotals.attended],
                  [copy.waitlistedLabel, reportTotals.waitlisted],
                  [copy.reservationUtilization, `${reportTotals.reservationUtilization}%`],
                  [copy.attendanceUtilization, `${reportTotals.attendanceUtilization}%`],
                  [copy.noShows, reportTotals.noShows],
                ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-white/5 bg-[#0B0F14] p-3"><p className="text-lg font-bold text-white">{value}</p><p className="text-[11px] text-gray-500">{label}</p></div>)}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  [copy.weeklyDemand, reportTotals.weeklyEntitlementDemand],
                  [copy.passesClaimed, reportTotals.passesClaimed],
                  [copy.discoveryCompleted, reportTotals.discoveryCompleted],
                  [copy.converted, reportTotals.converted],
                  [copy.conversionRate, `${reportTotals.conversionRate}%`],
                ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#B06CFF]/20 bg-[#B06CFF]/5 p-3"><p className="text-lg font-bold text-white">{value}</p><p className="text-[11px] text-gray-400">{label}</p></div>)}
              </div>
              <div className="space-y-2">
                {report.data.classes?.map((item: any) => <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-white/5 bg-[#0B0F14] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-medium text-white">{item.title}</p><p className="text-xs text-gray-500">{dateLabel(item.start)} · {new Date(item.start).toLocaleTimeString(locale === "es" ? "es-US" : "en-US", { hour: "numeric", minute: "2-digit" })}</p></div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-300"><span>{copy.capacity}: {item.capacity}</span><span>{copy.reservedLabel}: {item.reserved}</span><span>{copy.attendedLabel}: {item.attended}</span><span>{copy.waitlistedLabel}: {item.waitlisted}</span><span>{item.attendanceUtilization}%</span></div>
                </div>)}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#121826]">
        <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-white">{copy.membershipPlans}</CardTitle><Button size="sm" className="bg-[#B06CFF] text-white" onClick={() => { setEditingPlanId(null); setPlanDraft(emptyPlan); }}><Plus className="mr-1 h-4 w-4" />{copy.createPlan}</Button></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2">
            {(plans.data || []).map((plan) => <button key={plan.id} onClick={() => setEditingPlanId(plan.id)} className={`flex min-h-16 w-full items-center justify-between rounded-lg border p-3 text-left ${editingPlanId === plan.id ? "border-[#5EEBFF]/50 bg-[#5EEBFF]/10" : "border-white/5 bg-[#0B0F14]"}`}>
              <span><strong className="block text-sm text-white">{plan.displayName}</strong><span className="text-xs text-gray-500">{plan.internalKey} · {plan.weeklySessionLimit ?? "∞"} {copy.weeklySessions.toLowerCase()}</span></span>
              <Badge className={plan.active ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-400"}>{plan.active ? copy.active : copy.deactivate}</Badge>
            </button>)}
          </div>
          <div className="rounded-lg border border-white/5 bg-[#0B0F14] p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-white">{editingPlanId ? copy.editPlan : copy.createPlan}</h3>{editingPlanId && <Button variant="ghost" size="sm" onClick={() => setEditingPlanId(null)}>{copy.close}</Button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>{copy.planName}</Label><Input value={planDraft.displayName} onChange={(event) => updatePlan("displayName", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.internalKey}</Label><Input disabled={Boolean(editingPlanId)} value={planDraft.internalKey} onChange={(event) => updatePlan("internalKey", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.weeklySessions}</Label><Input type="number" min="0" value={planDraft.weeklySessionLimit} onChange={(event) => updatePlan("weeklySessionLimit", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.bookingWindowHours}</Label><Input type="number" min="1" value={planDraft.bookingWindowHours} onChange={(event) => updatePlan("bookingWindowHours", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.weekStart}</Label><Select value={planDraft.weekStartDay} onValueChange={(value) => updatePlan("weekStartDay", value)}><SelectTrigger className="mt-1 border-white/10 bg-[#121826] text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Monday</SelectItem><SelectItem value="0">Sunday</SelectItem></SelectContent></Select></div>
              <div><Label>{copy.timezone}</Label><Input value={planDraft.timezone} onChange={(event) => updatePlan("timezone", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.cancellationCutoff}</Label><Input type="number" min="0" value={planDraft.cancellationCutoffHours} onChange={(event) => updatePlan("cancellationCutoffHours", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.privateSessionsMonth}</Label><Input type="number" min="0" value={planDraft.privateSessionsPerMonth} onChange={(event) => updatePlan("privateSessionsPerMonth", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.displayPrice}</Label><Input type="number" min="0" value={planDraft.displayPriceCents} onChange={(event) => updatePlan("displayPriceCents", event.target.value)} className="mt-1 border-white/10 bg-[#121826] text-white" /></div>
              <div><Label>{copy.lateCancelBehavior}</Label><Select value={planDraft.lateCancelPolicy} onValueChange={(value) => updatePlan("lateCancelPolicy", value)}><SelectTrigger className="mt-1 border-white/10 bg-[#121826] text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="consume">Consume</SelectItem><SelectItem value="release">Release</SelectItem></SelectContent></Select></div>
              <div><Label>{copy.noShowBehavior}</Label><Select value={planDraft.noShowPolicy} onValueChange={(value) => updatePlan("noShowPolicy", value)}><SelectTrigger className="mt-1 border-white/10 bg-[#121826] text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="consume">Consume</SelectItem><SelectItem value="release">Release</SelectItem></SelectContent></Select></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="w-full text-xs text-gray-400">{copy.eligibleCategories}</span>
              {(["skill", "strength"] as const).map((category) => <Button key={category} type="button" size="sm" variant="outline" className={planDraft.eligibleClassCategories.includes(category) ? "border-[#5EEBFF]/50 bg-[#5EEBFF]/10 text-[#5EEBFF]" : "border-white/10 text-gray-400"} onClick={() => updatePlan("eligibleClassCategories", planDraft.eligibleClassCategories.includes(category) ? planDraft.eligibleClassCategories.filter((item) => item !== category) : [...planDraft.eligibleClassCategories, category])}>{planDraft.eligibleClassCategories.includes(category) && <Check className="mr-1 h-3 w-3" />}{category === "skill" ? copy.skill : copy.strength}</Button>)}
              <Button type="button" size="sm" variant="outline" className={planDraft.waitlistAllowed ? "border-[#5EEBFF]/50 text-[#5EEBFF]" : "border-white/10 text-gray-400"} onClick={() => updatePlan("waitlistAllowed", !planDraft.waitlistAllowed)}>{copy.waitlistAllowed}</Button>
              <Button type="button" size="sm" variant="outline" className={planDraft.personalizedProgram ? "border-[#B06CFF]/50 text-[#B06CFF]" : "border-white/10 text-gray-400"} onClick={() => updatePlan("personalizedProgram", !planDraft.personalizedProgram)}>{copy.personalizedProgram}</Button>
            </div>
            <Button className="mt-4 bg-[#5EEBFF] text-[#0B0F14]" disabled={planMutation.isPending || !planDraft.displayName || !planDraft.internalKey} onClick={() => planMutation.mutate()}>{planMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{copy.savePlan}</Button>
            {editingPlanId && <Button variant="outline" className="ml-2 mt-4 border-white/10 text-gray-300" onClick={() => planToggle.mutate({ id: editingPlanId, active: !planDraft.active })}>{planDraft.active ? copy.deactivate : copy.activate}</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#121826]">
        <CardHeader><CardTitle className="text-white">{copy.discoveryPasses}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={passFilter} onValueChange={setPassFilter}><SelectTrigger className="border-white/10 bg-[#0B0F14] text-white"><SelectValue /></SelectTrigger><SelectContent>{[["all", copy.allPasses], ["active", copy.active], ["completed", copy.complete], ["expiring", copy.expiringSoon], ["converted", copy.converted], ["expired", copy.expiration], ["follow_up", copy.followUp]].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedMemberId || "none"} onValueChange={(value) => setSelectedMemberId(value === "none" ? "" : value)}><SelectTrigger className="border-white/10 bg-[#0B0F14] text-white"><SelectValue placeholder={copy.issueDiscovery} /></SelectTrigger><SelectContent><SelectItem value="none">{copy.selectMember}</SelectItem>{(members.data?.users || []).map((member) => <SelectItem key={member.id} value={member.id}>{member.firstName} {member.lastName}</SelectItem>)}</SelectContent></Select>
            <Button disabled={!selectedMemberId || issueMutation.isPending} onClick={() => issueMutation.mutate()} className="bg-[#5EEBFF] text-[#0B0F14]">{copy.issueDiscovery}</Button>
          </div>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={copy.actionReason} className="border-white/10 bg-[#0B0F14] text-white placeholder:text-gray-500" />
          <div className="grid gap-3 lg:grid-cols-2">
            {(passes.data || []).map((pass) => <div key={pass.id} className={`rounded-lg border p-4 ${selectedPass?.id === pass.id ? "border-[#5EEBFF]/40 bg-[#5EEBFF]/5" : "border-white/5 bg-[#0B0F14]"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{pass.user.firstName} {pass.user.lastName}</p><p className="text-xs text-gray-500">{pass.user.email}</p></div><Badge className="border-white/10 bg-white/5 text-gray-200">{pass.displayState}</Badge></div>
              <p className="mt-3 text-xs text-gray-400">{copy.claimDate}: {dateLabel(pass.claimTimestamp)} · {copy.expiration}: {dateLabel(pass.expirationTimestamp)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">{pass.entitlements.map((entitlement: any) => <div key={entitlement.id} className="rounded border border-white/5 p-2 text-xs text-gray-300">{entitlement.category === "SKILL" ? copy.skill : copy.strength}: <strong className="text-white">{entitlement.status}</strong></div>)}</div>
              <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => passMutation.mutate({ passId: pass.id, action: "extend" })}>{copy.extend}</Button><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => passMutation.mutate({ passId: pass.id, action: "restore", category: "SKILL" })}>{copy.restoreSkill}</Button><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => passMutation.mutate({ passId: pass.id, action: "restore", category: "STRENGTH" })}>{copy.restoreStrength}</Button><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => passMutation.mutate({ passId: pass.id, action: "follow_up" })}>{copy.markFollowUp}</Button><Button size="sm" className="bg-[#B06CFF] text-white" onClick={() => passMutation.mutate({ passId: pass.id, action: "convert" })}>{copy.convertToMember}</Button></div>
            </div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#121826]">
        <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Users className="h-5 w-5 text-[#B06CFF]" />{copy.memberProgramLabel}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-2">{(members.data?.users || []).slice(0, 30).map((member) => <button key={member.id} onClick={() => setSelectedMemberId(member.id)} className={`flex min-h-14 w-full items-center justify-between rounded-lg border p-3 text-left ${selectedMemberId === member.id ? "border-[#B06CFF]/40 bg-[#B06CFF]/10" : "border-white/5 bg-[#0B0F14]"}`}><span><strong className="block text-sm text-white">{member.firstName} {member.lastName}</strong><span className="text-xs text-gray-500">{member.email}</span></span><ChevronRight className="h-4 w-4 text-gray-500" /></button>)}</div>
          <div className="rounded-lg border border-white/5 bg-[#0B0F14] p-4">
            {!selectedMemberId ? <p className="text-sm text-gray-400">{copy.selectMemberProfile}</p> : program.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#B06CFF]" /> : program.data ? <div className="space-y-4">
              <div><h3 className="font-semibold text-white">{program.data.member.firstName} {program.data.member.lastName}</h3><p className="text-xs text-gray-500">{program.data.member.email}</p></div>
              <div className="grid gap-2 sm:grid-cols-3"><div><p className="text-xs text-gray-500">{copy.lifecycle}</p><p className="text-sm text-white">{program.data.lifecycle?.currentState || "PROSPECT"}</p></div><div><p className="text-xs text-gray-500">{copy.currentPlan}</p><p className="text-sm text-white">{program.data.activeMembership?.plan?.displayName || copy.noActiveMembership}</p></div><div><p className="text-xs text-gray-500">{copy.discoveryPasses}</p><p className="text-sm text-white">{program.data.discoveryPass?.displayState || "—"}</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><Label>{copy.assignPlan}</Label><Select onValueChange={(planId) => programMutation.mutate({ action: "assign_plan", planId })}><SelectTrigger className="mt-1 border-white/10 bg-[#121826] text-white"><SelectValue placeholder={copy.currentPlan} /></SelectTrigger><SelectContent>{(plans.data || []).filter((plan) => plan.active).map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.displayName}</SelectItem>)}</SelectContent></Select></div><div><Label>{copy.lifecycle}</Label><Select value={program.data.lifecycle?.currentState || "PROSPECT"} onValueChange={(lifecycle) => programMutation.mutate({ action: "lifecycle", lifecycle })}><SelectTrigger className="mt-1 border-white/10 bg-[#121826] text-white"><SelectValue /></SelectTrigger><SelectContent>{["PROSPECT", "DISCOVERY_PASS", "ACTIVE_MEMBER", "INACTIVE"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => programMutation.mutate({ action: "pause" })}>{copy.pauseMembership}</Button><Button size="sm" variant="outline" className="border-white/10 text-gray-300" onClick={() => programMutation.mutate({ action: "cancel" })}>{copy.cancelMembership}</Button><Button size="sm" className="bg-[#5EEBFF] text-[#0B0F14]" onClick={() => programMutation.mutate({ action: "activate" })}>{copy.activateMembership}</Button></div>
              <div><p className="text-xs text-gray-500">{copy.goals}</p>{program.data.goals?.length ? <div className="mt-1 flex flex-wrap gap-2">{program.data.goals.map((goal: any) => <Badge key={goal.id} className="border-white/10 bg-white/5 text-gray-300">{goal.goal}</Badge>)}</div> : <p className="text-sm text-gray-400">{copy.noGoals}</p>}</div>
            </div> : <p className="text-sm text-gray-400">{copy.noData}</p>}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}