'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from '@/components/landing/landing-page';
import { AuthModal } from '@/components/auth/auth-modal';
import { Dashboard } from '@/components/dashboard/dashboard';
import { safeLocalStorage, STORAGE_KEYS } from '@/lib/client-utils';

// Custom hook for hydration check without setState in effect
function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, setLoading, setUser, setToken, token, logout } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const hydrated = useHydrated();

  // Check for existing session on mount - use Zustand's persisted token
  useEffect(() => {
    if (!hydrated) return;
    
    const checkAuth = async () => {
      // Use token from Zustand store (already persisted)
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            // Token invalid, clear session immediately
            console.log('Token invalid, logging out...');
            logout();
            safeLocalStorage.removeItem(STORAGE_KEYS.TOKEN);
            return;
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
          safeLocalStorage.removeItem(STORAGE_KEYS.TOKEN);
          return;
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [hydrated, token, setUser, setLoading, logout]);

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
    // Also clear any legacy localStorage items
    safeLocalStorage.removeItem(STORAGE_KEYS.TOKEN);
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
