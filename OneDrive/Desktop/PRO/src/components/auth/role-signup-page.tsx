'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import AnoAI from '@/components/ui/animated-shader-background';

interface RoleSignupPageProps {
    role: 'founder' | 'investor' | 'talent';
    accent: string;
    title: string;
    subtitle: string;
}

const roleMeta: Record<string, { emoji: string; color: string }> = {
    founder: { emoji: '🚀', color: '#2E8B57' },
    investor: { emoji: '📊', color: '#0047AB' },
    talent: { emoji: '💡', color: '#7C3AED' },
};

export function RoleSignupPage({ role, title, subtitle }: RoleSignupPageProps) {
    const router = useRouter();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const meta = roleMeta[role] || roleMeta.founder;

    const handleGoogleSignUp = () => {
        setIsLoading(true);
        // Redirect to our server-side Google OAuth endpoint
        window.location.href = `/api/auth/google?role=${role}&mode=signup`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <style>{`
                @keyframes signup-gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
                .signup-bg { background: linear-gradient(135deg, rgba(46,139,87,0.04), rgba(0,71,171,0.03), rgba(124,58,237,0.02), rgba(46,139,87,0.04)); background-size: 400% 400%; animation: signup-gradient 15s ease infinite; }
            `}</style>

            {/* Nav */}
            <header className="border-b border-border/50" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)', boxShadow: '0 4px 15px rgba(46,139,87,0.3)' }}>
                            <Logo size={20} className="text-white drop-shadow-md" />
                        </div>
                    </Link>
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-12 relative">
                <AnoAI />

                <div className="w-full max-w-sm relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20`, color: meta.color }}>
                            <span>{meta.emoji}</span> {title} Account
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight mb-1">Create your account</h2>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    </div>

                    {/* Google Sign Up - Primary and only method */}
                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 text-white group"
                        style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)', boxShadow: '0 4px 14px rgba(46,139,87,0.3)' }}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity="0.9" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" fillOpacity="0.8" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity="0.85" />
                                </svg>
                                Continue with Google
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm mt-6 text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium hover:underline text-foreground">Sign in</Link>
                    </p>

                    <p className="text-center text-xs mt-4 text-muted-foreground">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="hover:underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                    </p>
                </div>
            </main>

            <footer className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.8)' }}>
                © {new Date().getFullYear()} AlloySphere. All rights reserved.
            </footer>
        </div>
    );
}
