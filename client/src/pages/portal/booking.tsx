import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { usePortalAuth } from "@/lib/portal-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle, Loader2 } from "lucide-react";
import Calendar from "@/components/booking/calendar";

const SESSION_TYPES = [
  { id: "PT60", name: "60-Minute 1:1 Training", price: 20, description: "Perfect for focused skill development" },
  { id: "UNLIMITED", name: "Monthly Unlimited", price: 280, description: "Unlimited monthly training sessions" },
];

export default function PortalBooking() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = usePortalAuth();
  const { toast } = useToast();

  const [sessionType, setSessionType] = useState("PT60");
  const [trainerId, setTrainerId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);

  const { data: trainers = [] } = useQuery<any[]>({
    queryKey: ["/api/trainers"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (trainers.length > 0 && !trainerId) {
      setTrainerId(trainers[0].id);
    }
  }, [trainers, trainerId]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/bookings", {
        sessionType,
        trainerId,
        date,
        time,
        notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/bookings"] });
      setBookingComplete(true);
    },
    onError: (error: any) => {
      toast({ title: "Booking Failed", description: error.message || "Failed to create booking", variant: "destructive" });
    },
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

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">
              Your training session has been booked. You'll receive a confirmation shortly.
            </p>
            <div className="space-y-2">
              <Button className="w-full" asChild>
                <Link href="/portal/dashboard">Back to Dashboard</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setBookingComplete(false)}>
                Book Another Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedSession = SESSION_TYPES.find((s) => s.id === sessionType);
  const canBook = trainerId && date && time;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canBook) {
      bookMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" className="mb-2" asChild>
            <Link href="/portal/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Book a Training Session
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Session Type</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={sessionType} onValueChange={setSessionType} className="space-y-3">
                {SESSION_TYPES.map((session) => (
                  <div key={session.id} className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent">
                    <RadioGroupItem value={session.id} id={session.id} />
                    <Label htmlFor={session.id} className="flex-1 cursor-pointer">
                      <div className="font-semibold">{session.name}</div>
                      <div className="text-sm text-muted-foreground">{session.description}</div>
                      <div className="font-bold text-primary">${session.price}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Select Date & Time</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                selectedTrainerId={trainerId}
                selectedDate={date}
                selectedTime={time}
                onDateSelect={(d) => {
                  setDate(d);
                  setTime("");
                }}
                onTimeSelect={setTime}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any specific goals or things you'd like to work on?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="input-booking-notes"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Total: ${selectedSession?.price}</p>
                  <p className="text-sm text-muted-foreground">
                    {date && time ? `${date} at ${time}` : "Select date and time"}
                  </p>
                </div>
                <Button type="submit" size="lg" disabled={!canBook || bookMutation.isPending} data-testid="button-confirm-booking">
                  {bookMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
