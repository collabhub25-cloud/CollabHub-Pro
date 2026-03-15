'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rocket, Users, Shield, Zap, ChevronRight, Check, Star,
  TrendingUp, Handshake, FileCheck, Award, Building2,
  Lightbulb, Target, Globe, Menu, X, ArrowDown, Sparkles
} from 'lucide-react';
import { PremiumHero } from '@/components/ui/hero';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

/* --- Scroll-triggered fade-in hook --- */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: <Shield className="h-6 w-6" />, title: 'Verified Talent Pool', description: '4-level verification system ensuring quality collaborations' },
    { icon: <Handshake className="h-6 w-6" />, title: 'Smart Agreements', description: 'Automated NDA, Work, Equity, and SAFE agreements' },
    { icon: <TrendingUp className="h-6 w-6" />, title: 'Milestone Tracking', description: 'Escrow-based payments with milestone verification' },
    { icon: <Award className="h-6 w-6" />, title: 'Trust Score Engine', description: 'Reputation scoring based on performance metrics' },
    { icon: <Building2 className="h-6 w-6" />, title: 'Investor Deal Flow', description: 'Curated startup pipeline for investors' },
    { icon: <FileCheck className="h-6 w-6" />, title: 'KYC & Compliance', description: 'Built-in verification and legal compliance' },
  ];

  const stats = [
    { value: '2,500+', label: 'Active Startups' },
    { value: '10,000+', label: 'Verified Talents' },
    { value: '500+', label: 'Investors' },
    { value: '$50M+', label: 'Funds Raised' },
  ];

  const pricingPlans = [
    { name: 'Starter', price: 'Free', description: 'Perfect for getting started', features: ['1 Startup Profile', '5 Applications/Month', 'Basic Agreements', 'Community Support'], cta: 'Get Started', popular: false },
    { name: 'Professional', price: '$49', period: '/month', description: 'For growing startups', features: ['5 Startup Profiles', 'Unlimited Applications', 'Custom Agreements', 'Escrow Payments', 'Priority Support', 'Analytics Dashboard'], cta: 'Start Free Trial', popular: true },
    { name: 'Enterprise', price: 'Custom', description: 'For incubators & VCs', features: ['Unlimited Everything', 'White-label Options', 'API Access', 'Dedicated Manager', 'Custom Integrations', 'SLA Guarantee'], cta: 'Contact Sales', popular: false },
  ];

  const testimonials = [
    { quote: "AlloySphere transformed how we build our team. Found 3 amazing co-founders through the platform.", author: "Sarah Chen", role: "Founder, TechNova AI", avatar: "SC" },
    { quote: "The verification system gives me confidence in every collaboration. Trust is everything.", author: "Marcus Johnson", role: "Full-Stack Developer", avatar: "MJ" },
    { quote: "Finally, a platform that understands startup fundraising. The investor dashboard is brilliant.", author: "David Park", role: "Angel Investor", avatar: "DP" },
  ];

  return (
    <div className="min-h-screen bg-transparent overflow-x-hidden">
      {/* Cinematic CSS Animations */}
      <style>{`
        @keyframes hero-gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes float-particle { 0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.3; } 50% { transform: translateY(-30px) rotate(180deg); opacity: 0.7; } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px rgba(46,139,87,0.2); } 50% { box-shadow: 0 0 60px rgba(46,139,87,0.4), 0 0 120px rgba(0,71,171,0.1); } }
        @keyframes scroll-indicator { 0%, 100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(8px); opacity: 1; } }
        .hero-bg { background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.06), rgba(124,58,237,0.04), rgba(46,139,87,0.08)); background-size: 400% 400%; animation: hero-gradient 15s ease infinite; }
        .feature-card { transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .feature-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(46,139,87,0.15); }
        .stat-item { transition: transform 0.3s ease; }
        .stat-item:hover { transform: scale(1.08); }
        .testimonial-card { transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .testimonial-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.06); }
      `}</style>

      {/* Navigation - Glass Effect */}
      <header
        className="sticky top-0 z-50 w-full border-b transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          borderColor: scrolled ? 'rgba(0,0,0,0.08)' : 'transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
        }}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)', boxShadow: '0 4px 12px rgba(46,139,87,0.3)' }}>
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AlloySphere</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Pricing', 'Testimonials', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full">{item}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={onLogin} className="font-medium">Log In</Button>
            <InteractiveHoverButton text="Get Started" onClick={onRegister} className="w-36" />
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4 space-y-4">
              {['Features', 'Pricing', 'Testimonials', 'About'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm font-medium hover:text-primary">{item}</a>
              ))}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={onLogin}>Log In</Button>
                <InteractiveHoverButton text="Get Started" onClick={onRegister} className="flex-1" />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section - Animated PremiumHero */}
      <PremiumHero onRegister={onRegister} onDemo={onLogin} />

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <RevealSection className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Everything You Need to Build</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Comprehensive tools for founders, talents, and investors to collaborate
              effectively and build successful startups.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <RevealSection key={index} delay={0.1 * index}>
                <div className="feature-card p-6 rounded-2xl bg-white/40 border border-white/20 h-full cursor-default backdrop-blur-md">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.1) 0%, rgba(0,71,171,0.08) 100%)', color: '#2E8B57' }}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative" style={{ background: 'linear-gradient(180deg, rgba(46,139,87,0.03) 0%, transparent 100%)' }}>
        <div className="container mx-auto px-4">
          <RevealSection className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Simple Steps to Get Started</h2>
          </RevealSection>

          <RevealSection delay={0.2}>
            <Tabs defaultValue="founder" className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-12 rounded-xl">
                <TabsTrigger value="founder" className="rounded-lg">For Founders</TabsTrigger>
                <TabsTrigger value="talent" className="rounded-lg">For Talent</TabsTrigger>
                <TabsTrigger value="investor" className="rounded-lg">For Investors</TabsTrigger>
              </TabsList>
              {[
                { key: 'founder', steps: [
                  { step: 1, title: 'Create Your Startup', desc: 'Define your vision, stage, and roles needed' },
                  { step: 2, title: 'Review Applications', desc: 'Browse verified talent and their portfolios' },
                  { step: 3, title: 'Sign Agreements', desc: 'Automated NDA and work agreements' },
                  { step: 4, title: 'Track Milestones', desc: 'Manage deliverables and escrow payments' },
                ]},
                { key: 'talent', steps: [
                  { step: 1, title: 'Complete Profile', desc: 'Build your professional profile and portfolio' },
                  { step: 2, title: 'Get Verified', desc: 'Pass skill tests and KYC verification' },
                  { step: 3, title: 'Apply to Startups', desc: 'Find opportunities matching your skills' },
                  { step: 4, title: 'Deliver & Get Paid', desc: 'Complete milestones and receive payment' },
                ]},
                { key: 'investor', steps: [
                  { step: 1, title: 'Set Preferences', desc: 'Define investment criteria and ticket size' },
                  { step: 2, title: 'Browse Deal Flow', desc: 'Access curated startup opportunities' },
                  { step: 3, title: 'Due Diligence', desc: 'Review trust scores and metrics' },
                  { step: 4, title: 'Invest & Track', desc: 'Complete deals and monitor progress' },
                ]},
              ].map(tab => (
                <TabsContent key={tab.key} value={tab.key} className="space-y-4">
                  {tab.steps.map((item) => (
                    <div key={item.step} className="flex items-start gap-4 p-5 rounded-xl transition-all duration-300 hover:bg-accent/50" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                      <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </RevealSection>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <RevealSection className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">Pricing</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Start for free, upgrade as you grow. No hidden fees.</p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {pricingPlans.map((plan, index) => (
              <RevealSection key={index} delay={0.15 * index}>
                <Card className={`relative rounded-2xl transition-all duration-400 hover:-translate-y-2 bg-white/40 backdrop-blur-md ${plan.popular ? 'border-2 shadow-xl' : 'border-white/20 hover:shadow-lg'}`} style={plan.popular ? { borderColor: '#2E8B57', boxShadow: '0 20px 60px rgba(46,139,87,0.12)' } : {}}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1 text-white" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-5xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-lg">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3.5">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-2.5">
                          <Check className="h-4 w-4 shrink-0" style={{ color: '#2E8B57' }} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pb-8">
                    {plan.popular ? (
                      <InteractiveHoverButton text={plan.cta} onClick={onRegister} className="w-full" />
                    ) : (
                      <Button className="w-full rounded-xl" variant="outline" onClick={onRegister}>{plan.cta}</Button>
                    )}
                  </CardFooter>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24" style={{ background: 'linear-gradient(180deg, rgba(46,139,87,0.03) 0%, transparent 100%)' }}>
        <div className="container mx-auto px-4">
          <RevealSection className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-1.5">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Trusted by Thousands</h2>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <RevealSection key={index} delay={0.15 * index}>
                <Card className="testimonial-card border-white/20 rounded-2xl h-full bg-white/40 backdrop-blur-md">
                  <CardContent className="pt-8 pb-8">
                    <div className="flex gap-1 mb-5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed italic">&quot;{testimonial.quote}&quot;</p>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full flex items-center justify-center font-semibold text-white text-sm" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{testimonial.author}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Cinematic */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 60%, #1a1a2e 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute rounded-full opacity-20" style={{ width: 400, height: 400, top: '-15%', right: '-10%', background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute rounded-full opacity-15" style={{ width: 300, height: 300, bottom: '-10%', left: '-5%', background: 'radial-gradient(circle, #2E8B57 0%, transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <RevealSection className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">
            Ready to Build Your Dream Team?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of founders, talents, and investors building the future together.
          </p>
          <InteractiveHoverButton text="Get Started Free" onClick={onRegister} className="w-56 p-3.5 text-lg border-white/20" />
        </RevealSection>
      </section>

      {/* Footer */}
      <footer id="about" className="py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)' }}>
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">AlloySphere</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AI-powered startup collaboration platform connecting verified talents,
                founders, and investors.
              </p>
            </div>
            {[
              { title: 'Platform', links: ['Features', 'Pricing', 'Security', 'API'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="hover:text-foreground transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 AlloySphere. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
