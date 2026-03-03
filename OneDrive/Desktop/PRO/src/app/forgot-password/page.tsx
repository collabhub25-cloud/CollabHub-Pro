'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSent(true);
                toast.success(data.message || 'If an account exists, a reset email has been sent.');
            } else {
                toast.error(data.error || 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong. Please try again.');
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
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#EDE9E3' }}>
                                <Mail className="h-6 w-6" style={{ color: '#6C635C' }} />
                            </div>
                            <h2 className="text-lg font-medium">Check your email</h2>
                            <p className="text-sm" style={{ color: '#6C635C' }}>
                                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset code.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-medium hover:underline mt-4"
                                style={{ color: '#2A2623' }}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="mb-1">Reset password</h2>
                            <p className="text-sm mb-8" style={{ color: '#6C635C' }}>
                                Enter your email and we&apos;ll send you a reset code.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                        style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                                    style={{ background: '#2A2623', color: '#FBF9F6' }}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send reset code'}
                                </button>
                            </form>

                            <p className="text-center text-sm mt-6" style={{ color: '#6C635C' }}>
                                Remember your password?{' '}
                                <Link href="/login" className="font-medium hover:underline" style={{ color: '#2A2623' }}>
                                    Sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
