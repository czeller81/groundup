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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-[#0B0F14] flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="bg-[#121826]/80 border-b border-white/5 py-5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              MEMBER <span className="gradient-text-purple">PORTAL</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Welcome back, <span className="text-white font-medium">{user?.firstName}</span>
            </p>
          </div>
          {!allFormsComplete && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {completedRequired}/{requiredForms.length} required forms complete
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-grow w-full">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* REQUIRED FORMS */}
          <Card className="lg:col-span-2 bg-[#121826] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-[#5EEBFF]" />
                Required Forms
              </CardTitle>
              <CardDescription>
                {allFormsComplete
                  ? "All required forms are complete."
                  : `${completedRequired} of ${requiredForms.length} required forms submitted`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {forms.map((form: any) => {
                  const IconComp = FORM_ICONS[form.slug] || FileText;
                  return (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#5EEBFF]/10 flex items-center justify-center flex-shrink-0">
                          <IconComp className="h-4 w-4 text-[#5EEBFF]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-white truncate">{form.title}</p>
                          <p className="text-xs text-gray-500">{form.isRequired ? "Required" : "Optional"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {getStatusBadge(form.responseStatus)}
                        {form.responseStatus === "submitted" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10 h-7 px-2"
                            onClick={() => setFormViewDialog({ open: true, slug: form.slug })}
                          >
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-white/10 hover:bg-white/5" asChild>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-[#B06CFF]" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              {membership ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#B06CFF]/10 border border-[#B06CFF]/20 rounded-lg">
                    <p className="text-xs text-[#B06CFF] font-semibold uppercase tracking-wider mb-1">Active Plan</p>
                    <p className="text-white font-semibold">{getMembershipInfo(membership.type).name}</p>
                  </div>
                  <div className="space-y-3 text-sm">
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
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#B06CFF]/10 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-6 w-6 text-[#B06CFF]" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">No active membership</p>
                  <Button asChild size="sm" className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90 w-full">
                    <Link href="/pricing">View Programs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* UPCOMING SESSIONS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-[#FFB199]" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>
                {upcomingBookings.length} upcoming session{upcomingBookings.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-4">No upcoming sessions</p>
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
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                        onClick={() => setCancelDialog({ open: true, booking })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2 border-white/10 hover:bg-white/5 text-gray-300 text-xs" asChild>
                    <Link href="/portal/booking">Book Another Session</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUICK ACTIONS */}
          <Card className="bg-[#121826] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                <Link href="/portal/booking">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View All Bookings
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

          {/* COMMUNITY EVENTS */}
          <Card className="bg-[#121826] border-[#FFB199]/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Star className="h-5 w-5 text-[#FFB199]" />
                Community Event
              </CardTitle>
              <CardDescription>Free class — open to everyone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#FFB199]/10 border border-[#FFB199]/20 rounded-lg mb-4">
                <p className="text-[#FFB199] font-semibold text-sm mb-1">Free Community Self-Defense</p>
                <p className="text-white text-lg font-bold">{format(nextCommunityClass, "EEEE, MMM d")}</p>
                <p className="text-gray-400 text-xs mt-1">Repeats every 2 weeks</p>
              </div>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed break-words">
                Open to everyone in the community. No experience or registration required — just show up.
              </p>
              <Button asChild size="sm" className="w-full bg-[#FFB199] text-[#0B0F14] font-bold hover:bg-[#FFB199]/90">
                <Link href="/contact">Learn More</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* PAST SESSIONS */}
        {pastBookings.length > 0 && (
          <Card className="mt-6 bg-[#121826] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Past Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
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
      <footer className="border-t border-white/5 mt-8 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Ground Up Jiu-Jitsu &amp; Fitness. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/portal/forms/liability-waiver" className="text-gray-500 hover:text-gray-300 transition-colors">
              Liability Waiver
            </Link>
            <Link href="/portal/forms/gym-rules" className="text-gray-500 hover:text-gray-300 transition-colors">
              Gym Rules
            </Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-300 transition-colors">
              Safety Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* CANCEL DIALOG */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: open ? cancelDialog.booking : null })}>
        <DialogContent className="bg-[#121826] border-white/10 text-white">
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
          <DialogFooter className="gap-2">
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
        <DialogContent className="bg-[#121826] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
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
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
