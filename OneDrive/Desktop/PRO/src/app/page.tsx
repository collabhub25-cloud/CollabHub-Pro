'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/components/landing/landing-page';
import { AuthModal } from '@/components/auth/auth-modal';
import { Dashboard } from '@/components/dashboard/dashboard';

// Custom hook for hydration check without setState in effect
function useHydrated() {
  return useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, setLoading, fetchUser, logout } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const hydrated = useHydrated();

  // Check for existing session on mount using cookie-based auth
  useEffect(() => {
    if (!hydrated) return;

    const checkAuth = async () => {
      try {
        await fetchUser();
      } catch (error) {
        console.error('Auth check failed:', error);
      }
      setLoading(false);
    };
    checkAuth();
  }, [hydrated, fetchUser, setLoading]);

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleRegister = () => {
    setAuthMode('register');
    setShowAuth(true);
  };

  const handleLogout = () => {
    logout();
  };

  // Show loading spinner during hydration or auth check
  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        {isAuthenticated ? (
          <Dashboard onLogout={handleLogout} />
        ) : (
          <LandingPage
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        )}
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          mode={authMode}
          onSwitchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
