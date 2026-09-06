import { loadStripe, Stripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const configuredKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
    stripePromise = configuredKey
      ? loadStripe(configuredKey)
      : fetch("/api/stripe/config")
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to load Stripe configuration");
          const { publishableKey } = await response.json() as { publishableKey?: string | null };
          if (!publishableKey) throw new Error("Stripe publishable key is not configured");
          return loadStripe(publishableKey);
        });
  }
  
  return stripePromise;
};

// Stripe configuration options
export const stripeOptions = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: 'hsl(203.8863 88.2845% 53.1373%)', // Primary color from design
      colorBackground: 'hsl(0 0% 100%)',
      colorText: 'hsl(210 25% 7.8431%)',
      colorDanger: 'hsl(356.3033 90.5579% 54.3137%)',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
  },
};

// Helper to format currency amounts
export const formatCurrency = (amountInCents: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountInCents / 100);
};

// Session type pricing configuration
export const SESSION_TYPES = {
  PT60: { name: "60-Minute 1:1 Training", duration: 60, price: 120 },
  PT90: { name: "90-Minute 1:1 Training", duration: 90, price: 160 },
  GROUP60: { name: "Small Group (2-4 people) 60-Min", duration: 60, price: 180 }
} as const;

export type SessionType = keyof typeof SESSION_TYPES;

// Helper to get session config
export const getSessionConfig = (sessionType: SessionType) => {
  return SESSION_TYPES[sessionType];
};

// Helper to calculate session end time
export const calculateSessionEnd = (startTime: Date, sessionType: SessionType): Date => {
  const config = getSessionConfig(sessionType);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + config.duration);
  return endTime;
};
