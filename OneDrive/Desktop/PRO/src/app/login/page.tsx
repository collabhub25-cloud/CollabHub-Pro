'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Loader2, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

const roles = [
    { id: 'founder' as const, label: 'Founder', desc: 'Launch & grow' },
    { id: 'investor' as const, label: 'Investor', desc: 'Fund startups' },
    { id: 'talent' as const, label: 'Talent', desc: 'Join a team' },
];

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuthStore();
    const [selectedRole, setSelectedRole] = useState<'founder' | 'investor' | 'talent'>('founder');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Handle OAuth error messages from redirect
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            const messages: Record<string, string> = {
                google_cancelled: 'Google Sign-In was cancelled.',
                missing_code: 'Google authentication failed. Please try again.',
                token_exchange_failed: 'Google authentication failed. Please try again.',
                userinfo_failed: 'Could not retrieve your Google profile. Please try again.',
                no_email: 'Could not retrieve your email from Google.',
                role_mismatch: `This email is already registered as a ${searchParams.get('existing_role') || 'different role'}.`,
                server_config: 'Google authentication is not configured. Please contact support.',
                internal: 'An unexpected error occurred. Please try again.',
            };
            toast.error(messages[error] || 'Google Sign-In failed. Please try again.');
            router.replace('/login', { scroll: false });
        }
    }, [searchParams, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                const userRole = data.user?.role;
                if (userRole && userRole !== selectedRole) {
                    toast.error(`This account is registered as ${userRole}. Please select the correct role.`);
                    setIsLoading(false);
                    return;
                }
                login(data.user);
                router.push(`/dashboard/${userRole || selectedRole}`);
            } else {
                toast.error(data.error || 'Invalid credentials');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = `/api/auth/google?role=${selectedRole}&mode=login`;
    };

    return (
        <div className="w-full max-w-sm relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(46,139,87,0.08)', border: '1px solid rgba(46,139,87,0.12)', color: '#2E8B57' }}>
                    <Sparkles className="h-3 w-3" /> Welcome back
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">Sign in to AlloySphere</h2>
                <p className="text-sm text-muted-foreground">Select your role, then enter your credentials.</p>
            </div>

            {/* Google Sign In - Redirect based */}
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium border border-border/80 bg-white hover:bg-accent transition-all duration-200 hover:shadow-sm mb-6 disabled:opacity-50"
            >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground">or sign in with email</span>
                <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* Role Selector */}
            <div className="flex gap-1 mb-6 p-1 rounded-xl bg-muted/50" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
                {roles.map((role) => (
                    <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${selectedRole === role.id
                            ? 'bg-white text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <span className="block text-xs">{role.label}</span>
                        <span className="block text-caption mt-0.5 opacity-50">{role.desc}</span>
                    </button>
                ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white border border-border"
                        placeholder="you@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm pr-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 bg-white border border-border" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-foreground text-muted-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <div className="flex justify-end mt-1.5">
                        <Link href="/forgot-password" className="text-xs hover:underline text-muted-foreground">Forgot password?</Link>
                    </div>
                </div>
                <button type="submit" disabled={isLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 group text-white"
                    style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)' }}>
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            Sign in
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                    )}
                </button>
            </form>

            <p className="text-center text-sm mt-6 text-muted-foreground">
                No account?{' '}
                <Link href={`/signup/${selectedRole}`} className="font-medium hover:underline text-foreground">Create one</Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <style>{`
                @keyframes login-gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
                .login-bg { background: linear-gradient(135deg, rgba(46,139,87,0.04), rgba(0,71,171,0.03), rgba(124,58,237,0.02), rgba(46,139,87,0.04)); background-size: 400% 400%; animation: login-gradient 15s ease infinite; }
            `}</style>

            {/* Nav */}
            <header className="border-b border-border/50" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)', boxShadow: '0 4px 15px rgba(46,139,87,0.3)' }}>
                            <Logo size={20} className="text-white drop-shadow-md" />
                        </div>
                        <span className="text-base font-semibold tracking-tight">AlloySphere</span>
                    </Link>
                    <Link href="/signup/founder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create account</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16 relative">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
                    <LoginForm />
                </Suspense>
            </main>

            <footer className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.8)' }}>
                © {new Date().getFullYear()} AlloySphere. All rights reserved.
            </footer>
        </div>
    );
}
