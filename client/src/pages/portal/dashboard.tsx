import { useState, useEffect } from "react";
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
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = usePortalAuth();
  const { locale, copy } = useLocale();
  const portalPath = (path: string) => localizedPortalPath(path, locale);
  const { toast } = useToast();
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: any | null }>({ open: false, booking: null });
  const [formViewDialog, setFormViewDialog] = useState<{ open: boolean; slug: string | null }>({ open: false, slug: null });

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

  const { data: membership } = useQuery<any>({
    queryKey: ["/api/portal/my-membership"],
    enabled: isAuthenticated,
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <Loader2 className="animate-spin h-8 w-8 text-[#5EEBFF]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const upcomingBookings = bookings.filter((b: any) => isFuture(new Date(b.start)) && b.status !== "canceled");
  const pastBookings = bookings.filter((b: any) => isPast(new Date(b.start)) || b.status === "canceled");
  const nextClassReservation = classReservations
    .filter((item: any) => ["confirmed", "waitlisted"].includes(item.status) && isFuture(new Date(item.occurrence?.start)))
    .sort((a: any, b: any) => new Date(a.occurrence.start).getTime() - new Date(b.occurrence.start).getTime())[0];

  const requiredForms = forms.filter((f: any) => f.isRequired);
  const completedRequired = requiredForms.filter((f: any) => f.responseStatus === "submitted").length;
  const allFormsComplete = completedRequired >= requiredForms.length && requiredForms.length > 0;

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
                <span className="text-amber-400 text-xs font-medium">{completedRequired}/{requiredForms.length} forms</span>
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
                           <p className="font-medium text-sm text-white leading-snug">{form.title}</p>
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
                Community Event
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
    </div>
  );
}
