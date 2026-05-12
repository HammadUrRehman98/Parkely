import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, Sparkles, Timer } from 'lucide-react';

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Top bar */}
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight">Parkely</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">Live availability</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-30 animate-parkely-float"
          style={{ background: 'radial-gradient(circle at 30% 30%, hsl(225 73% 57% / .35), transparent 60%)' }}
        />
        <div
          className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-25 animate-parkely-float-slow"
          style={{ background: 'radial-gradient(circle at 60% 40%, hsl(142 71% 45% / .30), transparent 60%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.12] animate-parkely-drift"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(225 73% 57% / .35), transparent 55%), linear-gradient(to left, hsl(142 71% 45% / .25), transparent 55%)',
            backgroundSize: '120% 100%, 120% 100%',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(220 13% 91% / .75) 1px, transparent 1px), linear-gradient(90deg, hsl(220 13% 91% / .75) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at 40% 35%, #000 45%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 40% 35%, #000 45%, transparent 72%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-14">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Park with confidence.
              <span className="block text-muted-foreground font-medium mt-3">
                See what’s open, reserve a spot, and arrive on time.
              </span>
            </h1>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="h-12 px-6" asChild>
                <Link to="/login">
                  Find parking <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6" asChild>
                <Link to="/login">Admin access</Link>
              </Button>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              {[
                { icon: Timer, title: 'Fast booking', desc: 'Pick time and slot in seconds.' },
                { icon: ShieldCheck, title: 'Secure', desc: 'Verified accounts and protected sessions.' },
                { icon: Sparkles, title: 'Live status', desc: 'Slots update as they change.' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border bg-card/70 backdrop-blur p-4">
                  <item.icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 text-sm font-medium">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Showcase panel */}
          <div className="relative">
            <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="text-sm font-medium">Live Map</div>
                <div className="text-xs text-muted-foreground">Zones • Slots • Entry/Exit</div>
              </div>
              <div className="relative p-5">
                {/* Stylized “map” */}
                <div className="relative h-[320px] rounded-xl overflow-hidden border bg-gradient-to-b from-muted/50 to-background">
                  <div className="absolute inset-0 opacity-[0.14]" style={{
                    backgroundImage:
                      'linear-gradient(hsl(220 13% 91% / .9) 1px, transparent 1px), linear-gradient(90deg, hsl(220 13% 91% / .9) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }} />
                  {/* Scanning highlight */}
                  <div className="absolute top-10 left-0 h-1 w-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-parkely-scan" />

                  {/* Pins */}
                  {[
                    { top: 72, left: 58, color: 'hsl(225 73% 57%)', delay: '0ms' },
                    { top: 164, left: 180, color: 'hsl(142 71% 45%)', delay: '300ms' },
                    { top: 118, left: 264, color: 'hsl(38 92% 50%)', delay: '600ms' },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="absolute animate-parkely-float"
                      style={{ top: p.top, left: p.left, animationDelay: p.delay }}
                    >
                      <div className="relative">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <div className="absolute -inset-3 rounded-full opacity-40" style={{ background: `radial-gradient(circle, ${p.color}55, transparent 60%)` }} />
                      </div>
                    </div>
                  ))}

                  {/* Route line */}
                  <svg className="absolute inset-0" viewBox="0 0 420 320" fill="none">
                    <path
                      d="M70 92 C 150 70, 190 120, 230 150 S 330 220, 360 210"
                      stroke="hsl(225 73% 57% / .45)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="6 10"
                    />
                  </svg>

                  {/* Bottom status strip */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border bg-background/80 backdrop-blur p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Nearest zone</span>
                      <span className="font-medium">12 slots free</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-[62%] bg-primary/70" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border p-3">
                    <div className="text-[11px] text-muted-foreground">Rate</div>
                    <div className="mt-1 text-sm font-semibold">PKR / hour</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-[11px] text-muted-foreground">Status</div>
                    <div className="mt-1 text-sm font-semibold">Available</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-[11px] text-muted-foreground">Hold</div>
                    <div className="mt-1 text-sm font-semibold">Auto‑managed</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block absolute -right-8 -top-8 h-24 w-24 rounded-2xl border bg-card shadow-lg rotate-6 animate-parkely-float-slow" />
          </div>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Parkely</div>
          <div className="mt-1">Parking management for teams and drivers.</div>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Parkely
        </div>
      </div>
    </footer>
  </div>
);

export default Landing;
