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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="text-base font-semibold tracking-wide text-foreground">Collab·Hub</span>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6">
          <div className="max-w-5xl mx-auto w-full py-24">
            <h1 className="mb-3">Verified startup collaboration.</h1>
            <p className="text-muted-foreground max-w-lg mb-16" style={{ fontSize: '16px', lineHeight: '1.6' }}>
              Connect founders, investors, and talent through trust scores, legal agreements, and milestone-based payments.
            </p>

            <div className="grid gap-px md:grid-cols-3 border border-border rounded-md overflow-hidden">
              <Link href="/founders" className="group bg-card p-8 hover:bg-muted/30 transition-colors">
                <p className="text-sm text-muted-foreground mb-1">For Founders</p>
                <p className="font-medium mb-4">Build with verified talent</p>
                <span className="text-sm text-[#2B5FD9] group-hover:underline">Learn more →</span>
              </Link>
              <Link href="/investors" className="group bg-card p-8 hover:bg-muted/30 transition-colors border-l border-r border-border">
                <p className="text-sm text-muted-foreground mb-1">For Investors</p>
                <p className="font-medium mb-4">Verified deal flow</p>
                <span className="text-sm text-[#1FA463] group-hover:underline">Learn more →</span>
              </Link>
              <Link href="/talent" className="group bg-card p-8 hover:bg-muted/30 transition-colors">
                <p className="text-sm text-muted-foreground mb-1">For Talent</p>
                <p className="font-medium mb-4">Join trusted projects</p>
                <span className="text-sm text-[#6D33D6] group-hover:underline">Learn more →</span>
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-border py-5 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CollabHub
        </footer>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
