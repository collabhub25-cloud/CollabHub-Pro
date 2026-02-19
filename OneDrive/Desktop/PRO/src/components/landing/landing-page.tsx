'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket, Users, Shield, Zap, ChevronRight, Check, Star, 
  TrendingUp, Handshake, FileCheck, Award, Building2, 
  Lightbulb, Target, Globe, Menu, X
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Verified Talent Pool',
      description: '4-level verification system ensuring quality collaborations',
    },
    {
      icon: <Handshake className="h-6 w-6" />,
      title: 'Smart Agreements',
      description: 'Automated NDA, Work, Equity, and SAFE agreements',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'Milestone Tracking',
      description: 'Escrow-based payments with milestone verification',
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: 'Trust Score Engine',
      description: 'Reputation scoring based on performance metrics',
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      title: 'Investor Deal Flow',
      description: 'Curated startup pipeline for investors',
    },
    {
      icon: <FileCheck className="h-6 w-6" />,
      title: 'KYC & Compliance',
      description: 'Built-in verification and legal compliance',
    },
  ];

  const stats = [
    { value: '2,500+', label: 'Active Startups' },
    { value: '10,000+', label: 'Verified Talents' },
    { value: '500+', label: 'Investors' },
    { value: '$50M+', label: 'Funds Raised' },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for getting started',
      features: ['1 Startup Profile', '5 Applications/Month', 'Basic Agreements', 'Community Support'],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$49',
      period: '/month',
      description: 'For growing startups',
      features: ['5 Startup Profiles', 'Unlimited Applications', 'Custom Agreements', 'Escrow Payments', 'Priority Support', 'Analytics Dashboard'],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For incubators & VCs',
      features: ['Unlimited Everything', 'White-label Options', 'API Access', 'Dedicated Manager', 'Custom Integrations', 'SLA Guarantee'],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const testimonials = [
    {
      quote: "CollabHub transformed how we build our team. Found 3 amazing co-founders through the platform.",
      author: "Sarah Chen",
      role: "Founder, TechNova AI",
      avatar: "SC"
    },
    {
      quote: "The verification system gives me confidence in every collaboration. Trust is everything.",
      author: "Marcus Johnson",
      role: "Full-Stack Developer",
      avatar: "MJ"
    },
    {
      quote: "Finally, a platform that understands startup fundraising. The investor dashboard is brilliant.",
      author: "David Park",
      role: "Angel Investor",
      avatar: "DP"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CollabHub</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">Testimonials</a>
            <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">About</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={onLogin}>Log In</Button>
            <Button onClick={onRegister}>Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <a href="#features" className="block text-sm font-medium hover:text-primary">Features</a>
              <a href="#pricing" className="block text-sm font-medium hover:text-primary">Pricing</a>
              <a href="#testimonials" className="block text-sm font-medium hover:text-primary">Testimonials</a>
              <a href="#about" className="block text-sm font-medium hover:text-primary">About</a>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={onLogin}>Log In</Button>
                <Button className="flex-1" onClick={onRegister}>Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <Zap className="h-3 w-3 mr-2" />
              AI-Powered Startup Collaboration Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Build Your Startup with{' '}
              <span className="text-primary">Verified Talent</span>{' '}
              & Investors
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The all-in-one platform connecting founders, talents, and investors. 
              Verified collaborations, automated agreements, milestone-based payments, 
              and trust scoring.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={onRegister}>
                Start Building Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={onLogin}>
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Build
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools for founders, talents, and investors to collaborate 
              effectively and build successful startups.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 bg-background hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple Steps to Get Started
            </h2>
          </div>

          <Tabs defaultValue="founder" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="founder">For Founders</TabsTrigger>
              <TabsTrigger value="talent">For Talent</TabsTrigger>
              <TabsTrigger value="investor">For Investors</TabsTrigger>
            </TabsList>
            <TabsContent value="founder" className="space-y-4">
              {[
                { step: 1, title: 'Create Your Startup', desc: 'Define your vision, stage, and roles needed' },
                { step: 2, title: 'Review Applications', desc: 'Browse verified talent and their portfolios' },
                { step: 3, title: 'Sign Agreements', desc: 'Automated NDA and work agreements' },
                { step: 4, title: 'Track Milestones', desc: 'Manage deliverables and escrow payments' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="talent" className="space-y-4">
              {[
                { step: 1, title: 'Complete Profile', desc: 'Build your professional profile and portfolio' },
                { step: 2, title: 'Get Verified', desc: 'Pass skill tests and KYC verification' },
                { step: 3, title: 'Apply to Startups', desc: 'Find opportunities matching your skills' },
                { step: 4, title: 'Deliver & Get Paid', desc: 'Complete milestones and receive payment' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="investor" className="space-y-4">
              {[
                { step: 1, title: 'Set Preferences', desc: 'Define investment criteria and ticket size' },
                { step: 2, title: 'Browse Deal Flow', desc: 'Access curated startup opportunities' },
                { step: 3, title: 'Due Diligence', desc: 'Review trust scores and metrics' },
                { step: 4, title: 'Invest & Track', desc: 'Complete deals and monitor progress' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start for free, upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border/50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={onRegister}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Thousands
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6">&quot;{testimonial.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Your Dream Team?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of founders, talents, and investors building the future together.
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" onClick={onRegister}>
            Get Started Free
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">CollabHub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The AI-powered startup collaboration platform connecting verified talents, 
                founders, and investors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Features</a></li>
                <li><a href="#" className="hover:text-primary">Pricing</a></li>
                <li><a href="#" className="hover:text-primary">Security</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 CollabHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
