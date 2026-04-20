'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from '@/components/dashboard/dashboard';

/**
 * Talent Dashboard Page
 * 
 * Auth is verified server-side by dashboard/layout.tsx.
 * ThemeProvider is already in root layout — removed duplicate.
 */
export default function TalentDashboardPage() {
    const { isAuthenticated, user, isLoading, fetchUser, logout } = useAuthStore();
    const router = useRouter();

    // Background revalidation of user data (non-blocking)
    useEffect(() => {
        fetchUser().catch(() => {});
    }, [fetchUser]);

    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.role !== 'talent') {
            router.push(`/dashboard/${user?.role}`);
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        document.documentElement.style.setProperty('--role-accent', 'var(--accent-talent)');
    }, []);

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
