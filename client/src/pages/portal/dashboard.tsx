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
import { FileText, Calendar, CheckCircle, Clock, AlertCircle, LogOut, Settings, X, Loader2, Eye } from "lucide-react";
import { format, isPast, isFuture, isToday, startOfDay, isSameDay } from "date-fns";

export default function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isLoading: authLoading, isAuthenticated, isAdmin } = usePortalAuth();
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

  const isSameDayBooking = (bookingDate: Date) => {
    return isSameDay(new Date(), bookingDate);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/portal/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/portal/login");
  };

  const upcomingBookings = bookings.filter((b: any) => isFuture(new Date(b.start)) && b.status !== "canceled");
  const pastBookings = bookings.filter((b: any) => isPast(new Date(b.start)) || b.status === "canceled");

  const completedForms = forms.filter((f: any) => f.responseStatus === "submitted").length;
  const requiredForms = forms.filter((f: any) => f.isRequired).length;
  const allFormsComplete = completedForms >= requiredForms;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case "draft":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Not Started</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F14]">
      <header className="bg-[#121826] border-b border-white/5 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              MEMBER <span className="gradient-text-purple">PORTAL</span>
            </h1>
            <p className="text-sm text-gray-400">Welcome, {user?.firstName}!</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button size="sm" className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90" asChild data-testid="button-admin">
                <Link href="/portal/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5" data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card data-testid="card-forms-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Forms
              </CardTitle>
              <CardDescription>
                {allFormsComplete ? "All forms completed!" : `${completedForms}/${requiredForms} forms submitted`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forms.map((form: any) => (
                  <div key={form.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{form.title}</p>
                      {form.isRequired && <span className="text-xs text-muted-foreground">Required</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(form.responseStatus)}
                      {form.responseStatus === "submitted" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#5EEBFF] hover:text-[#5EEBFF]/80 hover:bg-[#5EEBFF]/10"
                          onClick={() => setFormViewDialog({ open: true, slug: form.slug })}
                          data-testid={`view-form-${form.slug}`}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/portal/forms/${form.slug}`}>
                            {form.responseStatus === "draft" ? "Continue" : "Start"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-upcoming-bookings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>
                {upcomingBookings.length} upcoming session{upcomingBookings.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <Button asChild className="bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90" data-testid="button-book-session">
                    <Link href="/portal/booking">Book a Session</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-muted rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{format(new Date(booking.start), "EEEE, MMM d")}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.start), "h:mm a")} with {booking.trainer?.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setCancelDialog({ open: true, booking })}
                        data-testid={`button-cancel-booking-${booking.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/portal/booking">Book Another Session</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-[#B06CFF] text-white hover:bg-[#B06CFF]/90" asChild data-testid="button-new-booking">
                <Link href="/portal/booking">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book New Session
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/portal/bookings">
                  View All Bookings
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  Back to Website
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {pastBookings.length > 0 && (
          <Card className="mt-6" data-testid="card-past-bookings">
            <CardHeader>
              <CardTitle>Past Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pastBookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{format(new Date(booking.start), "MMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">{booking.trainer?.name}</p>
                    </div>
                    <Badge variant={booking.status === "canceled" ? "destructive" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: open ? cancelDialog.booking : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              {cancelDialog.booking && (
                <>
                  Are you sure you want to cancel your session on{" "}
                  <strong>{format(new Date(cancelDialog.booking.start), "EEEE, MMMM d")}</strong> at{" "}
                  <strong>{format(new Date(cancelDialog.booking.start), "h:mm a")}</strong>?
                  {isSameDayBooking(new Date(cancelDialog.booking.start)) && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
                      <strong>Same-day cancellation fee:</strong> A $10 fee will be charged for cancelling on the same day as your scheduled session.
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, booking: null })}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelDialog.booking && cancelMutation.mutate(cancelDialog.booking.id)}
              disabled={cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {cancelDialog.booking && isSameDayBooking(new Date(cancelDialog.booking.start))
                ? "Cancel ($10 Fee)"
                : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                const answer = formDetail.response.answers[field.name || field.id];
                if (answer === undefined || answer === null || answer === "") return null;
                return (
                  <div key={field.name || field.id} className="border-b border-white/5 pb-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{field.label || field.name}</p>
                    <p className="text-sm text-white mt-1">
                      {typeof answer === "boolean" ? (answer ? "Yes" : "No") : String(answer)}
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
