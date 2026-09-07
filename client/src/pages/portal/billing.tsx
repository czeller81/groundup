import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AlertCircle, Check, Clock3, CreditCard, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { localizedPortalPath } from "@/lib/portal-navigation";
import { useLocale } from "@/lib/locale";
import { usePortalAuth } from "@/lib/portal-auth";

type BillingPlan = {
  id: string;
  internalKey: string;
  displayName: string;
  displayPriceCents: number | null;
  stripePriceId: string | null;
  checkoutReady: boolean;
  catalog: {
    description: string;
    weeklySessionLimit: number | null;
    privateSessionsPerMonth: number;
    personalizedProgram: boolean;
    featured?: boolean;
    audience: "adult" | "guardian_minor";
  };
};

const PLAN_COPY: Record<string, {
  en: { name: string; description: string; entitlement: string };
  es: { name: string; description: string; entitlement: string };
}> = {
  ground_up_2: {
    en: { name: "Ground Up 2", description: "A steady weekly rhythm for adult group training.", entitlement: "2 adult group sessions each week" },
    es: { name: "Ground Up 2", description: "Un ritmo semanal constante para entrenamiento grupal de adultos.", entitlement: "2 sesiones grupales de adultos por semana" },
  },
  ground_up_3: {
    en: { name: "Ground Up 3", description: "Our featured plan for building momentum and consistency.", entitlement: "3 adult group sessions each week" },
    es: { name: "Ground Up 3", description: "Nuestro plan destacado para crear impulso y constancia.", entitlement: "3 sesiones grupales de adultos por semana" },
  },
  ground_up_personal: {
    en: { name: "Ground Up Personal", description: "Individual coaching built around your goals.", entitlement: "1 private session each week; no group entitlement" },
    es: { name: "Ground Up Personal", description: "Coaching individual diseñado para tus metas.", entitlement: "1 sesión privada por semana; no incluye clases grupales" },
  },
  girls_program: {
    en: { name: "Girls Program", description: "A guardian-owned plan for an approved minor participant.", entitlement: "2 girls' classes each week" },
    es: { name: "Girls Program", description: "Un plan del tutor para una participante menor aprobada.", entitlement: "2 clases de niñas por semana" },
  },
};

function errorPayload(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const jsonStart = message.indexOf("{");
  if (jsonStart < 0) return { code: "", message };
  try {
    return JSON.parse(message.slice(jsonStart));
  } catch {
    return { code: "", message };
  }
}

export default function PortalBilling() {
  const { locale } = useLocale();
  const { isLoading: authLoading, isAuthenticated } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const spanish = locale === "es";
  const portalPath = (path: string) => localizedPortalPath(path, locale);

  const { data: billing, isLoading: billingLoading } = useQuery<any>({
    queryKey: ["/api/portal/billing"],
    enabled: isAuthenticated,
    refetchInterval: (query) => query.state.data?.pendingMembership ? 3000 : false,
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["/api/portal/billing/plans"],
    enabled: isAuthenticated,
  });
  const { data: minors = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/minors"],
    enabled: isAuthenticated && plans.some((plan) => plan.internalKey === "girls_program"),
  });

  const approvedMinors = useMemo(() => minors.filter((minor) => !minor.consentRevokedAt), [minors]);
  const [selectedMinorId, setSelectedMinorId] = useState("");

  useEffect(() => {
    if (!approvedMinors.some((minor) => minor.id === selectedMinorId)) {
      setSelectedMinorId(approvedMinors[0]?.id || "");
    }
  }, [approvedMinors, selectedMinorId]);

  const checkout = useMutation({
    mutationFn: async ({ planKey, minorProfileId }: { planKey: string; minorProfileId?: string }) => {
      const response = await apiRequest("POST", "/api/portal/billing/checkout", {
        planKey,
        ...(minorProfileId ? { minorProfileId } : {}),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
    },
    onError: (error) => {
      const payload = errorPayload(error);
      if (payload.code === "REQUIRED_FORMS_INCOMPLETE") {
        toast({
          title: spanish ? "Completa tus formularios primero" : "Complete your forms first",
          description: spanish ? "Tu información requerida debe estar enviada antes de comenzar." : "Your required information must be submitted before starting.",
          variant: "destructive",
        });
      } else {
        toast({
          title: spanish ? "No se pudo iniciar el pago" : "Checkout could not start",
          description: payload.message || (spanish ? "Inténtalo de nuevo." : "Please try again."),
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/portal/billing"] });
    },
  });

  const openPortal = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/billing/portal", {})).json(),
    onSuccess: (data) => window.location.assign(data.url),
    onError: (error) => toast({
      title: spanish ? "No se pudo abrir la configuración" : "Billing settings unavailable",
      description: errorPayload(error).message || (spanish ? "Inténtalo de nuevo." : "Please try again."),
      variant: "destructive",
    }),
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/portal/billing/cancel", {})).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/billing"] });
      toast({ title: spanish ? "Cancelación programada" : "Cancellation scheduled" });
    },
    onError: (error) => toast({
      title: spanish ? "No se pudo programar la cancelación" : "Cancellation could not be scheduled",
      description: errorPayload(error).message,
      variant: "destructive",
    }),
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation(portalPath("/portal/login"));
  }, [authLoading, isAuthenticated, setLocation, locale]);

  useEffect(() => {
    const checkoutState = new URLSearchParams(window.location.search).get("checkout");
    if (checkoutState === "success") {
      toast({
        title: spanish ? "Pago recibido" : "Payment received",
        description: spanish ? "Tu membresía se activará cuando Stripe confirme el pago." : "Your membership will activate when Stripe confirms payment.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [spanish, toast]);

  if (authLoading || billingLoading || plansLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center bg-[#0B0F14]"><Loader2 className="h-8 w-8 animate-spin text-[#5EEBFF]" /></div>;
  }
  if (!isAuthenticated) return null;

  const activeMembership = billing?.activeMembership;
  const pendingMembership = billing?.pendingMembership;
  const hasMembership = Boolean(activeMembership || pendingMembership);
  const missingForms = billing?.missingForms || [];
  const status = String(activeMembership?.billingState || activeMembership?.status || "");
  const statusLabel = {
    active: spanish ? "Activa" : "Active",
    past_due: spanish ? "Pago pendiente" : "Payment past due",
    cancel_at_period_end: spanish ? "Termina al final del período" : "Ends at period end",
    pending: spanish ? "Pendiente de confirmación" : "Pending confirmation",
    cancelled: spanish ? "Cancelada" : "Cancelled",
  }[status] || (spanish ? "Manual" : "Manual");

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#0B0F14] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#B06CFF]">{spanish ? "Membresía" : "Membership"}</p>
          <h1 className="text-3xl font-bold tracking-wide text-white sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            {spanish ? "Elige tu ritmo de Ground Up" : "Choose your Ground Up rhythm"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {spanish ? "Membresías mensuales flexibles, con acceso definido por tu plan." : "Flexible monthly memberships with access defined by your plan."}
          </p>
        </div>

        {pendingMembership && !activeMembership && (
          <Card className="mb-8 border-amber-400/30 bg-amber-500/10 text-white" data-testid="pending-membership">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex gap-3">
                <Clock3 className="mt-1 h-5 w-5 flex-shrink-0 text-amber-300" />
                <div>
                  <CardDescription className="text-amber-200/80">{spanish ? "Confirmación de pago" : "Payment confirmation"}</CardDescription>
                  <CardTitle className="mt-1 text-xl text-amber-100">{PLAN_COPY[pendingMembership.plan?.internalKey]?.[locale]?.name || pendingMembership.plan?.displayName || pendingMembership.type}</CardTitle>
                </div>
              </div>
              <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-200">{spanish ? "Pendiente" : "Pending"}</Badge>
            </CardHeader>
            <CardContent className="text-sm text-amber-100/80">
              <p>
                {spanish
                  ? "Stripe todavía está procesando la confirmación de tu pago. Tu membresía aparecerá aquí en cuanto se confirme."
                  : "Stripe is still processing your payment confirmation. Your membership will appear here as soon as it is confirmed."}
              </p>
              <p className="mt-2">
                {spanish
                  ? "Si sigue pendiente después de unos minutos, contacta a Ground Up antes de intentar pagar de nuevo."
                  : "If it is still pending after a few minutes, contact Ground Up before trying to pay again."}
              </p>
            </CardContent>
          </Card>
        )}

        {activeMembership && (
          <Card className="mb-8 border-[#5EEBFF]/30 bg-[#121826] text-white">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardDescription className="text-gray-400">{spanish ? "Tu membresía actual" : "Your current membership"}</CardDescription>
                <CardTitle className="mt-1 text-xl">{PLAN_COPY[activeMembership.plan?.internalKey]?.[locale]?.name || activeMembership.plan?.displayName || activeMembership.type}</CardTitle>
              </div>
              <Badge className="border-[#5EEBFF]/30 bg-[#5EEBFF]/10 text-[#5EEBFF]">{statusLabel}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">
                {activeMembership.currentPeriodEnd && (
                  <span>{spanish ? "Período actual hasta " : "Current period through "}{new Date(activeMembership.currentPeriodEnd).toLocaleDateString(spanish ? "es-US" : "en-US")}</span>
                )}
                {activeMembership.billingState === "past_due" && <p className="mt-1 text-amber-300">{spanish ? "Actualiza tu método de pago para mantener el acceso." : "Update your payment method to keep access."}</p>}
                {activeMembership.cancelAtPeriodEnd && <p className="mt-1 text-amber-300">{spanish ? "Tu acceso continúa hasta el final del período pagado." : "Your access continues through the paid period."}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {billing?.hasStripeCustomer && <Button variant="outline" onClick={() => openPortal.mutate()} disabled={openPortal.isPending} className="border-white/15 text-white hover:bg-white/10">
                  {openPortal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {spanish ? "Administrar pago" : "Manage billing"}
                </Button>}
                {activeMembership.stripeSubscriptionId && !activeMembership.cancelAtPeriodEnd && status !== "cancelled" && (
                  <Button variant="ghost" onClick={() => cancelSubscription.mutate()} disabled={cancelSubscription.isPending} className="text-amber-300 hover:bg-amber-500/10 hover:text-amber-200">
                    {spanish ? "Cancelar al final del período" : "Cancel at period end"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {missingForms.length > 0 && !hasMembership && (
          <Card className="mb-8 border-amber-500/30 bg-amber-500/10 text-white">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
                <div>
                  <p className="font-semibold text-amber-200">{spanish ? "Completa los formularios requeridos" : "Complete required forms"}</p>
                  <p className="mt-1 text-sm text-amber-200/80">{spanish ? "Los necesitamos antes de comenzar una membresía." : "We need these before you can start a membership."}</p>
                </div>
              </div>
              <Button asChild className="bg-amber-500 text-white hover:bg-amber-600">
                <Link href={portalPath(`/portal/forms/${missingForms[0].slug}`)}>{spanish ? "Completar ahora" : "Complete now"}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!approvedMinors.length && (
          <Card className="mb-8 border-[#B06CFF]/30 bg-[#B06CFF]/10 text-white" data-testid="girls-program-guidance">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[#E1C7FF]">
                  {spanish ? "¿Inscribes a una niña?" : "Signing up a girl?"}
                </p>
                <p className="mt-1 max-w-2xl text-sm text-[#E1C7FF]/80">
                  {spanish
                    ? "Primero agrega el perfil de la participante y el consentimiento de su tutora. Después podrás elegir Girls Program para ella."
                    : "First add the participant profile and guardian consent. Then you can choose Girls Program for her."}
                </p>
              </div>
              <Button asChild variant="outline" className="border-[#B06CFF]/50 text-white hover:bg-[#B06CFF]/20">
                <Link href={portalPath("/portal/schedule")}>
                  {spanish ? "Agregar participante" : "Add participant"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const copy = PLAN_COPY[plan.internalKey]?.[locale] || { name: plan.displayName, description: "", entitlement: "" };
            const isGirls = plan.internalKey === "girls_program";
            const blocked = !plan.checkoutReady || missingForms.length > 0 || (isGirls && !approvedMinors.length);
            return (
              <Card key={plan.id} className={`relative flex flex-col border-white/10 bg-[#121826] text-white ${isGirls ? "border-[#B06CFF]/30" : ""} ${plan.catalog.featured ? "border-[#B06CFF]/60 shadow-[0_0_28px_rgba(176,108,255,0.15)]" : ""}`}>
                {plan.catalog.featured && <Badge className="absolute right-4 top-4 bg-[#B06CFF] text-white">{spanish ? "Destacada" : "Featured"}</Badge>}
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#5EEBFF]/10 text-[#5EEBFF]"><CreditCard className="h-5 w-5" /></div>
                  <CardTitle className="pr-16 text-xl">{copy.name}</CardTitle>
                  <CardDescription className="min-h-[3.5rem] text-gray-400">{copy.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-4 text-3xl font-bold">${((plan.displayPriceCents || 0) / 100).toFixed(0)}<span className="text-sm font-normal text-gray-500">/{spanish ? "mes" : "mo"}</span></div>
                  <div className="mb-6 space-y-3 text-sm text-gray-300">
                    <div className="flex gap-2"><Check className="h-4 w-4 flex-shrink-0 text-[#5EEBFF]" />{copy.entitlement}</div>
                    <div className="flex gap-2"><ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#B06CFF]" />{spanish ? "Procesado de forma segura por Stripe" : "Securely processed by Stripe"}</div>
                  </div>
                  {isGirls && !approvedMinors.length ? (
                    <Button asChild className="mt-auto w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90">
                      <Link href={portalPath("/portal/schedule")}>
                        {spanish ? "Configurar participante" : "Set up participant"}
                      </Link>
                    </Button>
                  ) : (
                    <>
                      {isGirls && approvedMinors.length > 1 && (
                        <label className="mb-3 space-y-2 text-xs text-gray-400">
                          <span className="block uppercase tracking-wide">{spanish ? "Participante" : "Participant"}</span>
                          <select
                            value={selectedMinorId}
                            onChange={(event) => setSelectedMinorId(event.target.value)}
                            className="min-h-10 w-full rounded-md border border-white/10 bg-[#0B0F14] px-3 text-sm text-white"
                          >
                            {approvedMinors.map((minor) => <option key={minor.id} value={minor.id}>{minor.firstName} {minor.lastName}</option>)}
                          </select>
                        </label>
                      )}
                      <Button
                        className="mt-auto w-full bg-[#5EEBFF] text-[#0B0F14] hover:bg-[#5EEBFF]/90"
                        disabled={blocked || checkout.isPending || hasMembership}
                        onClick={() => checkout.mutate({ planKey: plan.internalKey, ...(isGirls && selectedMinorId ? { minorProfileId: selectedMinorId } : {}) })}
                      >
                        {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {missingForms.length
                          ? (spanish ? "Completa tus formularios" : "Complete your forms")
                          : pendingMembership
                            ? (spanish ? "Confirmación de pago pendiente" : "Payment confirmation pending")
                            : activeMembership
                              ? (spanish ? "Ya tienes una membresía" : "Membership already active")
                              : (spanish ? "Comenzar membresía" : "Start membership")}
                      </Button>
                    </>
                  )}
                  {!plan.checkoutReady && <p className="mt-3 text-xs text-gray-500">{spanish ? "Disponible pronto." : "Checkout setup in progress."}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}