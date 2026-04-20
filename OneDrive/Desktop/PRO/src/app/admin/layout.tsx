'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import {
  Shield, LayoutDashboard, Users, Building2, ShieldCheck,
  CreditCard, ChevronLeft, ChevronRight, LogOut, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Startups', href: '/admin/startups', icon: Building2 },
  { label: 'Verification', href: '/admin/verification', icon: ShieldCheck },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, fetchUser, setLoading, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth check
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
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push(`/dashboard/${user?.role}`);
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex">
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col border-r border-white/5 bg-slate-950/95 backdrop-blur-xl transition-all duration-300',
            sidebarCollapsed ? 'w-[72px]' : 'w-64',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-white/5 shrink-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 overflow-hidden">
                <h1 className="text-sm font-bold tracking-tight truncate">AlloySphere</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Panel</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-500/15 text-blue-400 shadow-lg shadow-blue-500/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
                    sidebarCollapsed && 'justify-center px-2',
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn('h-4.5 w-4.5 shrink-0', isActive && 'text-blue-400')} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Collapse Toggle & User */}
          <div className="border-t border-white/5 p-3 space-y-2 shrink-0">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-slate-400 hover:text-red-400 text-xs justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                {!sidebarCollapsed && <span className="ml-2">Logout</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-white hidden lg:flex"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar (mobile) */}
          <header className="sticky top-0 z-30 h-14 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center px-4 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2 ml-3">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold">Admin Panel</span>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] border-blue-500/30 text-blue-400">Admin</Badge>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
