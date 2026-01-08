import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePortalAuth } from "@/lib/portal-auth";
import { FileText, Calendar, CheckCircle, Clock, AlertCircle, LogOut, Settings } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

export default function PortalDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, isLoading: authLoading, isAuthenticated, isAdmin } = usePortalAuth();

  const { data: forms = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/forms"],
    enabled: isAuthenticated,
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/portal/bookings"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/portal/login");
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
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Member Portal</h1>
            <p className="text-sm opacity-90">Welcome, {user?.firstName}!</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="secondary" size="sm" asChild data-testid="button-admin">
                <Link href="/portal/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
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
                      {form.responseStatus !== "submitted" && (
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
                  <Button asChild data-testid="button-book-session">
                    <Link href="/portal/booking">Book a Session</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">{format(new Date(booking.start), "EEEE, MMM d")}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.start), "h:mm a")} with {booking.trainer?.name}
                      </p>
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
              <Button className="w-full" asChild data-testid="button-new-booking">
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
    </div>
  );
}
