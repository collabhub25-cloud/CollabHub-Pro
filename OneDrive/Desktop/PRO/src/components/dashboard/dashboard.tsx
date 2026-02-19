'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuthStore, useUIStore } from '@/store';
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
  User, Handshake, Sparkles
} from 'lucide-react';
import { FounderDashboard } from './founder-dashboard';
import { TalentDashboard } from './talent-dashboard';
import { InvestorDashboard } from './investor-dashboard';
import { AdminDashboard } from './admin-dashboard';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { VerificationProgress } from '@/components/verification/verification-progress';
import { SearchPage } from '@/components/search/search-page';
import { PricingPage } from '@/components/pricing/pricing-page';
import { ProfilePage } from '@/components/profile/profile-page';
import { MessagingPage } from '@/components/messaging/messaging-page';
import { CreateStartupModal } from '@/components/startups/create-startup-modal';
import { CreateMilestoneModal } from '@/components/milestones/create-milestone-modal';
import { AlliancePage } from '@/components/alliances/alliance-page';
import { AccessDenied } from '@/components/common/access-denied';
import { PageSkeleton, ErrorBoundary } from '@/components/common/loading-error-handlers';
import { SubscriptionBadge } from './shared-components';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { getPlanDisplayName } from '@/lib/subscription/features';
import { toast } from 'sonner';

interface DashboardProps {
  onLogout: () => void;
}

const navigation = {
  founder: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'startups', label: 'My Startups', icon: Building2 },
    { id: 'applications', label: 'Applications', icon: Users },
    { id: 'milestones', label: 'Milestones', icon: CheckCircle2 },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'funding', label: 'Funding', icon: DollarSign },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'verification', label: 'Verification', icon: Shield },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  // Talent - No subscription menu item (free account)
  talent: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
    { id: 'applications', label: 'My Applications', icon: Users },
    { id: 'milestones', label: 'Active Tasks', icon: CheckCircle2 },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'search', label: 'Find Work', icon: Search },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'verification', label: 'Verification', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  // Investor - No subscription menu item (free account)
  investor: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'dealflow', label: 'Deal Flow', icon: DollarSign },
    { id: 'portfolio', label: 'Portfolio', icon: Building2 },
    { id: 'investments', label: 'Investments', icon: CreditCard },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'search', label: 'Discover', icon: Search },
    { id: 'alliances', label: 'Alliances', icon: Handshake },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'verification', label: 'Verification', icon: Shield },
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
  const { user, setUser, token } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setActiveTab, activeTab } = useUIStore();
  const [key, setKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for profile view from localStorage (safe client-side only)
  useEffect(() => {
    const viewProfile = safeLocalStorage.getItem(STORAGE_KEYS.VIEW_PROFILE);
    if (viewProfile) {
      setActiveTab('profile');
      safeLocalStorage.removeItem(STORAGE_KEYS.VIEW_PROFILE);
    }
  }, [setActiveTab]);

  // Refresh user data using Zustand token with proper error handling
  const refreshUser = useCallback(async () => {
    if (!token || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [token, isRefreshing, setUser]);

  if (!user) return null;

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
    // Handle new pages
    if (activeTab === 'search') {
      return <SearchPage />;
    }
    if (activeTab === 'verification') {
      return <VerificationProgress />;
    }
    if (activeTab === 'subscription') {
      return <PricingPage />;
    }
    if (activeTab === 'messages') {
      return <MessagingPage />;
    }
    if (activeTab === 'profile') {
      return <ProfilePage />;
    }
    if (activeTab === 'alliances') {
      return <AlliancePage />;
    }

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
    setActiveTab('profile');
  };

  const handleUpgradeClick = () => {
    setActiveTab('subscription');
  };

  // Only founders have subscription plans
  const userPlan = user.role === 'founder' ? (user.plan || 'free_founder') : 'free';

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && <span className="text-xl font-bold">CollabHub</span>}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              ))}
            </nav>
          </ScrollArea>

          {/* Subscription Upgrade CTA - ONLY FOR FOUNDERS */}
          {sidebarOpen && user.role === 'founder' && (userPlan === 'free' || userPlan === 'free_founder') && (
            <div className="mx-4 mb-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Upgrade Plan</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Unlock more features with a premium plan
              </p>
              <Button size="sm" className="w-full" onClick={handleUpgradeClick}>
                View Plans
              </Button>
            </div>
          )}

          {/* User Profile - Clickable */}
          <div className="p-4 border-t">
            <button
              onClick={handleProfileClick}
              className={`w-full flex items-center gap-3 rounded-lg transition-colors ${
                activeTab === 'profile' ? 'bg-muted' : 'hover:bg-muted'
              }`}
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className={`text-xs ${verificationBadge.color} text-white`}>
                      L{user.verificationLevel}
                    </Badge>
                    {/* Only show plan badge for founders */}
                    {user.role === 'founder' && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {getPlanDisplayName(userPlan, user.role)}
                      </Badge>
                    )}
                    {/* Show "Free" badge for non-founders */}
                    {user.role !== 'founder' && user.role !== 'admin' && (
                      <Badge variant="outline" className="text-xs">
                        Free
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </button>
            {/* Sign Out - Always visible, full width when expanded, icon only when collapsed */}
            <Button
              variant="ghost"
              size={sidebarOpen ? 'sm' : 'icon'}
              className={`w-full mt-3 text-muted-foreground hover:text-destructive ${!sidebarOpen ? 'p-2' : ''}`}
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen && <span className="ml-2">Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between h-full px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <h1 className="text-lg font-semibold capitalize hidden md:block">
                {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h1>
              
              {/* Quick Actions */}
              {user.role === 'founder' && (activeTab === 'startups' || activeTab === 'dashboard') && (
                <CreateStartupModal onSuccess={() => setKey(k => k + 1)} />
              )}
              {user.role === 'founder' && activeTab === 'milestones' && (
                <CreateMilestoneModal onSuccess={() => setKey(k => k + 1)} />
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Dropdown */}
              <NotificationDropdown />
              
              {/* Trust Score */}
              <button 
                onClick={handleProfileClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
              >
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{user.trustScore}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content - Wrapped with ErrorBoundary */}
        <main className="p-6" key={key}>
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
