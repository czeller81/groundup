import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Coaches() {
  const { data: trainers, isLoading } = useQuery({
    queryKey: ["/api/trainers"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Expert Coaches</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Learn from world-class instructors with decades of combined experience in Brazilian Jiu-Jitsu.
            </p>
          </div>
        </div>
      </section>

      {/* Coaches Grid */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trainers?.map((trainer: any) => (
              <Card key={trainer.id} className="shadow-lg overflow-hidden" data-testid={`coach-card-${trainer.id}`}>
                <img 
                  src={trainer.photoUrl} 
                  alt={trainer.name} 
                  className="w-full h-64 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2">{trainer.name}</h3>
                  <div className="text-primary font-semibold mb-3">{trainer.beltRank}</div>
                  <p className="text-muted-foreground mb-4 text-sm">{trainer.bio}</p>
                  <div className="mb-4">
                    <div className="text-sm font-semibold mb-2">Specialties:</div>
                    <div className="flex flex-wrap gap-2">
                      {trainer.specialties.map((specialty: string) => (
                        <span 
                          key={specialty}
                          className="inline-block bg-muted text-muted-foreground px-2 py-1 rounded text-xs"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button asChild className="w-full" data-testid={`book-session-${trainer.id}`}>
                    <Link href="/personal-training">Book Session</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coach Philosophy */}
      <section className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Teaching Philosophy</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We believe in creating a supportive environment where every student can thrive, regardless of their starting point or goals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                alt="Coaching philosophy" 
                className="rounded-xl shadow-lg w-full"
              />
            </div>
            <div className="space-y-6">
              <div data-testid="philosophy-individual">
                <h3 className="text-xl font-bold mb-3">Individual Attention</h3>
                <p className="text-muted-foreground">Every student learns differently. Our coaches adapt their teaching style to match your learning preferences and pace.</p>
              </div>
              <div data-testid="philosophy-safety">
                <h3 className="text-xl font-bold mb-3">Safety First</h3>
                <p className="text-muted-foreground">We prioritize proper technique and injury prevention, ensuring you can train consistently for years to come.</p>
              </div>
              <div data-testid="philosophy-learning">
                <h3 className="text-xl font-bold mb-3">Continuous Learning</h3>
                <p className="text-muted-foreground">Our coaches regularly attend seminars and competitions to stay current with evolving techniques and teaching methods.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
