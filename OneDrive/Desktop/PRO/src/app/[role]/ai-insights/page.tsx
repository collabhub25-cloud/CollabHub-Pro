'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from '@/components/dashboard/dashboard';

export default function AiInsightsRolePage({ params }: { params: { role: string } }) {
    const { isAuthenticated, user, isLoading, fetchUser, setLoading, logout } = useAuthStore();
    const { setActiveTab } = useUIStore();
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
        } else if (!isLoading && isAuthenticated && user?.role !== params.role) {
            router.push(`/dashboard/${user?.role}`);
        }
    }, [isLoading, isAuthenticated, user, router, params.role]);

    useEffect(() => {
        // Enforce the active tab as AI Insights when this route is hit
        if (isAuthenticated) {
            setActiveTab('ai-insights');
            
            // Set role accent colors for consistency with main dashboard
            const roleAccentMap: Record<string, string> = {
                founder: 'var(--accent-founder)',
                investor: 'var(--accent-investor)',
                talent: 'var(--accent-talent)',
            };
            document.documentElement.style.setProperty('--role-accent', roleAccentMap[params.role] || roleAccentMap.founder);
        }
    }, [isAuthenticated, setActiveTab, params.role]);

    if (isLoading || !isAuthenticated || user?.role !== params.role) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <Dashboard onLogout={() => { logout(); router.push('/login'); }} />
            <Toaster />
        </ThemeProvider>
    );
}
