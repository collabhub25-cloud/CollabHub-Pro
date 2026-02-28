'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

interface RoleSignupPageProps {
    role: 'founder' | 'investor' | 'talent';
    accent: string;
    title: string;
    subtitle: string;
}

export function RoleSignupPage({ role, accent, title, subtitle }: RoleSignupPageProps) {
    const router = useRouter();
    const { login } = useAuthStore();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
        if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password, role }),
            });
            const data = await response.json();
            if (response.ok) {
                login(data.user);
                router.push(`/dashboard/${role}`);
            } else {
                if (data.fields && Object.keys(data.fields).length > 0) {
                    toast.error(Object.values(data.fields)[0] as string);
                } else {
                    toast.error(data.error || 'Registration failed');
                }
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = { background: '#FBF9F6', border: '1px solid #D8D2C8' };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <header className="border-b" style={{ borderColor: '#D8D2C8' }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-medium" style={{ letterSpacing: '0.3px' }}>Collab·Hub</Link>
                    <Link href="/login" className="text-sm" style={{ color: '#6C635C' }}>Sign in</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-sm">
                    <p className="text-sm font-medium mb-3" style={{ color: accent }}>{title}</p>
                    <h2 className="mb-1">Create your account</h2>
                    <p className="text-sm mb-8" style={{ color: '#6C635C' }}>{subtitle}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Full name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none" style={inputStyle} placeholder="Jane Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none" style={inputStyle} placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                                    className="w-full px-3 py-2 rounded text-sm pr-10 focus:outline-none" style={inputStyle} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6C635C' }}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none" style={inputStyle} />
                        </div>
                        <button type="submit" disabled={isLoading}
                            className="w-full py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ background: '#2A2623', color: '#FBF9F6' }}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create account'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: '#6C635C' }}>
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium hover:underline" style={{ color: '#2A2623' }}>Sign in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
