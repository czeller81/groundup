import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Dumbbell, Brain, Star } from "lucide-react";
import femaleFighterImage from "@assets/stock_images/female_women_martial_65702319.jpg";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/40"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{
            backgroundImage: `url(${femaleFighterImage})`
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Master the Art of<br/>
              <span className="text-primary">Brazilian Jiu-Jitsu</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
              Build strength, discipline, and confidence through personalized training at Ground Up BJJ. 
              From beginners to advanced practitioners, we meet you where you are.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-4" data-testid="button-book-training">
                <Link href="/personal-training">Book Personal Training</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-gray-900"
                data-testid="button-free-intro"
              >
                Free Intro Class
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Ground Up BJJ?</h2>
            <p className="text-xl text-muted-foreground">Transform your body, mind, and spirit through the art of Brazilian Jiu-Jitsu</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 shadow-lg" data-testid="card-self-defense">
              <CardContent className="pt-6">
                <div className="text-primary text-4xl mb-6 flex justify-center">
                  <Shield className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Self-Defense</h3>
                <p className="text-muted-foreground">
                  Learn practical self-defense techniques that work in real-world situations. Build confidence and situational awareness.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 shadow-lg" data-testid="card-conditioning">
              <CardContent className="pt-6">
                <div className="text-primary text-4xl mb-6 flex justify-center">
                  <Dumbbell className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Physical Conditioning</h3>
                <p className="text-muted-foreground">
                  Improve strength, flexibility, and cardiovascular endurance through dynamic BJJ training and conditioning exercises.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 shadow-lg" data-testid="card-discipline">
              <CardContent className="pt-6">
                <div className="text-primary text-4xl mb-6 flex justify-center">
                  <Brain className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Mental Discipline</h3>
                <p className="text-muted-foreground">
                  Develop focus, patience, and problem-solving skills. BJJ is often called "physical chess" for good reason.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 opacity-90">Book a personal training session with one of our expert coaches today</p>
          <Button 
            asChild 
            variant="secondary" 
            size="lg" 
            className="text-lg px-8 py-4"
            data-testid="button-book-training-cta"
          >
            <Link href="/personal-training">Book Personal Training</Link>
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Students Say</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-lg" data-testid="testimonial-sarah">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="text-yellow-400 text-lg flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  "The personal training sessions have completely transformed my approach to BJJ. 
                  Coach Marcus breaks down complex techniques in a way that's easy to understand."
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                    alt="Sarah Johnson" 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold">Sarah Johnson</div>
                    <div className="text-sm text-muted-foreground">Blue Belt</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-lg" data-testid="testimonial-mike">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="text-yellow-400 text-lg flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  "I started as a complete beginner and the coaches made me feel welcome from day one. 
                  The one-on-one attention in personal training is invaluable."
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                    alt="Mike Chen" 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold">Mike Chen</div>
                    <div className="text-sm text-muted-foreground">White Belt</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-lg" data-testid="testimonial-emma">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="text-yellow-400 text-lg flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  "Ground Up BJJ has the best coaching staff in the city. 
                  Their personal training program helped me prepare for my first competition."
                </p>
                <div className="flex items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
                    alt="Emma Rodriguez" 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold">Emma Rodriguez</div>
                    <div className="text-sm text-muted-foreground">Purple Belt</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
