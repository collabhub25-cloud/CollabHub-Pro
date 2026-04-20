import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { LandingPageWrapper } from '@/components/landing/landing-page-wrapper';

/**
 * Home Page — Server Component
 * 
 * Performance: Reads the JWT cookie server-side to determine auth state.
 * - Authenticated users are instantly redirected to their dashboard (no client JS needed).
 * - Unauthenticated visitors get the landing page with zero unnecessary hydration.
 * 
 * Previously this was a 'use client' component that made an API call to /api/auth/me
 * on every page load, adding latency and requiring full React hydration before anything rendered.
 */
export default async function Home() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (accessToken) {
    try {
      const secret = process.env.JWT_SECRET || 'AlloySphere-dev-secret-change-in-production';
      const decoded = jwt.verify(accessToken, secret) as { userId: string; email: string; role: string };
      redirect(`/dashboard/${decoded.role}`);
    } catch {
      // Token expired or invalid — fall through to landing page
    }
  }

  return <LandingPageWrapper />;
}
