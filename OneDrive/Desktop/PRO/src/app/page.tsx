'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F2ED' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D8D2C8] border-t-[#B05A4F]" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col" style={{ background: '#F4F2ED', color: '#2A2623' }}>
        <header className="border-b" style={{ borderColor: '#D8D2C8' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="text-base font-medium" style={{ letterSpacing: '0.3px' }}>Collab·Hub</span>
            <Link href="/login" className="text-sm hover:underline" style={{ color: '#6C635C' }}>
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6">
          <div className="max-w-5xl mx-auto w-full" style={{ paddingTop: '96px', paddingBottom: '80px' }}>
            <h1 className="mb-4">Verified startup<br />collaboration.</h1>
            <p className="max-w-md mb-20" style={{ color: '#6C635C', fontSize: '16px', lineHeight: '1.7' }}>
              A platform for founders, investors, and talent to work together through trust scores, legal agreements, and milestone payments.
            </p>

            <div className="grid md:grid-cols-3" style={{ gap: '1px', background: '#D8D2C8', borderRadius: '4px', overflow: 'hidden' }}>
              <Link href="/founders" className="group p-8 transition-colors" style={{ background: '#FBF9F6' }}>
                <p className="text-sm mb-1" style={{ color: '#6C635C' }}>Founders</p>
                <p className="font-medium mb-5">Build with verified talent</p>
                <span className="text-sm" style={{ color: '#B05A4F' }}>Learn more →</span>
              </Link>
              <Link href="/investors" className="group p-8 transition-colors" style={{ background: '#FBF9F6' }}>
                <p className="text-sm mb-1" style={{ color: '#6C635C' }}>Investors</p>
                <p className="font-medium mb-5">Verified deal flow</p>
                <span className="text-sm" style={{ color: '#2E4057' }}>Learn more →</span>
              </Link>
              <Link href="/talent" className="group p-8 transition-colors" style={{ background: '#FBF9F6' }}>
                <p className="text-sm mb-1" style={{ color: '#6C635C' }}>Talent</p>
                <p className="font-medium mb-5">Join trusted projects</p>
                <span className="text-sm" style={{ color: '#8A6C8F' }}>Learn more →</span>
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t py-5 text-center text-sm" style={{ borderColor: '#D8D2C8', color: '#6C635C' }}>
          © {new Date().getFullYear()} CollabHub
        </footer>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
