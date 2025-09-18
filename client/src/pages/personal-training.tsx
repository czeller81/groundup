import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import BookingForm from "@/components/booking/booking-form";
import type { Trainer } from "@shared/schema";

export default function PersonalTraining() {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>("");

  const { data: trainers, isLoading } = useQuery<Trainer[]>({
    queryKey: ["/api/trainers"],
  });

  const featuredTrainer = trainers?.find((t: Trainer) => t.name === "Raymi Gonzalez") || trainers?.[0];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Personal Training</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Accelerate your BJJ journey with personalized one-on-one instruction tailored to your goals and skill level.
            </p>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Booking Form */}
            <div>
              <BookingForm trainers={trainers as Trainer[] || []} />
            </div>

            {/* Trainer Info & Benefits */}
            <div className="space-y-8">
              {/* Featured Trainer */}
              {featuredTrainer && (
                <Card className="shadow-lg" data-testid="featured-trainer">
                  <CardHeader>
                    <CardTitle>Featured Trainer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start space-x-4">
                      <img 
                        src={featuredTrainer.photoUrl} 
                        alt={featuredTrainer.name} 
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-lg">{featuredTrainer.name}</h4>
                        <div className="text-primary font-semibold mb-2">{featuredTrainer.beltRank}</div>
                        <p className="text-muted-foreground text-sm mb-3">{featuredTrainer.bio}</p>
                        <div className="flex flex-wrap gap-2">
                          {featuredTrainer.specialties.map((specialty: string) => (
                            <span 
                              key={specialty}
                              className="inline-block bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Benefits */}
              <Card className="shadow-lg" data-testid="benefits-card">
                <CardHeader>
                  <CardTitle>Personal Training Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-semibold">Personalized Instruction</div>
                        <div className="text-muted-foreground text-sm">Techniques tailored to your specific needs and goals</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-semibold">Faster Progress</div>
                        <div className="text-muted-foreground text-sm">Accelerated learning with focused one-on-one attention</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-semibold">Flexible Scheduling</div>
                        <div className="text-muted-foreground text-sm">Book sessions that fit your busy lifestyle</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-primary h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-semibold">Competition Prep</div>
                        <div className="text-muted-foreground text-sm">Specialized training for tournaments and competitions</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card className="shadow-lg" data-testid="faq-card">
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="font-semibold mb-2">What should I bring to my session?</div>
                      <div className="text-muted-foreground text-sm">Just comfortable athletic wear. We provide all necessary equipment including gis, belts, and mats.</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">Can I cancel or reschedule?</div>
                      <div className="text-muted-foreground text-sm">Yes, you can reschedule with 24 hours notice. Cancellations within 24 hours are subject to a 50% fee.</div>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">Is personal training suitable for beginners?</div>
                      <div className="text-muted-foreground text-sm">Absolutely! Personal training is perfect for beginners as it allows for personalized instruction and faster learning.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
