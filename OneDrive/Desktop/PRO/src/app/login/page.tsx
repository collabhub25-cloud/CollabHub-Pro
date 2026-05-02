'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const roles = [
    { id: 'founder' as const, label: 'FOUNDER', icon: '🚀' },
    { id: 'investor' as const, label: 'INVESTOR', icon: '🏛️' },
    { id: 'talent' as const, label: 'TALENT', icon: '🧠' },
];

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuthStore();
    const [selectedRole, setSelectedRole] = useState<'founder' | 'investor' | 'talent'>('founder');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleGoogleSignIn = () => {
        setIsLoading(true);
        window.location.href = `/api/auth/google?role=${selectedRole}&mode=login`;
    };

    return (
        <div className="w-full max-w-md mx-auto bg-card text-card-foreground p-10 rounded-[2rem] shadow-xl shadow-black/5 dark:shadow-black/30 border border-border/50">
            {/* Logo header */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-xl mb-8">
                <Logo size={20} className="text-foreground" />
                <span className="font-bold text-lg tracking-tight text-foreground">AlloySphere</span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Sign in to AlloySphere</h2>
            <p className="text-muted-foreground mb-8">Continue your journey in the network.</p>

            <div className="mb-8">
                <label className="block text-sm font-semibold mb-3 text-foreground">Select your role</label>
                <div className="flex gap-3">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setSelectedRole(role.id)}
                            className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 transition-all ${
                                selectedRole === role.id
                                    ? 'border-transparent bg-muted text-foreground'
                                    : 'border-transparent bg-secondary hover:bg-muted text-muted-foreground'
                            }`}
                        >
                            <span className="text-xl opacity-80">{role.icon}</span>
                            <span className="text-xs font-bold tracking-wider">{role.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <Button
                    type="button"
                    variant="cta"
                    size="xl"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3.5"
                >
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <span className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </span>
                        </>
                    )}
                </Button>
            </div>

            <p className="text-center text-sm font-medium text-muted-foreground mt-8">
                Don't have an account?{' '}
                <Link href={`/signup/${selectedRole}`} className="font-bold text-primary hover:text-primary/80">Create an account</Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col lg:flex-row text-foreground relative overflow-hidden login-bg">
            <style>{`
                @keyframes login-gradient { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
                .login-bg { background: linear-gradient(135deg, rgba(46,139,87,0.04), rgba(0,71,171,0.03), rgba(124,58,237,0.02), rgba(46,139,87,0.04)); background-size: 400% 400%; animation: login-gradient 15s ease infinite; }
                .dark .login-bg { background: linear-gradient(135deg, rgba(46,139,87,0.06), rgba(0,71,171,0.04), rgba(124,58,237,0.03), rgba(46,139,87,0.06)); }
            `}</style>
            
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute rounded-full opacity-20 dark:opacity-10" style={{ width: 400, height: 400, top: '-15%', right: '-10%', background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(80px)' }} />
                <div className="absolute rounded-full opacity-15 dark:opacity-8" style={{ width: 300, height: 300, bottom: '-10%', left: '-5%', background: 'radial-gradient(circle, #2E8B57 0%, transparent 70%)', filter: 'blur(60px)' }} />
            </div>
            {/* Left Side Branding */}
            <div className="hidden lg:flex flex-col justify-center p-16 lg:w-[45%] xl:w-[50%] relative">
                <div className="absolute top-8 left-8">
                     <Link href="/" className="flex items-center gap-2">
                        <Logo size={24} className="text-foreground" />
                        <span className="text-lg font-bold tracking-tight text-foreground">AlloySphere</span>
                    </Link>
                </div>

                <div className="max-w-lg mx-auto z-10 w-full pl-0 xl:pl-10">
                    <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        THE INNOVATION NETWORK
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight text-foreground">
                        Architecting the future of <span className="italic text-emerald-700 dark:text-emerald-400">connected</span> capital.
                    </h1>
                    <p className="text-lg text-muted-foreground mb-12 max-w-md">
                        Join the ecosystem where high-growth founders meet sophisticated investors and elite talent.
                    </p>

                    {/* Image placeholders matching the layout visual */}
                    <div className="flex gap-4 items-end mt-8 relative">
                         <div className="w-[200px] h-[260px] bg-muted rounded-2xl overflow-hidden shadow-lg border border-border relative z-20">
                             <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/modern_glass_office_1774367778077.png')" }}></div>
                         </div>
                         <div className="w-[240px] h-[200px] bg-muted rounded-2xl overflow-hidden shadow-xl border border-border relative z-10 transform translate-x-[-20px] translate-y-[-20px]">
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/green_building_1774367889748.png')" }}></div>
                         </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-8 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} AlloySphere Inc. Engineered for Innovation.
                </div>
            </div>

            {/* Right Side Form */}
            <main className="flex-1 flex flex-col justify-center items-center p-6 relative">
                 <div className="w-full max-w-md lg:hidden mb-12 flex justify-center">
                     <Link href="/" className="flex items-center gap-2">
                        <Logo size={24} className="text-foreground" />
                        <span className="text-lg font-bold tracking-tight text-foreground">AlloySphere</span>
                    </Link>
                 </div>
                 
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}>
                    <LoginForm />
                </Suspense>

                <div className="mt-8 flex gap-4 text-xs font-semibold text-muted-foreground">
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                    <Link href="/help" className="hover:text-foreground transition-colors">Help Center</Link>
                </div>
            </main>
        </div>
    );
}
