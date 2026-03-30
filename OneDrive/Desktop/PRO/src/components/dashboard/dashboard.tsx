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
import { FounderDashboardNew } from './founder-dashboard-new';
import { TalentDashboardNew } from './talent-dashboard-new';
import { InvestorDashboardNew } from './investor-dashboard-new';
import { FounderDashboard } from './founder-dashboard';
import { TalentDashboard } from './talent-dashboard';
import { InvestorDashboard } from './investor-dashboard';
import { AdminDashboard } from './admin-dashboard';
import { DashboardSidebar } from './sidebar';
import { Logo } from '@/components/ui/logo';


import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { VerificationProgress } from '@/components/verification/verification-progress';
import { SearchPage } from '@/components/search/search-page';
import { ProfilePage } from '@/components/profile/profile-page';
import { MessagingPage } from '@/components/messaging/messaging-page';
import { SettingsPage } from '@/components/settings/settings-page';
import { CreateStartupModal } from '@/components/startups/create-startup-modal';
import { CreateMilestoneModal } from '@/components/milestones/create-milestone-modal';
import { AlliancePage } from '@/components/alliances/alliance-page';
import { AccessDenied } from '@/components/common/access-denied';
import { PageSkeleton, ErrorBoundary } from '@/components/common/loading-error-handlers';
import { AiInsightsPage } from '@/components/ai/ai-insights-page';
import { AchievementsPage } from '@/components/achievements/achievements-page';
import { ManageJobs } from '@/components/jobs/manage-jobs';
import { TalentJobsPage } from '@/components/jobs/talent-jobs-page';
import { PortfolioPage } from '@/components/investor/portfolio-page';
import { SubscriptionBadge } from './shared-components';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { getPlanDisplayName } from '@/lib/subscription/features';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface DashboardProps {
  onLogout: () => void;
}



export function Dashboard({ onLogout }: DashboardProps) {
  const { user, setUser } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setActiveTab, activeTab } = useUIStore();
  const [key, setKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | undefined>(undefined);
  const { theme, setTheme } = useTheme();
  
  const isDark = theme === 'dark';

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
    // Common tabs across all roles
    if (activeTab === 'search') return <SearchPage />;
    if (activeTab === 'ai-insights') return <AiInsightsPage />;
    if (activeTab === 'achievements') return <AchievementsPage />;
    if (activeTab === 'jobs') return <TalentJobsPage />;
    if (activeTab === 'portfolio') return <PortfolioPage />;
    if (activeTab === 'messages') return <MessagingPage />;
    if (activeTab === 'manage-jobs') return <ManageJobs />;
    if (activeTab === 'profile') return <ProfilePage profileId={viewProfileId} />;
    if (activeTab === 'alliances') return <AlliancePage />;
    if (activeTab === 'settings') return <SettingsPage />;

    // Role-specific content rendering
    switch (user.role) {
      case 'founder':
        // Founder-specific tabs
        if (activeTab === 'startups' || activeTab === 'applications' || 
            activeTab === 'milestones' || activeTab === 'pitch-requests' ||
            activeTab === 'payments') {
          return <FounderDashboard activeTab={activeTab === 'payments' ? 'funding' : activeTab} />;
        }
        return <FounderDashboardNew />;
        
      case 'talent':
        // Talent-specific tabs
        if (activeTab === 'applications' || activeTab === 'projects') {
          return <TalentDashboard activeTab={activeTab} />;
        }
        return <TalentDashboardNew />;
        
      case 'investor':
        // Investor-specific tabs
        if (activeTab === 'dealflow' || activeTab === 'portfolio' || 
            activeTab === 'investments') {
          return <InvestorDashboard activeTab={activeTab} />;
        }
        return <InvestorDashboardNew />;
        
      case 'admin':
        return <AdminDashboard activeTab={activeTab} />;
        
      default:
        return <AccessDenied reason="Invalid user role. Please contact support." />;
    }
  };

  const handleProfileClick = () => {
    safeLocalStorage.removeItem(STORAGE_KEYS.VIEW_PROFILE); // Fix it here instead of passing undefined
    setViewProfileId(undefined); // Reset to show own profile
    setActiveTab('profile');
  };

  return (
    <TooltipProvider>
      <div className={`flex min-h-screen w-full relative`}>
        <div className="flex w-full bg-transparent text-foreground min-h-screen relative z-10">

          {/* New Modern Sidebar */}
          <DashboardSidebar 
            onLogout={onLogout}
            onTabChange={setActiveTab}
            activeTab={activeTab}
            counts={{
              applications: 0, // These would be fetched from API
              agreements: 0,
              messages: 0,
            }}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/50 z-10 sticky top-0">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger menu */}
                <button
                  onClick={toggleSidebar}
                  className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Toggle menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                <h1 className="text-lg font-semibold text-foreground capitalize">
                  {user.role} Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  AlloySphere · {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-3">

                {/* Notifications */}
                <NotificationDropdown />

                {/* Avatar Top Right */}
                <button onClick={handleProfileClick} className="h-9 w-9 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name || "User"}
                      width={36}
                      height={36}
                      className="object-cover h-full w-full"
                    />
                  ) : (
                    <Avatar className="h-full w-full">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto p-4 md:p-6 bg-transparent" key={key}>
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
