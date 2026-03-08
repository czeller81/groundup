import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePortalAuth } from "@/lib/portal-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText, Calendar, CheckCircle, XCircle, Clock, AlertCircle, X, Loader2, Eye,
  Shield, Camera, Book, Users, CreditCard, Dumbbell, ArrowRight, ExternalLink,
  User, TrendingUp, Home, Star, ChevronRight
} from "lucide-react";
import { format, isPast, isFuture, isSameDay, addDays } from "date-fns";

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
  "womens_bjj": { name: "Women's BJJ Fundamentals", price: "$120/mo", classes: "2 per week" },
  "kids_bjj": { name: "Kids Jiu-Jitsu", price: "$100/mo", classes: "2 per week" },
  "strength_conditioning_unlimited": { name: "Strength & Conditioning Unlimited", price: "$60/mo", classes: "Unlimited" },
  "self_defense_program": { name: "Women's Self-Defense Program", price: "$199 total", classes: "2 per week" },
  "per_session": { name: "Pay Per Session", price: "$15–$60/session", classes: "Flexible" },
  "monthly_unlimited": { name: "Monthly Unlimited", price: "$60/mo", classes: "Unlimited" },
};

function getMembershipInfo(type: string) {
  return MEMBERSHIP_LABELS[type] || { name: type.replace(/_/g, " "), price: "Contact gym", classes: "Varies" };
}

export default function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = usePortalAuth();
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
      toast({ title: "Booking Cancelled", description: "Your session has been cancelled." });
      setCancelDialog({ open: false, booking: null });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel booking", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/portal/login");
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

  const requiredForms = forms.filter((f: any) => f.isRequired);
  const completedRequired = requiredForms.filter((f: any) => f.responseStatus === "submitted").length;
  const allFormsComplete = completedRequired >= requiredForms.length && requiredForms.length > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
      case "draft":
        return <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Required</Badge>;
    }
  };

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
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Member Portal</p>
            <h2 className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back, <span className="text-[#5EEBFF]">{user?.firstName}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {allFormsComplete ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400 text-xs font-medium">All forms done</span>
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
              <p className="text-amber-300 text-sm font-medium">Action required</p>
              <p className="text-amber-400/80 text-xs mt-0.5">Complete your required forms to access all gym services.</p>
            </div>
            <Button size="sm" className="flex-shrink-0 bg-amber-500 text-white hover:bg-amber-600 h-7 px-3 text-xs" asChild>
              <Link href={`/portal/forms/${requiredForms.find((f: any) => f.responseStatus !== "submitted")?.slug || ""}`}>
                Start
              </Link>
            </Button>
          </div>
        )}

        {/* Quick Action Tiles — mobile-first 2-col row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href="/portal/booking">
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#B06CFF]/15 border border-[#B06CFF]/30 hover:bg-[#B06CFF]/20 transition-colors cursor-pointer h-full min-h-[80px]">
              <Calendar className="h-6 w-6 text-[#B06CFF]" />
              <span className="text-white text-sm font-semibold text-center leading-tight">Book Session</span>
            </div>
          </Link>
          <Link href="/portal/forms/personal-training-intake">
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#5EEBFF]/10 border border-[#5EEBFF]/20 hover:bg-[#5EEBFF]/15 transition-colors cursor-pointer h-full min-h-[80px]">
              <FileText className="h-6 w-6 text-[#5EEBFF]" />
              <span className="text-white text-sm font-semibold text-center leading-tight">My Forms</span>
            </div>
          </Link>
        </div>

        {/* Main content grid: 1-col mobile, 2-col md, 3-col lg */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* UPCOMING SESSIONS — shown first on mobile */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Calendar className="h-4 w-4 text-[#FFB199]" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription className="text-xs">
                {upcomingBookings.length} upcoming session{upcomingBookings.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-gray-400 text-sm mb-3">No upcoming sessions</p>
                  <Button asChild size="sm" className="bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90 w-full">
                    <Link href="/portal/booking">Book a Session</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm text-white">{format(new Date(booking.start), "EEE, MMM d")}</p>
                        <p className="text-xs text-gray-400">{format(new Date(booking.start), "h:mm a")} · {booking.trainer?.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0 flex-shrink-0"
                        onClick={() => setCancelDialog({ open: true, booking })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-1 border-white/10 hover:bg-white/5 text-gray-300 text-xs" asChild>
                    <Link href="/portal/booking">Book Another Session</Link>
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
                Required Forms
              </CardTitle>
              <CardDescription className="text-xs">
                {allFormsComplete
                  ? "All required forms are complete."
                  : `${completedRequired} of ${requiredForms.length} required forms submitted`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {forms.map((form: any) => {
                  const IconComp = FORM_ICONS[form.slug] || FileText;
                  return (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center flex-shrink-0">
                          <IconComp className="h-3.5 w-3.5 text-[#5EEBFF]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-white truncate">{form.title}</p>
                          <p className="text-xs text-gray-500">{form.isRequired ? "Required" : "Optional"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {getStatusBadge(form.responseStatus)}
                        {form.responseStatus === "submitted" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10 h-7 px-2"
                            onClick={() => setFormViewDialog({ open: true, slug: form.slug })}
                          >
                            <Eye className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">View</span>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-2 sm:px-3 text-xs border-white/10 hover:bg-white/5" asChild>
                            <Link href={`/portal/forms/${form.slug}`}>
                              {form.responseStatus === "draft" ? "Continue" : "Start"}
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

          {/* MEMBERSHIP STATUS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <CreditCard className="h-4 w-4 text-[#B06CFF]" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {membership ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#B06CFF]/10 border border-[#B06CFF]/20 rounded-lg">
                    <p className="text-xs text-[#B06CFF] font-semibold uppercase tracking-wider mb-1">Active Plan</p>
                    <p className="text-white font-semibold text-sm">{getMembershipInfo(membership.type).name}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price</span>
                      <span className="text-white font-medium">{getMembershipInfo(membership.type).price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Classes / week</span>
                      <span className="text-white font-medium">{getMembershipInfo(membership.type).classes}</span>
                    </div>
                    {membership.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Renews</span>
                        <span className="text-white font-medium">{format(new Date(membership.endDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 text-xs">Active</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="w-10 h-10 rounded-full bg-[#B06CFF]/10 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-5 w-5 text-[#B06CFF]" />
                  </div>
                  <p className="text-gray-400 text-sm mb-3">No active membership</p>
                  <Button asChild size="sm" className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 w-full">
                    <Link href="/pricing">View Programs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* COMMUNITY EVENTS */}
          <Card className="bg-[#121826] border-[#FFB199]/20">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-white text-base">
                <Star className="h-4 w-4 text-[#FFB199]" />
                Community Event
              </CardTitle>
              <CardDescription className="text-xs">Free class — open to everyone</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="p-3 bg-[#FFB199]/10 border border-[#FFB199]/20 rounded-lg mb-3">
                <p className="text-[#FFB199] font-semibold text-sm mb-1">Free Community Self-Defense</p>
                <p className="text-white text-base font-bold">{format(nextCommunityClass, "EEEE, MMM d")}</p>
                <p className="text-gray-400 text-xs mt-1">Repeats every 2 weeks</p>
              </div>
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">
                Open to everyone. No experience or registration required.
              </p>
              <Button asChild size="sm" className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/contact">Learn More</Link>
              </Button>
            </CardContent>
          </Card>

          {/* QUICK ACTIONS — desktop only (mobile has tile row above) */}
          <Card className="hidden md:block bg-[#121826] border-white/10">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-white text-base">Quick Actions</CardTitle>
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
                  Track My Progress
                </div>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button className="w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 justify-between" asChild>
                <Link href="/portal/booking">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Book New Session
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-gray-300 justify-between text-sm" asChild>
                <Link href="/">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Back to Website
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
                Past Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {pastBookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-white">{format(new Date(booking.start), "MMM d, yyyy")}</p>
                      <p className="text-xs text-gray-400">{booking.trainer?.name}</p>
                    </div>
                    <Badge variant={booking.status === "canceled" ? "destructive" : "secondary"} className="text-xs">
                      {booking.status}
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
            <Link href="/portal/forms/liability-waiver" className="text-gray-500 hover:text-gray-300 transition-colors">Liability Waiver</Link>
            <Link href="/portal/forms/gym-rules" className="text-gray-500 hover:text-gray-300 transition-colors">Gym Rules</Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-300 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

      {/* CANCEL DIALOG */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: open ? cancelDialog.booking : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white mx-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Booking</DialogTitle>
            <DialogDescription className="text-gray-400">
              {cancelDialog.booking && (
                <>
                  Are you sure you want to cancel your session on{" "}
                  <strong className="text-white">{format(new Date(cancelDialog.booking.start), "EEEE, MMMM d")}</strong> at{" "}
                  <strong className="text-white">{format(new Date(cancelDialog.booking.start), "h:mm a")}</strong>?
                  {isSameDay(new Date(), new Date(cancelDialog.booking.start)) && (
                    <div className="mt-3 p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-amber-300 text-sm">
                      <strong>Same-day cancellation fee:</strong> A $10 fee will be charged.
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="border-white/10 text-gray-300 hover:bg-white/5" onClick={() => setCancelDialog({ open: false, booking: null })}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelDialog.booking && cancelMutation.mutate(cancelDialog.booking.id)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {cancelDialog.booking && isSameDay(new Date(), new Date(cancelDialog.booking.start))
                ? "Cancel ($10 Fee)"
                : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FORM VIEW DIALOG */}
      <Dialog open={formViewDialog.open} onOpenChange={(open) => setFormViewDialog({ open, slug: open ? formViewDialog.slug : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto mx-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'var(--font-display)' }}>
              {formDetail?.form?.title || "Form Details"}
            </DialogTitle>
            {formDetail?.response?.submittedAt && (
              <p className="text-xs text-gray-400">
                Submitted {format(new Date(formDetail.response.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
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
                        <p className="text-xs text-gray-400 mb-0.5">{field.label}</p>
                        <p className={`text-sm font-medium ${agreed ? "text-green-300" : "text-red-300"}`}>
                          {agreed ? "Agreed" : "Not agreed"}
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
                        <p className="text-xs text-gray-400 mb-0.5">{field.label}</p>
                        <p className="text-sm font-medium text-white">{val ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={fieldKey} className="py-2 border-b border-white/5">
                    <p className="text-xs text-gray-400 mb-0.5">{field.label}</p>
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
