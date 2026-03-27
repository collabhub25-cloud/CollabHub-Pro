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
import { formatCurrencyShort, QuickActionCard, StatsCard } from '@/components/dashboard/shared-components';
import { AIMatchingPanel } from '@/components/ai/ai-matching-panel';

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
      
      const [startupsRes, alliancesRes, investmentsRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/alliances'),
        user?._id ? apiFetch(`/api/investments?userId=${user._id}`) : Promise.resolve(null),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const alliances = alliancesRes.ok ? await alliancesRes.json() : [];
      const investmentsData = investmentsRes && investmentsRes.ok ? await investmentsRes.json() : null;

      const startups = startupsData.startups || startupsData || [];
      const dealflow = Array.isArray(startups) ? startups.slice(0, 10) : [];
      const allianceList = Array.isArray(alliances) ? alliances : alliances.alliances || [];

      // Extract real portfolio data from investments API
      const portfolio = investmentsData?.portfolio || [];
      const totalInvested = investmentsData?.totalInvested || 0;
      const portfolioCount = portfolio.length;
      const avgTicketSize = portfolioCount > 0 ? Math.round(totalInvested / portfolioCount) : 0;

      setData({
        portfolio,
        dealflow,
        alliances: allianceList,
        stats: {
          totalInvested,
          portfolioCount,
          dealflowCount: dealflow.length,
          watchlistCount: 0,
          alliancesCount: allianceList.length,
          avgTicketSize,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

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
          value={formatCurrencyShort(stats.totalInvested)}
          subtext={`Avg ticket: ${formatCurrencyShort(stats.avgTicketSize)}`}
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

      {/* AI-Powered Deal Flow Matches */}
      <AIMatchingPanel type="investor-startup" />

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
            {(() => {
              const filteredDeals = data?.dealflow?.filter((deal: any) => {
                if (dealflowFilter === 'all') return true;
                if (dealflowFilter === 'new') {
                  const created = new Date(deal.createdAt);
                  const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
                  return daysSince <= 7;
                }
                if (dealflowFilter === 'watching') return data.alliances?.some((a: any) => a.targetId === deal._id || a.targetUser?._id === deal.founderId);
                return true;
              }) || [];
              return filteredDeals.length > 0 ? (
              <div className="space-y-3">
                {filteredDeals.slice(0, 4).map((deal: any) => (
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
            );
            })()}
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
                  <span className="font-semibold">{formatCurrencyShort(stats.totalInvested)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Companies</span>
                  <span className="font-semibold">{stats.portfolioCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Ticket</span>
                  <span className="font-semibold">{formatCurrencyShort(stats.avgTicketSize)}</span>
                </div>
              </div>
              {data?.portfolio && data.portfolio.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  {data.portfolio.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.startup?.logo} />
                        <AvatarFallback className="text-[8px] bg-primary/10">{getInitials(item.startup?.name || 'S')}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{item.startup?.name || 'Startup'}</span>
                      <span className="text-muted-foreground">{formatCurrencyShort(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
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
              {(() => {
                const activities: { label: string; color: string }[] = [];
                if (data?.portfolio) {
                  data.portfolio.slice(0, 2).forEach((item: any) => {
                    activities.push({ label: `Invested in ${item.startup?.name || 'startup'}`, color: 'bg-green-500' });
                  });
                }
                if (data?.alliances) {
                  data.alliances.slice(0, 2).forEach((alliance: any) => {
                    activities.push({ label: `Connected with ${alliance.targetUser?.name || 'User'}`, color: 'bg-blue-500' });
                  });
                }
                return activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.slice(0, 4).map((act, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 text-xs">
                      <span className={`h-2 w-2 rounded-full ${act.color}`} />
                      <span className="truncate flex-1">{act.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
    </div>
  );
}
