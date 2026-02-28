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

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
            <header className="border-b border-[#E5E7EB] bg-white">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-base font-semibold tracking-wide">Collab·Hub</Link>
                    <Link href="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">Sign in</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-sm">
                    <p className={`text-sm font-medium mb-3 ${accent}`}>{title}</p>
                    <h1 style={{ fontSize: '22px', fontWeight: 600 }} className="mb-1">Create your account</h1>
                    <p className="text-sm text-[#6B7280] mb-8">{subtitle}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Full name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]"
                                placeholder="Jane Doe" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]"
                                placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm pr-10 bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]" />
                        </div>
                        <button type="submit" disabled={isLoading}
                            className="w-full py-2 rounded-md text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] transition-colors disabled:opacity-50">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[#6B7280] mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#111827] font-medium hover:underline">Sign in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
