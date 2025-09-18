export const siteConfig = {
  name: "Ground Up BJJ",
  description: "Empower yourself through Brazilian Jiu-Jitsu in our safe, women-only environment. Led by expert female instructors who understand your journey.",
  
  // Contact Information
  address: {
    street: "123 Training Street",
    city: "Downtown",
    state: "ST",
    zip: "12345"
  },
  
  phone: "(555) 123-4567",
  email: "info@groundupbjj.com",
  
  // Business Hours
  hours: {
    weekday: "6:00 AM - 10:00 PM",
    saturday: "8:00 AM - 8:00 PM", 
    sunday: "10:00 AM - 6:00 PM"
  },
  
  // Social Media Links
  social: {
    facebook: "https://facebook.com/groundupbjj",
    instagram: "https://instagram.com/groundupbjj",
    youtube: "https://youtube.com/@groundupbjj",
    tiktok: "https://tiktok.com/@groundupbjj"
  },
  
  // SEO and Meta
  seo: {
    keywords: [
      "Women's Brazilian Jiu-Jitsu",
      "Female BJJ Training",
      "Women's Self Defense",
      "Female Martial Arts",
      "Women-only BJJ",
      "Female Empowerment",
      "Women's Personal Training"
    ],
    ogImage: "/og-image.jpg", // You would need to add this image
  },
  
  // Business Settings
  business: {
    timezone: "America/New_York",
    currency: "USD",
    locale: "en-US",
    
    // Booking Settings
    booking: {
      maxAdvanceDays: 90, // How far in advance bookings can be made
      minNoticeHours: 24, // Minimum notice for cancellations
      sessionTypes: {
        PT60: {
          name: "60-Minute 1:1 Training",
          duration: 60,
          price: 20,
          description: "Perfect for focused skill development"
        },
        UNLIMITED: {
          name: "Monthly Unlimited",
          duration: 0,
          price: 280,
          description: "Unlimited monthly training sessions"
        }
      }
    },
    
    // Academy Information
    academy: {
      founded: "2020",
      affiliations: ["IBJJF", "UAEJJF"],
      lineage: "Gracie Barra",
      headInstructor: "Sofia Martinez",
      specialization: "Women-only BJJ training and empowerment"
    }
  },
  
  // Feature Flags
  features: {
    onlineBooking: true,
    stripePayments: true,
    emailNotifications: true,
    calendarIntegration: true,
    membershipPlans: false, // Could be enabled in the future
    groupClasses: false     // Currently only personal training
  },
  
  // Admin Settings
  admin: {
    defaultEmail: "admin@groundupbjj.com",
    maxBookingsPerDay: 50,
    exportFormats: ["csv", "pdf"]
  }
} as const;

// Type exports for TypeScript
export type SiteConfig = typeof siteConfig;
export type SessionType = keyof typeof siteConfig.business.booking.sessionTypes;
