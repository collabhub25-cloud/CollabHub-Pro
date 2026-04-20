'use client';

import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/landing/landing-page';

/**
 * Thin client wrapper for LandingPage.
 * Only exists to provide router-based navigation callbacks.
 * The parent page.tsx is a server component that handles auth redirection.
 */
export function LandingPageWrapper() {
  const router = useRouter();

  return (
    <LandingPage
      onLogin={() => router.push('/login')}
      onRegister={() => router.push('/signup/founder')}
    />
  );
}
