'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';

import { getInitials } from '@/lib/client-utils';
import {
  LayoutDashboard, Search, Building2, Users, Target, FileText,
  CreditCard, TrendingUp, MessageSquare, Shield, Settings,
  LogOut, ChevronLeft, Briefcase, Handshake, DollarSign,
  AlertTriangle, BarChart3, Wallet, Trophy
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
  counts?: {
    applications?: number;
    agreements?: number;
    messages?: number;
  };
}

// Role-based navigation configuration
const getNavigation = (role: string) => {
  const baseNav: Record<string, { 
    overview: any[]; 
    workspace: any[]; 
    finance: any[]; 
    communication: any[]; 
  }> = {
    founder: {
      overview: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'search', label: 'Discover', icon: Search },
      ],
      workspace: [
        { id: 'startups', label: 'My Startup', icon: Building2 },
        { id: 'milestones', label: 'Milestones', icon: Target },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
      ],
      finance: [
        { id: 'payments', label: 'Funding', icon: CreditCard },
      ],
      communication: [
        { id: 'messages', label: 'Messages', icon: MessageSquare, countKey: 'messages' },
        { id: 'alliances', label: 'Alliances', icon: Handshake },
      ],
    },
    talent: {
      overview: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'search', label: 'Discover', icon: Search },
      ],
      workspace: [
        { id: 'applications', label: 'My Applications', icon: Briefcase, countKey: 'applications' },
        { id: 'agreements', label: 'Agreements', icon: FileText, countKey: 'agreements' },
      ],
      finance: [],
      communication: [
        { id: 'messages', label: 'Messages', icon: MessageSquare, countKey: 'messages' },
        { id: 'alliances', label: 'Alliances', icon: Handshake },
      ],
    },
    investor: {
      overview: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'search', label: 'Discover', icon: Search },
      ],
      workspace: [
        { id: 'dealflow', label: 'Deal Flow', icon: DollarSign },
        { id: 'portfolio', label: 'Portfolio', icon: Building2 },
      ],
      finance: [
        { id: 'investments', label: 'Investments', icon: TrendingUp },
      ],
      communication: [
        { id: 'messages', label: 'Messages', icon: MessageSquare, countKey: 'messages' },
        { id: 'alliances', label: 'Alliances', icon: Handshake },
      ],
    },
    admin: {
      overview: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
      workspace: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'startups', label: 'Startups', icon: Building2 },
        { id: 'verifications', label: 'Verifications', icon: Shield },
        { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
      ],
      finance: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ],
      communication: [],
    },
  };

  return baseNav[role] || baseNav.founder;
};

interface NavSectionProps {
  title: string;
  items: any[];
  collapsed: boolean;
  activeTab: string;
  counts: any;
  onTabChange: (tab: string) => void;
}

const NavSection = ({ title, items, collapsed, activeTab, counts, onTabChange }: NavSectionProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-4">
      {collapsed ? (
        <div className="h-px bg-border/30 mx-2 my-3" />
      ) : (
        <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          {title}
        </div>
      )}
      <div className="space-y-0.5 px-2">
        {items.map((item) => {
          const isSelected = activeTab === item.id;
          const count = item.countKey ? counts[item.countKey as keyof typeof counts] : undefined;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              data-testid={`sidebar-${item.id}`}
              className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-3 transition-all duration-200 group ${
                isSelected
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
              )}
              <item.icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : ''}`} />
              {!collapsed && (
                <>
                  <span className="text-sm flex-1 text-left truncate">{item.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={`h-5 min-w-5 px-1.5 text-[10px] font-semibold ${
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-muted'
                      }`}
                    >
                      {count}
                    </Badge>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export function DashboardSidebar({ onLogout, onTabChange, activeTab, counts = {} }: SidebarProps) {
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const navigation = getNavigation(user.role);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <nav
        className={`fixed md:sticky top-0 h-screen shrink-0 transition-all duration-300 ease-out z-50 ${
          collapsed ? 'w-16' : 'w-56'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col bg-card/95 dark:bg-card/90 md:bg-card/50 md:dark:bg-card/30 backdrop-blur-xl border-r border-border/50`}
      >
      {/* Logo Section */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#2E8B57] to-[#0047AB] shadow-lg">
            <Logo size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold tracking-tight block">
                <span className="text-[#2E8B57]">Alloy</span>
                <span className="text-[#0047AB]">Sphere</span>
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {user.role} Portal
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        <NavSection title="Overview" items={navigation.overview} collapsed={collapsed} activeTab={activeTab} counts={counts} onTabChange={onTabChange} />
        <NavSection title="Workspace" items={navigation.workspace} collapsed={collapsed} activeTab={activeTab} counts={counts} onTabChange={onTabChange} />
        <NavSection title="Finance" items={navigation.finance} collapsed={collapsed} activeTab={activeTab} counts={counts} onTabChange={onTabChange} />
        <NavSection title="Communication" items={navigation.communication} collapsed={collapsed} activeTab={activeTab} counts={counts} onTabChange={onTabChange} />
      </div>

      {/* User Section */}
      <div className="border-t border-border/30 p-2">
        {/* Settings */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-3 w-full p-2 rounded-lg transition-all mb-1 ${
            activeTab === 'settings' 
              ? 'bg-primary/10 text-primary' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          data-testid="sidebar-settings"
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>

        {/* User Profile */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex items-center gap-3 w-full p-2 rounded-lg transition-all ${
            activeTab === 'profile' 
              ? 'bg-primary/10' 
              : 'hover:bg-muted/50'
          }`}
          data-testid="sidebar-profile"
        >
          <Avatar className="h-8 w-8 ring-2 ring-border">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <span className="text-sm font-medium block truncate">{user.name}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="capitalize">{user.role}</span>

              </span>
            </div>
          )}
        </button>

        {/* Collapse & Logout */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            data-testid="sidebar-collapse"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
          {!collapsed && (
            <button
              onClick={onLogout}
              className="h-8 px-3 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Sign Out"
              data-testid="sidebar-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}
