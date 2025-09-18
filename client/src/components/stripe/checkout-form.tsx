import { useState } from "react";
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CheckoutFormInnerProps {
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

function CheckoutFormInner({ bookingId, amount, onSuccess }: CheckoutFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/personal-training?success=true`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-lg" data-testid="checkout-form">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span>Total Amount:</span>
            <span className="font-bold text-lg">${amount}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <PaymentElement />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            size="lg" 
            disabled={!stripe || !elements || isProcessing}
            data-testid="button-complete-payment"
          >
            {isProcessing ? "Processing Payment..." : `Complete Payment - $${amount}`}
          </Button>
        </form>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Your payment is secured by Stripe. We never store your payment information.
        </div>
      </CardContent>
    </Card>
  );
}

interface CheckoutFormProps {
  clientSecret: string;
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export default function CheckoutForm({ clientSecret, bookingId, amount, onSuccess }: CheckoutFormProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormInner 
        bookingId={bookingId} 
        amount={amount} 
        onSuccess={onSuccess} 
      />
    </Elements>
  );
}
