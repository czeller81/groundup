import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Calendar from "./calendar";
import CheckoutForm from "@/components/stripe/checkout-form";
import { addMinutes, format, parseISO } from "date-fns";

const SESSION_TYPES = {
  PT60: { name: "60-Minute 1:1 Training", description: "Perfect for focused skill development", price: 120 },
  PT90: { name: "90-Minute 1:1 Training", description: "Extended session for deep technique work", price: 160 },
  GROUP60: { name: "Small Group (2-4 people) 60-Min", description: "Train with friends or family", price: 180 }
};

const bookingSchema = z.object({
  sessionType: z.enum(["PT60", "PT90", "GROUP60"]),
  trainerId: z.string().min(1, "Please select a trainer"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Please enter a valid email"),
  customerPhone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  trainers: any[];
}

export default function BookingForm({ trainers }: BookingFormProps) {
  const [step, setStep] = useState(1); // 1: booking form, 2: payment
  const [bookingId, setBookingId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      sessionType: "PT60",
      trainerId: "",
      date: "",
      time: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const sessionConfig = SESSION_TYPES[data.sessionType];
      const startDateTime = new Date(`${data.date}T${data.time}`);
      const endDateTime = addMinutes(startDateTime, sessionConfig.name.includes("90") ? 90 : 60);

      const booking = {
        sessionType: data.sessionType,
        trainerId: data.trainerId,
        start: startDateTime,
        end: endDateTime,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        notes: data.notes || "",
        amountCents: sessionConfig.price * 100,
        currency: "usd",
        status: "pending",
      };

      return await apiRequest("POST", "/api/bookings", booking);
    },
    onSuccess: async (response) => {
      const booking = await response.json();
      setBookingId(booking.id);

      // Create payment intent
      const paymentResponse = await apiRequest("POST", "/api/create-payment-intent", {
        sessionType: form.getValues("sessionType"),
        bookingId: booking.id,
      });

      const { clientSecret } = await paymentResponse.json();
      setClientSecret(clientSecret);
      setStep(2);
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  const selectedSessionType = form.watch("sessionType");
  const selectedPrice = SESSION_TYPES[selectedSessionType]?.price || 0;

  if (step === 2 && clientSecret) {
    return (
      <CheckoutForm
        clientSecret={clientSecret}
        bookingId={bookingId}
        amount={selectedPrice}
        onSuccess={() => {
          toast({
            title: "Payment Successful!",
            description: "Your training session has been booked. You'll receive a confirmation email shortly.",
          });
          // Reset form
          form.reset();
          setStep(1);
          setClientSecret("");
          setBookingId("");
        }}
      />
    );
  }

  return (
    <Card className="shadow-lg" data-testid="booking-form">
      <CardHeader>
        <CardTitle>Book Your Session</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Session Type Selection */}
            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="space-y-3"
                      data-testid="session-type-selection"
                    >
                      {Object.entries(SESSION_TYPES).map(([key, session]) => (
                        <div key={key} className="flex items-center space-x-2 p-4 border border-border rounded-lg hover:bg-accent">
                          <RadioGroupItem value={key} id={key} />
                          <Label htmlFor={key} className="flex-1 cursor-pointer">
                            <div className="font-semibold">{session.name}</div>
                            <div className="text-muted-foreground text-sm">{session.description}</div>
                            <div className="font-bold text-primary">${session.price}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Trainer Selection */}
            <FormField
              control={form.control}
              name="trainerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Trainer</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} data-testid="trainer-select">
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a trainer" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainers.map((trainer: any) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.name} - {trainer.beltRank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calendar */}
            <div>
              <Label>Select Date & Time</Label>
              <Calendar
                selectedTrainerId={form.watch("trainerId")}
                selectedDate={form.watch("date")}
                selectedTime={form.watch("time")}
                onDateSelect={(date) => {
                  form.setValue("date", date);
                  form.setValue("time", ""); // Reset time when date changes
                }}
                onTimeSelect={(time) => form.setValue("time", time)}
              />
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter your phone number" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any specific goals or concerns?" 
                        rows={3} 
                        {...field} 
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={createBookingMutation.isPending}
              data-testid="button-proceed-payment"
            >
              {createBookingMutation.isPending 
                ? "Processing..." 
                : `Proceed to Payment - $${selectedPrice}`
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
