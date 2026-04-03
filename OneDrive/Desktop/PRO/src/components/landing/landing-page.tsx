'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import { Shield, Menu, X, ArrowRight, Share2, Globe, Sparkles, Code2, Terminal } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { motion } from 'framer-motion';

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

  return (
    <div className="min-h-screen bg-transparent overflow-x-hidden relative">
      <style>{`
        @keyframes hero-gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .hero-bg { background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.06), rgba(124,58,237,0.04), rgba(46,139,87,0.08)); background-size: 400% 400%; animation: hero-gradient 15s ease infinite; }
        .feature-card { transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {/* Background container following previous design */}
      <div className="absolute inset-0 -z-10 hero-bg" />

      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute rounded-full opacity-20" style={{ width: 500, height: 500, top: '-5%', right: '-5%', background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full opacity-15" style={{ width: 400, height: 400, bottom: '20%', left: '-10%', background: 'radial-gradient(circle, #2E8B57 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Navigation - Glass Effect */}
      <header
        style={{
          background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
        }}
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-none ${scrolled ? 'dark:!bg-background/85' : ''}`}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-2.5">
            <Logo size={24} className="text-foreground" />
            <span className="text-xl font-bold tracking-tight">AlloySphere</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 translate-x-12">
            {['Features', 'Solutions', 'Network', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative">{item}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={onLogin} className="font-medium hover:bg-transparent hover:text-primary">Sign In</Button>
            <InteractiveHoverButton text="Get Started" onClick={onRegister} className="w-32 bg-[#0d3b2e] hover:bg-[#1a5b48] text-white rounded-xl border-none font-medium h-10" />
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur-xl absolute w-full left-0">
            <div className="container mx-auto px-4 py-4 space-y-4">
              {['Features', 'Solutions', 'Network', 'Pricing'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm font-medium hover:text-primary">{item}</a>
              ))}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={onLogin}>Sign In</Button>
                <InteractiveHoverButton text="Get Started" onClick={onRegister} className="flex-1 bg-[#0d3b2e] text-white border-none" />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="container mx-auto px-6 lg:px-12 pt-12 pb-24">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 min-h-[70vh]">
          {/* Left Content */}
          <div className="flex-1 max-w-2xl pt-10">
            <RevealSection delay={0.1}>
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>
                <Sparkles className="h-3 w-3" /> THE INNOVATION NETWORK
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-[#111] dark:text-foreground">
                Accelerate  your startup<br />
                with <span style={{ color: '#005b82' }}>AlloySphere.</span><br />
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
                The ultimate collaboration ecosystem connecting visionary founders, elite talent, and strategic investors to build the future of the web.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <LiquidButton 
                  onClick={onRegister} 
                  className="w-full sm:w-auto px-8 h-12 text-base font-medium rounded-xl group transition-all"
                >
                  Join the Network
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </LiquidButton>
                <LiquidButton 
                  variant="outline"
                  onClick={onLogin}
                  className="w-full sm:w-auto px-8 h-12 text-base font-medium rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-all"
                >
                  Sign In
                </LiquidButton>
              </div>
            </RevealSection>
          </div>

          {/* Right Content - Generated Dashboard Image */}
          <div className="flex-1 w-full lg:w-auto h-full min-h-[500px] flex justify-end">
            <RevealSection delay={0.3} className="w-full h-full xl:w-[680px] xl:h-[580px]">
              <div className="w-full h-full rounded-[2rem] bg-white dark:bg-card shadow-2xl shadow-gray-200/50 dark:shadow-black/30 flex flex-col items-center justify-center relative overflow-hidden">
                <img src="/images/dashboard_ui_preview_1774367513473.png" alt="AlloySphere Dashboard Overview" className="w-[110%] h-[110%] object-cover object-top opacity-95 transition-transform duration-700 hover:scale-105" />
              </div>
            </RevealSection>
          </div>
        </div>

        {/* Feature Grid Section */}
        <div className="mt-32">
          <RevealSection delay={0.1}>
            <h2 className="text-3xl font-bold mb-2">Engineered for AlloySphere</h2>
            <p className="text-muted-foreground mb-12">Uncompromising collaboration for the next generation of startups.</p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Unified Tech Stack - Span 2 */}
            <RevealSection delay={0.2} className="sm:col-span-2">
              <div className="bg-white dark:bg-card rounded-[2rem] p-8 h-full shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 text-emerald-600 flex items-center justify-center mb-6">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Unified Ecosystem</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                  Connect founders, talent, and investors in one seamless environment. We handle the networking complexity so you can focus on building.
                </p>
                {/* Code placeholder visually mimicking the dark editor */}
                <div className="w-full h-40 bg-[#1e1e1e] rounded-xl overflow-hidden p-6 relative">
                   <div className="opacity-60 font-mono text-xs flex flex-col gap-2">
                     <div className="flex gap-4"><span className="text-blue-400">import</span> <span className="text-indigo-300">{`{ Configuration }`}</span> <span className="text-blue-400">from</span> <span className="text-orange-300">'@alloysphere/core'</span></div>
                     <div className="flex gap-4"><span className="text-blue-400">export const</span> <span className="text-blue-200">config</span> <span className="text-white">=</span> <span className="text-blue-400">new</span> <span className="text-yellow-200">Configuration</span>{`({`}</div>
                     <div className="flex gap-4 ml-4"><span className="text-blue-300">environment:</span> <span className="text-orange-300">'production'</span>,</div>
                     <div className="flex gap-4 ml-4"><span className="text-blue-300">edge:</span> <span className="text-blue-400">true</span>,</div>
                     <div className="flex gap-4 ml-4"><span className="text-blue-300">security:</span> <span className="text-blue-400">true</span></div>
                     <div className="flex gap-4">{`})`}</div>
                   </div>
                   {/* Blur mask to emulate the screenshot's blurred right edge */}
                   <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#1e1e1e] to-transparent" />
                </div>
              </div>
            </RevealSection>

            {/* Encrypted Core - Span 1 */}
            <RevealSection delay={0.3} className="sm:col-span-1">
              <div className="bg-[#f0f6fc] dark:bg-card rounded-[2rem] p-8 h-full flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="text-blue-600 mb-6 mt-2">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-3">Secure Collaboration</h3>
                  <p className="text-blue-800/70 dark:text-blue-300/70 text-sm leading-relaxed mb-6">
                    Enterprise-grade security for every interaction. Your startup's data privacy is our architectural priority.
                  </p>
                </div>
                
                {/* Trusted By module */}
                <div className="pt-6 border-t border-blue-200/50">
                  <div className="flex -space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#f0f6fc] bg-gray-200" />
                    <div className="w-10 h-10 rounded-full border-2 border-[#f0f6fc] bg-gray-300" />
                    <div className="w-10 h-10 rounded-full border-2 border-[#f0f6fc] bg-slate-400" />
                  </div>
                  <p className="text-xs text-blue-800/60 font-medium">Trusted by 2,000+ teams</p>
                </div>
              </div>
            </RevealSection>

            {/* AI-Optimized - Span 1 */}
            <RevealSection delay={0.4} className="sm:col-span-1">
              <div className="bg-white dark:bg-card rounded-[2rem] p-8 h-full shadow-sm hover:shadow-md transition-shadow">
                 <div className="text-indigo-600 mb-6 mt-2">
                    <Code2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">AI-Matched Connections</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Integrated AI algorithms for lightning-fast matchmaking between profiles and opportunities.
                  </p>
              </div>
            </RevealSection>

            {/* Global Network - Span 2 */}
            <RevealSection delay={0.5} className="sm:col-span-2">
              <div className="bg-white dark:bg-card rounded-[2rem] p-8 h-full shadow-sm flex flex-col md:flex-row hover:shadow-md transition-shadow">
                <div className="flex-1 md:pr-8 mb-6 md:mb-0">
                  <h3 className="text-xl font-bold mb-3">Global Startup Network</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    A curated network ensuring high-fidelity connections for founders anywhere on the planet.
                  </p>
                </div>
                {/* Map placeholder */}
                 <div className="flex-1 rounded-2xl bg-gray-100 flex items-center justify-center min-h-[160px]">
                    <Globe className="w-12 h-12 text-gray-300" />
                 </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </main>

      {/* CTA Bottom Section */}
      <section className="container mx-auto px-6 lg:px-12 py-12">
        <RevealSection delay={0.2}>
          <div className="bg-[#1a1c1e] text-white rounded-[2.5rem] py-16 px-10 md:px-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10 max-w-xl text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                Ready to build the <span className="text-emerald-400">future?</span>
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <LiquidButton 
                  onClick={onRegister}
                  className="w-full sm:w-auto px-8 h-12 text-sm font-bold bg-emerald-200 text-emerald-950 hover:bg-emerald-300 rounded-xl"
                >
                  Get Started Now
                </LiquidButton>
                <LiquidButton 
                  onClick={onLogin}
                  variant="outline"
                  className="w-full sm:w-auto px-8 h-12 text-sm font-medium border-gray-600 text-white hover:bg-white/10 hover:text-white rounded-xl bg-transparent"
                >
                  Contact Sales
                </LiquidButton>
              </div>
            </div>
            
            {/* Geometric diamond graphic placeholder */}
            <div className="hidden md:flex relative z-10 w-64 h-64 items-center justify-center opacity-80 right-10">
              <div className="w-40 h-40 border-8 border-emerald-900 absolute rotate-45 transform origin-center scale-[1]" />
              <div className="w-40 h-40 border-8 border-emerald-800 absolute top-[25px] rotate-45 transform origin-center scale-[1]" />
              <div className="w-40 h-40 border-8 border-emerald-700 absolute top-[50px] rotate-45 transform origin-center scale-[1]" />
              <div className="w-40 h-40 bg-emerald-600 absolute top-[75px] rotate-45 transform origin-center" />
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 text-sm mt-10 bg-[#f8fafc] dark:bg-card">
        <div className="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 md:items-start text-center md:text-left">
            <div className="font-bold flex items-center gap-2">
                AlloySphere
            </div>
            <span className="text-muted-foreground text-xs">© {new Date().getFullYear()} AlloySphere Inc. Engineered for Innovation.</span>
          </div>

          <div className="flex gap-6 text-muted-foreground font-medium text-xs">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
            <a href="#" className="hover:text-foreground">Status</a>
          </div>

          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer"><Share2 className="w-4 h-4" /></div>
             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300 transition-colors cursor-pointer"><Globe className="w-4 h-4" /></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
