import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Target, Clock, Award, ArrowRight } from "lucide-react";

export default function PersonalTraining() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Personal Training</h1>
            <p className="text-xl text-purple-100 mb-8">
              Accelerate your BJJ journey with personalized one-on-one instruction tailored specifically for women. 
              Train in a safe, supportive environment designed to help you reach your goals.
            </p>
            <Button size="lg" className="bg-white text-purple-900 hover:bg-purple-100" asChild data-testid="button-signup-hero">
              <Link href="/portal/login">
                Sign Up to Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Personal Training?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get the focused attention and customized instruction you need to build confidence, 
              strength, and real-world self-defense skills.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="text-center" data-testid="benefit-personalized">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Personalized Instruction</h3>
                <p className="text-sm text-muted-foreground">
                  Techniques tailored to your body type, goals, and learning style
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="benefit-progress">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Faster Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Accelerated learning with focused one-on-one attention
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="benefit-scheduling">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Flexible Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Book sessions from 8am-5pm that fit your busy lifestyle
                </p>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="benefit-women">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">Women-Only Environment</h3>
                <p className="text-sm text-muted-foreground">
                  Train comfortably in a supportive, female-focused space
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Meet Your Trainer</h2>
              <div className="flex items-start space-x-4 mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1594381898411-846e7d193883?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
                  alt="Raymi Gonzalez" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                />
                <div>
                  <h3 className="text-xl font-bold">Raymi Gonzalez</h3>
                  <p className="text-primary font-semibold">Purple Belt 3rd Degree</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                With 5 years of experience, Raymi leads the women's only program at Gracie Barra Ventura 
                and specializes in strength and conditioning fitness classes. She offers the best 1-on-1 
                BJJ training tailored specifically for women.
              </p>
              <div className="flex flex-wrap gap-2">
                {["1-on-1 BJJ Training", "Strength & Conditioning", "Women's Program", "Fitness Classes"].map((specialty) => (
                  <span key={specialty} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    "60-minute personalized training sessions",
                    "Technique instruction tailored to your level",
                    "Strength & conditioning exercises",
                    "Self-defense fundamentals",
                    "Flexible booking through member portal",
                    "Progress tracking and goal setting"
                  ].map((item) => (
                    <div key={item} className="flex items-start space-x-3">
                      <CheckCircle className="text-primary h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What should I bring to my session?</h4>
                  <p className="text-muted-foreground">
                    Just comfortable athletic wear. We provide all necessary equipment including gis, belts, and mats.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Can I cancel or reschedule?</h4>
                  <p className="text-muted-foreground">
                    Yes! You can cancel anytime through the member portal. Same-day cancellations have a $10 fee.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Is personal training suitable for beginners?</h4>
                  <p className="text-muted-foreground">
                    Absolutely! Personal training is perfect for beginners as it allows for personalized instruction 
                    at your own pace in a comfortable environment.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How do I book a session?</h4>
                  <p className="text-muted-foreground">
                    Sign up for a member account, complete your intake forms, and book directly through the member portal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-purple-900 to-purple-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-purple-100 mb-8">
            Join our women's training community and take the first step toward building confidence, 
            strength, and real self-defense skills.
          </p>
          <Button size="lg" className="bg-white text-purple-900 hover:bg-purple-100" asChild data-testid="button-signup-cta">
            <Link href="/portal/login">
              Sign Up Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="text-purple-200 text-sm mt-4">
            Sessions just $20 per hour | Flexible scheduling 8am-5pm
          </p>
        </div>
      </section>
    </div>
  );
}
