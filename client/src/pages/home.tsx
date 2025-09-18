import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Dumbbell, Brain, Star } from "lucide-react";
import femaleFighterImage from "@assets/stock_images/female_women_martial_65702319.jpg";
import femaleStudent1 from "@assets/stock_images/female_bjj_students__456d0e30.jpg";
import femaleStudent2 from "@assets/stock_images/female_bjj_students__0fe74900.jpg";
import femaleStudent3 from "@assets/stock_images/female_bjj_students__65085ad5.jpg";

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
              Empower Yourself Through<br/>
              <span className="text-primary">Women's Brazilian Jiu-Jitsu</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
              Build strength, discipline, and confidence in our safe, women-only environment at Ground Up BJJ. 
              Led by female instructors who understand your journey.
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our Women's BJJ Program?</h2>
            <p className="text-xl text-muted-foreground">Transform your body, mind, and spirit in our empowering, females-only environment</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 shadow-lg" data-testid="card-self-defense">
              <CardContent className="pt-6">
                <div className="text-primary text-4xl mb-6 flex justify-center">
                  <Shield className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Women's Self-Defense</h3>
                <p className="text-muted-foreground">
                  Learn practical self-defense techniques designed specifically for women. Build confidence and situational awareness in a supportive environment.
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Empower Yourself?</h2>
          <p className="text-xl mb-8 opacity-90">Book a personal training session with one of our expert female instructors today</p>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Female Students Say</h2>
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
                  "The personal training sessions have completely transformed my confidence and technique. 
                  Coach Sofia breaks down complex moves in such a supportive, empowering way."
                </p>
                <div className="flex items-center">
                  <img 
                    src={femaleStudent1} 
                    alt="Maria Gonzalez" 
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <div className="font-semibold">Maria Gonzalez</div>
                    <div className="text-sm text-muted-foreground">Blue Belt</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-lg" data-testid="testimonial-jessica">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="text-yellow-400 text-lg flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  "I started as a complete beginner and the female instructors made me feel safe and welcome from day one. 
                  This women-only environment is exactly what I needed to build my confidence."
                </p>
                <div className="flex items-center">
                  <img 
                    src={femaleStudent2} 
                    alt="Jessica Wu" 
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <div className="font-semibold">Jessica Wu</div>
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
                  "Ground Up BJJ has the best female coaching staff in the city. 
                  Their empowering, women-focused approach helped me prepare for my first competition with confidence."
                </p>
                <div className="flex items-center">
                  <img 
                    src={femaleStudent3} 
                    alt="Priya Patel" 
                    className="w-12 h-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <div className="font-semibold">Priya Patel</div>
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
