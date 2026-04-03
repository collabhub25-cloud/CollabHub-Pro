'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/components/landing/landing-page';

export default function Home() {
  const { isAuthenticated, user, isLoading, fetchUser, setLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try { await fetchUser(); } catch { /* not authenticated */ }
      setLoading(false);
    };
    check();
  }, [fetchUser, setLoading]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.push(`/dashboard/${user.role}`);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LandingPage
        onLogin={() => router.push('/login')}
        onRegister={() => router.push('/signup/founder')}
      />
      <Toaster />
    </ThemeProvider>
  );
}
