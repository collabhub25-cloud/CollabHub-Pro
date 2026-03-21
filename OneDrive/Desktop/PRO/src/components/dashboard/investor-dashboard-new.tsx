'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, DollarSign, Building2, TrendingUp, Handshake, ChevronRight,
  Loader2, Bell, PieChart, BarChart3, Eye, MessageSquare, Star, MapPin
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface InvestorDashboardData {
  portfolio: any[];
  dealflow: any[];
  alliances: any[];
  stats: {
    totalInvested: number;
    portfolioCount: number;
    dealflowCount: number;
    watchlistCount: number;
    alliancesCount: number;
    avgTicketSize: number;
  };
}

export function InvestorDashboardNew() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InvestorDashboardData | null>(null);
  const [dealflowFilter, setDealflowFilter] = useState('all');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [startupsRes, alliancesRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/alliances'),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const alliances = alliancesRes.ok ? await alliancesRes.json() : [];

      const startups = startupsData.startups || startupsData || [];
      const dealflow = Array.isArray(startups) ? startups.slice(0, 10) : [];

      setData({
        portfolio: [],
        dealflow,
        alliances: Array.isArray(alliances) ? alliances : alliances.alliances || [],
        stats: {
          totalInvested: 0,
          portfolioCount: 0,
          dealflowCount: dealflow.length,
          watchlistCount: 0,
          alliancesCount: Array.isArray(alliances) ? alliances.length : (alliances.alliances?.length || 0),
          avgTicketSize: 0,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalInvested: 0,
    portfolioCount: 0,
    dealflowCount: 0,
    watchlistCount: 0,
    alliancesCount: 0,
    avgTicketSize: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {getGreeting()}, {user?.name?.split(' ')[0]} 
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.dealflowCount > 0 ? (
              <span>{stats.dealflowCount} startup{stats.dealflowCount > 1 ? 's' : ''} in your deal flow</span>
            ) : (
              <span>Discover promising startups to invest in</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">

        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickActionCard
          icon={Search}
          label="Discover Startups"
          description="Find new opportunities"
          onClick={() => setActiveTab('search')}
        />
        <QuickActionCard
          icon={DollarSign}
          label="Deal Flow"
          description={`${stats.dealflowCount} startups`}
          onClick={() => setActiveTab('dealflow')}
        />
        <QuickActionCard
          icon={Building2}
          label="Portfolio"
          description={`${stats.portfolioCount} investments`}
          onClick={() => setActiveTab('portfolio')}
        />
        <QuickActionCard
          icon={Handshake}
          label="Alliances"
          description={`${stats.alliancesCount} connections`}
          onClick={() => setActiveTab('alliances')}
        />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          icon={TrendingUp}
          iconColor="text-green-500"
          label="Total Invested"
          value={formatCurrency(stats.totalInvested)}
          subtext={`Avg ticket: ${formatCurrency(stats.avgTicketSize)}`}
          onClick={() => setActiveTab('portfolio')}
        />
        <StatsCard
          icon={Building2}
          iconColor="text-blue-500"
          label="Portfolio Companies"
          value={stats.portfolioCount}
          subtext={`${stats.watchlistCount} in watchlist`}
          onClick={() => setActiveTab('portfolio')}
        />
        <StatsCard
          icon={DollarSign}
          iconColor="text-amber-500"
          label="Deal Flow"
          value={stats.dealflowCount}
          subtext="Active opportunities"
          onClick={() => setActiveTab('dealflow')}
        />
      </div>

      {/* Deal Flow & Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deal Flow */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Deal Flow</CardTitle>
                <Badge variant="secondary" className="text-xs">{stats.dealflowCount}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('dealflow')}>
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Tabs value={dealflowFilter} onValueChange={setDealflowFilter}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                <TabsTrigger value="new" className="text-xs h-6">New</TabsTrigger>
                <TabsTrigger value="watching" className="text-xs h-6">Watching</TabsTrigger>
                <TabsTrigger value="contacted" className="text-xs h-6">Contacted</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0">
            {data?.dealflow && data.dealflow.length > 0 ? (
              <div className="space-y-3">
                {data.dealflow.slice(0, 4).map((deal: any) => (
                  <DealItem key={deal._id} deal={deal} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No deals in pipeline</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('search')}>
                  Discover Startups
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment Summary */}
        <div className="space-y-4">
          {/* Portfolio Summary */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm">Portfolio Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Invested</span>
                  <span className="font-semibold">{formatCurrency(stats.totalInvested)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Companies</span>
                  <span className="font-semibold">{stats.portfolioCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Ticket</span>
                  <span className="font-semibold">{formatCurrency(stats.avgTicketSize)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.alliances && data.alliances.length > 0 ? (
                <div className="space-y-2">
                  {data.alliances.slice(0, 3).map((alliance: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 text-xs">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="truncate flex-1">Connected with {alliance.targetUser?.name || 'User'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, label, description, onClick }: { 
  icon: any; label: string; description: string; onClick: () => void;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatsCard({ icon: Icon, iconColor, label, value, subtext, onClick }: { 
  icon: any; iconColor: string; label: string; value: string | number; subtext: string; onClick: () => void;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-10 w-10 rounded-lg ${iconColor.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function DealItem({ deal }: { deal: any }) {
  const startup = deal.startupId || deal;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={startup.logo} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(startup.name || 'S')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{startup.name}</p>
          <Badge variant="secondary" className="text-[10px]">{startup.stage}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{startup.industry}</p>
        {startup.location && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {startup.location}
          </p>
        )}
      </div>
      <div className="text-right">

      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
