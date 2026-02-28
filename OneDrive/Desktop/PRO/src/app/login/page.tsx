'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

const roles = [
    { id: 'founder' as const, label: 'Founder' },
    { id: 'investor' as const, label: 'Investor' },
    { id: 'talent' as const, label: 'Talent' },
];

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [selectedRole, setSelectedRole] = useState<'founder' | 'investor' | 'talent'>('founder');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <header className="border-b" style={{ borderColor: '#D8D2C8' }}>
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link href="/" className="text-base font-medium" style={{ letterSpacing: '0.3px' }}>Collab·Hub</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-sm">
                    <h2 className="mb-1">Sign in</h2>
                    <p className="text-sm mb-8" style={{ color: '#6C635C' }}>Select your role, then enter your credentials.</p>

                    <div className="flex gap-1 mb-8 p-1 rounded" style={{ background: '#EDE9E3' }}>
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedRole(role.id)}
                                className="flex-1 py-2 text-sm font-medium rounded transition-colors"
                                style={selectedRole === role.id
                                    ? { background: '#FBF9F6', color: '#2A2623', boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }
                                    : { color: '#6C635C' }
                                }
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                                placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                                    className="w-full px-3 py-2 rounded text-sm pr-10 focus:outline-none"
                                    style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6C635C' }}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1.5">
                                <Link href="/forgot-password" className="text-xs" style={{ color: '#6C635C' }}>Forgot password?</Link>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading}
                            className="w-full py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ background: '#2A2623', color: '#FBF9F6' }}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Sign in'}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: '#6C635C' }}>
                        No account?{' '}
                        <Link href={`/signup/${selectedRole}`} className="font-medium hover:underline" style={{ color: '#2A2623' }}>Create one</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
