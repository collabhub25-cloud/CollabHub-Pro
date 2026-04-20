'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from '@/components/dashboard/dashboard';

/**
 * Founder Dashboard Page
 * 
 * Auth is verified server-side by dashboard/layout.tsx — no need for
 * fetchUser() or redundant auth checks here. The store's persisted state
 * provides user data instantly. We just do a background revalidation.
 * 
 * ThemeProvider is already in the root layout — removed duplicate here.
 */
export default function FounderDashboardPage() {
    const { isAuthenticated, user, isLoading, fetchUser, logout } = useAuthStore();
    const router = useRouter();

    // Background revalidation of user data (non-blocking)
    useEffect(() => {
        fetchUser().catch(() => {});
    }, [fetchUser]);

    // Role guard (middleware handles this, but defense-in-depth)
    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.role !== 'founder') {
            router.push(`/dashboard/${user?.role}`);
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        document.documentElement.style.setProperty('--role-accent', 'var(--accent-founder)');
    }, []);

    // Use persisted store state for instant render — no spinner for auth check
    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <>
            <Dashboard onLogout={() => { logout(); router.push('/login'); }} />
            <Toaster />
        </>
    );
}
