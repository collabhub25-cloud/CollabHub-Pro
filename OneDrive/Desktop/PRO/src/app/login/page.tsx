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
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
            <header className="border-b border-[#E5E7EB] bg-white">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link href="/" className="text-base font-semibold tracking-wide">Collab·Hub</Link>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="w-full max-w-sm">
                    <h1 style={{ fontSize: '22px', fontWeight: 600 }} className="mb-1">Sign in</h1>
                    <p className="text-sm text-[#6B7280] mb-8">Select your role, then enter your credentials.</p>

                    {/* Role selector */}
                    <div className="flex gap-1 mb-8 p-1 bg-[#F3F4F6] rounded-md">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedRole(role.id)}
                                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${selectedRole === role.id
                                        ? 'bg-white text-[#111827] shadow-sm'
                                        : 'text-[#6B7280] hover:text-[#111827]'
                                    }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-sm pr-10 bg-white focus:outline-none focus:ring-1 focus:ring-[#2B5FD9] focus:border-[#2B5FD9]"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1.5">
                                <Link href="/forgot-password" className="text-xs text-[#9CA3AF] hover:text-[#6B7280]">Forgot password?</Link>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2 rounded-md text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Sign in'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[#6B7280] mt-6">
                        No account?{' '}
                        <Link href={`/signup/${selectedRole}`} className="text-[#111827] font-medium hover:underline">Create one</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
