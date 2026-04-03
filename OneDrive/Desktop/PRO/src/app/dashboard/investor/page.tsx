'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from '@/components/dashboard/dashboard';

export default function InvestorDashboardPage() {
    const { isAuthenticated, user, isLoading, fetchUser, setLoading, logout } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        const check = async () => {
            try { await fetchUser(); } catch { /* not authenticated */ }
            setLoading(false);
        };
        check();
    }, [fetchUser, setLoading]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        } else if (!isLoading && isAuthenticated && user?.role !== 'investor') {
            router.push(`/dashboard/${user?.role}`);
        }
    }, [isLoading, isAuthenticated, user, router]);

    useEffect(() => {
        document.documentElement.style.setProperty('--role-accent', 'var(--accent-investor)');
    }, []);

    if (isLoading || !isAuthenticated || user?.role !== 'investor') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Dashboard onLogout={() => { logout(); router.push('/login'); }} />
            <Toaster />
        </ThemeProvider>
    );
}
