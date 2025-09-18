import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function Pricing() {
  const pricingPlans = [
    {
      id: "hourly",
      title: "Hourly Sessions",
      prices: ["$20/hour"],
      features: [
        "One-on-one instruction",
        "Personalized curriculum",
        "All equipment provided",
        "Flexible scheduling",
        "Pay as you go"
      ],
      popular: true,
      badge: "Most Popular"
    },
    {
      id: "unlimited",
      title: "Monthly Unlimited",
      prices: ["$280/month"],
      features: [
        "Unlimited training sessions",
        "Priority booking",
        "Technique videos included",
        "Progress tracking",
        "Competition prep included"
      ],
      popular: false,
      bestValue: true,
      badge: "Best Value"
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Personal Training Pricing</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Flexible pricing options to fit your schedule and budget. All sessions include equipment and personalized instruction.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card 
                key={plan.id}
                className={`shadow-lg relative ${
                  plan.bestValue ? 'border-2 border-primary' : 'border border-border'
                }`}
                data-testid={`pricing-plan-${plan.id}`}
              >
                {plan.bestValue && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      {plan.badge}
                    </div>
                  </div>
                )}
                
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-4">{plan.title}</h3>
                  
                  {plan.prices.map((price, index) => (
                    <div key={index} className="text-4xl font-bold text-primary mb-2">
                      {price}
                    </div>
                  ))}
                  
                  
                  {plan.popular && !plan.bestValue && (
                    <div className="bg-muted px-3 py-1 rounded-full text-sm font-medium mb-6">
                      {plan.badge}
                    </div>
                  )}
                  
                  <ul className="text-left space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="text-primary mr-3 h-4 w-4" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button asChild className="w-full" data-testid={`book-now-${plan.id}`}>
                    <Link href="/personal-training">Book Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Special Note */}
          <div className="mt-16 max-w-2xl mx-auto">
            <Card className="shadow-lg" data-testid="special-pricing-note">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Simple & Affordable</h3>
                <p className="text-muted-foreground mb-6">Our straightforward pricing makes BJJ accessible to everyone. Train at your own pace with our hourly rate, or get unlimited access with our monthly plan.</p>
                <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <Check className="text-primary mr-3 h-4 w-4" />
                      <span className="text-sm">2-4 participants</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="text-primary mr-3 h-4 w-4" />
                      <span className="text-sm">Shared curriculum</span>
                    </li>
                  </ul>
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <Check className="text-primary mr-3 h-4 w-4" />
                      <span className="text-sm">Partner drills focus</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="text-primary mr-3 h-4 w-4" />
                      <span className="text-sm">Team building exercises</span>
                    </li>
                  </ul>
                </div>
                <Button asChild size="lg" data-testid="book-group-session">
                  <Link href="/personal-training">Book Group Session</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing FAQ</h2>
          </div>
          
          <div className="space-y-6">
            <Card data-testid="faq-included">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3">What's included in every session?</h3>
                <p className="text-muted-foreground">All equipment (gis, belts, mats), personalized instruction, progress tracking, and follow-up technique videos via email.</p>
              </CardContent>
            </Card>
            
            <Card data-testid="faq-switch-sessions">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3">Can I switch between session lengths?</h3>
                <p className="text-muted-foreground">Yes! Package holders can upgrade to 90-minute sessions by paying the difference. 90-minute sessions can be split into multiple 60-minute sessions.</p>
              </CardContent>
            </Card>
            
            <Card data-testid="faq-cancellation">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3">What's your cancellation policy?</h3>
                <p className="text-muted-foreground">Free cancellations with 24+ hours notice. Same-day cancellations forfeit 50% of the session value. No-shows forfeit the full session.</p>
              </CardContent>
            </Card>
            
            <Card data-testid="faq-refunds">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-3">Do you offer refunds on packages?</h3>
                <p className="text-muted-foreground">Unused sessions can be refunded within 30 days of purchase. After 30 days, we offer credit transfers to friends/family members.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
