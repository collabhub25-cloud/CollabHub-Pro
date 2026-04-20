import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

/**
 * Dashboard Layout — Server Component
 * 
 * Performs server-side auth verification by reading the JWT cookie directly.
 * This eliminates the redundant fetchUser() API call that each dashboard page
 * was making via useEffect, removing a network waterfall on every navigation.
 * 
 * The middleware already validates JWT and enforces role-based access,
 * so this is a defense-in-depth check that also ensures fast redirects.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/login');
  }

  try {
    const secret = process.env.JWT_SECRET || 'AlloySphere-dev-secret-change-in-production';
    jwt.verify(accessToken, secret);
  } catch {
    // Token expired or invalid — redirect to login
    redirect('/login');
  }

  return <>{children}</>;
}
