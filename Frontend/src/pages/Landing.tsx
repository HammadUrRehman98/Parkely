import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Map, CalendarCheck, Shield, Zap, Clock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">ParkSmart</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Find & Book Parking
            <span className="text-primary block mt-2">In Seconds</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Real-time parking availability, interactive maps, and instant booking. 
            No more circling the block — park smarter with ParkSmart.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/login">Find Parking</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link to="/login">Admin Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why ParkSmart?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Map, title: 'Interactive Map', desc: 'View all available parking zones on a live map with real-time slot availability.' },
              { icon: CalendarCheck, title: 'Easy Booking', desc: 'Book your parking spot in just a few clicks. Choose zone, time, and slot instantly.' },
              { icon: Shield, title: 'Secure & Reliable', desc: 'JWT-based authentication ensures your account and bookings are always protected.' },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <f.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Map, title: 'Find a Zone', desc: 'Browse the interactive map to find nearby parking zones with available spots.' },
              { step: '2', icon: Clock, title: 'Pick Date & Slot', desc: 'Select your preferred date, time, and specific parking slot from the visual grid.' },
              { step: '3', icon: CalendarCheck, title: 'Book & Go', desc: 'Confirm your booking instantly and navigate to your reserved parking spot.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span>ParkSmart © 2026</span>
          </div>
          <span>Smart Web-Based Parking Management System</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
