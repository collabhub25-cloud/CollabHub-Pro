'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { AssistantPanel } from '@/components/ai/assistant-panel';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard,
  Settings, LogOut, Menu, ChevronLeft, Award, BarChart3,
  UserCheck, DollarSign, AlertTriangle, CheckCircle2,
  Search, Shield, CreditCard as SubscriptionIcon, MessageSquare,
  User, Handshake, Sparkles, ShieldCheck, ChevronDown,
  ChevronsRight, Bell, HelpCircle
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from "next/image";
import KycDashboard from '@/components/kyc/kyc-dashboard';
import { FounderDashboard } from './founder-dashboard';
import { TalentDashboard } from './talent-dashboard';
import { InvestorDashboard } from './investor-dashboard';
import { AdminDashboard } from './admin-dashboard';
import AgreementsDashboardWithBoundary from '@/components/agreements/agreements-dashboard';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { VerificationProgress } from '@/components/verification/verification-progress';
import { SearchPage } from '@/components/search/search-page';
import { PricingPage } from '@/components/pricing/pricing-page';
import { ProfilePage } from '@/components/profile/profile-page';
import { MessagingPage } from '@/components/messaging/messaging-page';
import { SettingsPage } from '@/components/settings/settings-page';
import { CreateStartupModal } from '@/components/startups/create-startup-modal';
import { CreateMilestoneModal } from '@/components/milestones/create-milestone-modal';
import { AlliancePage } from '@/components/alliances/alliance-page';
import { AccessDenied } from '@/components/common/access-denied';
import { PageSkeleton, ErrorBoundary } from '@/components/common/loading-error-handlers';
import { SubscriptionBadge } from './shared-components';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { getPlanDisplayName } from '@/lib/subscription/features';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface DashboardProps {
  onLogout: () => void;
}

const navigation = {
  founder: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'startups', label: 'My Startups', icon: Building2 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  talent: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Discover', icon: Search },
    { id: 'applications', label: 'Applications', icon: Users },
    { id: 'projects', label: 'Projects', icon: Building2 },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  investor: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dealflow', label: 'Deal Flow', icon: DollarSign },
    { id: 'portfolio', label: 'Portfolio', icon: Building2 },
    { id: 'search', label: 'Discover', icon: Search },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'startups', label: 'Startups', icon: Building2 },
    { id: 'verifications', label: 'Verifications', icon: Shield },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
};

export function Dashboard({ onLogout }: DashboardProps) {
  const { user, setUser } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setActiveTab, activeTab } = useUIStore();
  const [key, setKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | undefined>(undefined);

  // Check for profile view from localStorage (safe client-side only)
  useEffect(() => {
    const viewProfile = safeLocalStorage.getItem(STORAGE_KEYS.VIEW_PROFILE);
    if (viewProfile) {
      setViewProfileId(viewProfile);
      setActiveTab('profile');
      safeLocalStorage.removeItem(STORAGE_KEYS.VIEW_PROFILE);
    }
  }, [setActiveTab]);

  // Also listen for VIEW_PROFILE changes when already on profile tab
  useEffect(() => {
    const handleViewProfile = () => {
      const viewProfile = safeLocalStorage.getItem(STORAGE_KEYS.VIEW_PROFILE);
      if (viewProfile) {
        setViewProfileId(viewProfile);
        setActiveTab('profile');
        safeLocalStorage.removeItem(STORAGE_KEYS.VIEW_PROFILE);
      }
    };
    window.addEventListener('viewProfile', handleViewProfile);
    return () => window.removeEventListener('viewProfile', handleViewProfile);
  }, [setActiveTab]);

  // Refresh user data using Zustand token with proper error handling
  const refreshUser = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else if (response.status === 401) {
        // Session expired - handled by auth state
        console.warn('Session may have expired');
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, setUser]);

  if (!user) return null;

  // Inject role accent CSS variable
  const roleAccentMap: Record<string, string> = {
    founder: 'var(--accent-founder)',
    investor: 'var(--accent-investor)',
    talent: 'var(--accent-talent)',
  };
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--role-accent', roleAccentMap[user.role] || roleAccentMap.founder);
  }

  const navItems = navigation[user.role] || navigation.founder;

  const getVerificationBadge = (level: number) => {
    const badges = [
      { color: 'bg-gray-500', label: 'Unverified' },
      { color: 'bg-blue-500', label: 'Basic' },
      { color: 'bg-green-500', label: 'Verified' },
      { color: 'bg-purple-500', label: 'Trusted' },
      { color: 'bg-yellow-500', label: 'Expert' },
    ];
    return badges[level] || badges[0];
  };

  const verificationBadge = getVerificationBadge(user.verificationLevel);

  const renderContent = () => {
    if (activeTab === 'search') return <SearchPage />;
    if (activeTab === 'messages') return <MessagingPage />;
    if (activeTab === 'profile') return <ProfilePage profileId={viewProfileId} />;
    if (activeTab === 'alliances') return <AlliancePage />;
    if (activeTab === 'settings') return <SettingsPage />;
    if (activeTab === 'subscription') return <PricingPage />;

    // Handle role-specific dashboards
    // SECURITY FIX: Return AccessDenied for unknown roles instead of defaulting to Founder
    switch (user.role) {
      case 'founder':
        return <FounderDashboard activeTab={activeTab} />;
      case 'talent':
        return <TalentDashboard activeTab={activeTab} />;
      case 'investor':
        return <InvestorDashboard activeTab={activeTab} />;
      case 'admin':
        return <AdminDashboard activeTab={activeTab} />;
      default:
        return <AccessDenied reason="Invalid user role. Please contact support." />;
    }
  };

  const handleProfileClick = () => {
    setViewProfileId(undefined); // Reset to show own profile
    setActiveTab('profile');
  };

  const handleUpgradeClick = () => {
    setActiveTab('subscription');
  };

  // Only founders have subscription plans
  const userPlan = user.role === 'founder' ? (user.plan || 'free_founder') : 'free';

  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <TooltipProvider>
      <div className={`flex min-h-screen w-full`}>
        <div className="flex w-full bg-transparent text-foreground min-h-screen">

          {/* Sidebar — 3D Glass Design */}
          <nav
            className={`sticky top-0 h-screen shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'w-64' : 'w-16'
              } flex flex-col relative overflow-hidden`}
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(250,250,250,0.96) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '4px 0 24px -4px rgba(0,0,0,0.05)',
            }}
          >
            {/* Gradient accent strip */}
            <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-zinc-900 via-zinc-500 to-transparent opacity-60" />

            {/* Title Section */}
            <div className="mb-6 border-b border-border/50 pb-4 pl-1">
              <div className="flex cursor-pointer items-center justify-between rounded-xl p-2 transition-all duration-300 hover:bg-black/[0.03] group">
                <div className="flex items-center gap-3">
                  {/* Logo — floating animation */}
                  <div
                    className="grid size-10 shrink-0 place-content-center rounded-xl bg-primary shadow-lg transition-transform duration-500 group-hover:scale-105"
                    style={{ animation: 'sidebar-logo-float 4s ease-in-out infinite' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Abstract Sphere Intersection Logo */}
                      <circle cx="16" cy="12" r="6" fill="white" opacity="0.9" />
                      <circle cx="12" cy="20" r="6" fill="white" opacity="0.7" />
                      <circle cx="20" cy="20" r="6" fill="white" opacity="0.5" />
                      <path d="M12 20a6 6 0 018 0" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                    </svg>
                  </div>
                  {sidebarOpen && (
                    <div className={`transition-all duration-300 whitespace-nowrap ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="block text-sm font-bold text-sidebar-foreground tracking-tight">
                            AlloySphere
                          </span>
                          <span className="block text-xs text-muted-foreground capitalize">
                            {user.role} Portal
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {sidebarOpen && (
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:rotate-180" />
                )}
              </div>
            </div>

            {/* Navigation Options — 3D hover */}
            <div className="space-y-1 mb-8 flex-1 overflow-y-auto custom-scrollbar pr-1 pl-1" style={{ perspective: '800px' }}>
              {navItems.map((item, index) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`sidebar-nav-item relative flex h-11 w-full items-center rounded-xl transition-all duration-300 ${isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div className="grid h-full w-12 place-content-center shrink-0">
                      <item.icon className={`h-4 w-4 transition-transform duration-300 ${isSelected ? '' : 'group-hover:scale-110'}`} />
                    </div>
                    {sidebarOpen && (
                      <span className={`text-sm font-medium transition-all duration-200 whitespace-nowrap ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            {sidebarOpen && (
              <div className="border-t border-border/50 pt-4 pb-12 space-y-1 pl-1">
                {user.role === 'founder' && (userPlan === 'free' || userPlan === 'free_founder') && (
                  <div className="mb-2 p-3 rounded-xl border border-border/50 bg-gradient-to-br from-zinc-50 to-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Upgrade plan</span>
                    </div>
                    <Button size="sm" variant="default" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg" onClick={handleUpgradeClick}>
                      View plans
                    </Button>
                  </div>
                )}

                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Account
                </div>

                <button
                  onClick={handleProfileClick}
                  className={`sidebar-nav-item relative flex h-11 w-full items-center rounded-xl transition-all duration-300 ${activeTab === 'profile'
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <div className="grid h-full w-12 place-content-center shrink-0">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium block truncate">{user.name}</span>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="sidebar-nav-item relative flex h-11 w-full items-center rounded-xl transition-all duration-300 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                >
                  <div className="grid h-full w-12 place-content-center shrink-0">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            )}

            {!sidebarOpen && (
              <div className="pb-12 space-y-1">
                <button onClick={handleProfileClick} title="Profile" className="sidebar-nav-item relative flex h-11 w-full items-center justify-center rounded-xl transition-all duration-300 text-muted-foreground hover:text-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <button onClick={onLogout} title="Sign Out" className="sidebar-nav-item relative flex h-11 w-full items-center justify-center rounded-xl transition-all duration-300 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Toggle Close */}
            <button
              onClick={toggleSidebar}
              className="absolute bottom-0 left-0 right-0 border-t border-border/50 transition-all duration-300 hover:bg-black/[0.03] z-10"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center p-3">
                <div className="grid size-10 place-content-center shrink-0">
                  <ChevronsRight
                    className={`h-4 w-4 transition-transform duration-500 text-muted-foreground ${sidebarOpen ? "rotate-180" : ""
                      }`}
                  />
                </div>
                {sidebarOpen && (
                  <span className="text-sm font-medium text-muted-foreground transition-opacity duration-200 opacity-100">
                    Collapse Sidebar
                  </span>
                )}
              </div>
            </button>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border z-10 sticky top-0">
              <div>
                <h1 className="text-2xl font-bold text-foreground hidden md:block">
                  {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {/* Trust Score */}
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors border border-primary/20 box-border"
                >
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{user.trustScore} points</span>
                </button>

                {/* Notifications */}
                <div className="relative">
                  <NotificationDropdown />
                </div>

                {/* Theme toggle removed — light mode only */}

                {/* Avatar Top Right */}
                <button onClick={handleProfileClick} className="h-10 w-10 rounded-lg overflow-hidden border border-border shadow-sm ml-2 relative">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name || "User"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarFallback className="bg-primary/10 text-primary rounded-none h-full w-full">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto p-6 bg-transparent" key={key}>
              <ErrorBoundary>
                <div className="max-w-7xl mx-auto">
                  {renderContent()}
                </div>
              </ErrorBoundary>
            </main>
          </div>

          <AssistantPanel />
        </div>
      </div>
    </TooltipProvider>
  );
}
