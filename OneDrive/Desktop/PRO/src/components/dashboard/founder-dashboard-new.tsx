'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  TrendingUp, Users, Bell, Search, Sparkles, UserPlus,
  ArrowRight, Loader2, Landmark, Target, CheckCircle2,
  Clock, Activity, Zap
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface DashboardData {
  startup: any;
  applications: any[];
  activities: any[];
  talentRecommendations: any[];
  investorRecommendations: any[];
  fundingRounds: any[];
  stats: {
    fundingRaised: number;
    fundingTarget: number;
    pendingApplications: number;
    totalExpenditure: number;
  };
}

export function FounderDashboardNew() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [startupsRes, applicationsRes, searchTalentRes, searchInvestorsRes, fundingRes, notificationsRes, milestonesRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/applications/received'),
        apiFetch('/api/users?role=talent&limit=5'),
        apiFetch('/api/users?role=investor&limit=5'),
        apiFetch('/api/funding/create-round'),
        apiFetch('/api/notifications?limit=10'),
        apiFetch('/api/milestones'),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const applications = applicationsRes.ok ? await applicationsRes.json() : [];
      const talentData = searchTalentRes.ok ? await searchTalentRes.json() : [];
      const investorData = searchInvestorsRes.ok ? await searchInvestorsRes.json() : [];
      const fundingData = fundingRes.ok ? await fundingRes.json() : { rounds: [] };
      const notifData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };
      const milestonesData = milestonesRes.ok ? await milestonesRes.json() : { milestones: [] };

      const startups = startupsData.startups || startupsData || [];
      const startup = Array.isArray(startups) ? startups[0] : startups;
      const appList = Array.isArray(applications) ? applications : applications.applications || [];
      const talentList = Array.isArray(talentData) ? talentData : talentData.users || [];
      const investorList = Array.isArray(investorData) ? investorData : investorData.users || [];
      const rounds = fundingData.rounds || [];
      const notifications = notifData.notifications || [];
      const milestonesList = milestonesData.milestones || [];

      const pendingApps = appList.filter((a: any) => a.status === 'pending');

      // Build real activity feed from notifications
      const realActivities = notifications.slice(0, 6).map((notif: any) => {
        let icon = Bell;
        let color = 'text-blue-500';
        let bg = 'bg-blue-500/10';
        if (notif.type?.includes('application')) { icon = UserPlus; color = 'text-blue-500'; bg = 'bg-blue-500/10'; }
        else if (notif.type?.includes('milestone')) { icon = Target; color = 'text-emerald-500'; bg = 'bg-emerald-500/10'; }
        else if (notif.type?.includes('funding') || notif.type?.includes('invest')) { icon = Landmark; color = 'text-yellow-600'; bg = 'bg-yellow-500/10'; }
        else if (notif.type?.includes('alliance')) { icon = Users; color = 'text-purple-500'; bg = 'bg-purple-500/10'; }
        return {
          id: notif._id,
          type: notif.type,
          title: notif.title || 'Notification',
          description: notif.message || '',
          date: notif.createdAt,
          icon,
          color,
          bg,
        };
      });

      // Calculate total funding raised from real rounds
      const totalRaised = rounds.reduce((sum: number, r: any) => sum + (r.raisedAmount || 0), 0);
      const totalTarget = rounds.reduce((sum: number, r: any) => sum + (r.targetAmount || 0), 0);
      // Calculate total milestone expenditure (completed milestones)
      const totalExpenditure = milestonesList
        .filter((m: any) => m.status === 'completed')
        .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

      setData({
        startup,
        applications: appList,
        activities: realActivities,
        talentRecommendations: talentList,
        investorRecommendations: investorList,
        fundingRounds: rounds,
        stats: {
          fundingRaised: totalRaised,
          fundingTarget: totalTarget || 0,
          pendingApplications: pendingApps.length,
          totalExpenditure,
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative flex items-center justify-center">
          <div className="absolute animate-ping h-12 w-12 rounded-full bg-primary/20"></div>
          <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  const fundingProgress = data?.stats.fundingTarget 
    ? Math.min(Math.round((data.stats.fundingRaised / data.stats.fundingTarget) * 100), 100) 
    : 0;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header with Greeting & Live Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {getGreeting()}, {user?.name?.split(' ')[0]} 
            <span className="text-3xl origin-bottom-right hover:animate-wave inline-block cursor-default">👋</span>
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Your AI-optimized command center is synchronized and up to date.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Main Focus) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Funding Overview (Hero Card) */}
          <Card className="overflow-hidden relative border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/20 pb-2">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            
            <CardContent className="p-6 md:p-8 relative z-10">
              <div className="flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Total Funding</h2>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {data?.fundingRounds?.length || 0} Round{(data?.fundingRounds?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                        {formatCurrency(data?.stats.fundingRaised || 0)}
                      </span>
                      {data?.stats.fundingTarget ? (
                        <span className="text-lg text-muted-foreground font-medium">
                          / {formatCurrency(data.stats.fundingTarget)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Expenditure */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-muted-foreground">Raised: <span className="font-semibold text-foreground">{formatCurrency(data?.stats.fundingRaised || 0)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500"></div>
                      <span className="text-muted-foreground">Spent: <span className="font-semibold text-foreground">{formatCurrency(data?.stats.totalExpenditure || 0)}</span></span>
                    </div>
                  </div>

                  {/* Investors who funded */}
                  {data?.fundingRounds && data.fundingRounds.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Investors</p>
                      <div className="flex flex-wrap gap-2">
                        {data.fundingRounds.flatMap((r: any) => r.investors || []).slice(0, 5).map((inv: any, i: number) => (
                          <div key={inv.investorId?._id || i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 border border-border/40">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={inv.investorId?.avatar} />
                              <AvatarFallback className="text-[8px] bg-primary/10">{getInitials(inv.investorId?.name || 'I')}</AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium">{inv.investorId?.name || 'Investor'}</span>
                          </div>
                        ))}
                        {data.fundingRounds.flatMap((r: any) => r.investors || []).length === 0 && (
                          <span className="text-xs text-muted-foreground italic">No investors yet</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {data?.stats.fundingTarget ? (
                  <div className="w-full md:w-40 self-center">
                    <div className="relative aspect-square flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="stroke-muted/30" strokeWidth="8" fill="none" />
                        <circle cx="50" cy="50" r="40" className="stroke-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000 ease-out" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * fundingProgress) / 100} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{fundingProgress}%</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Target</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full md:w-40 self-center flex flex-col items-center justify-center text-center p-4">
                    <Landmark className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Create a funding round to track progress</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Grid: Recent Apps & Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Recent Applications */}
            <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                    onClick={() => setActiveTab('applications')}
                  >
                    View All
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {data?.applications && data.applications.length > 0 ? (
                  <div className="space-y-4">
                    {data.applications.slice(0, 4).map((app: any, idx) => (
                      <div key={app._id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                            <AvatarImage src={app.talentId?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-foreground font-semibold">
                              {getInitials(app.talentId?.name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm leading-none mb-1">{app.talentId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="truncate max-w-[120px]">{app.roleTitle || 'Role'}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(app.createdAt), { addSuffix: false })}</span>
                            </p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Search className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No pending applications</p>
                    <p className="text-xs text-muted-foreground mt-1">Your open roles are visible to the network.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <Activity className="h-4 w-4 text-orange-500" />
                    </div>
                    <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-6 relative">
                {data?.activities && data.activities.length > 0 ? (
                  <>
                    <div className="absolute left-[35px] top-4 bottom-4 w-px bg-border/50"></div>
                    <div className="space-y-6 relative">
                      {data.activities.slice(0, 4).map((activity: any) => {
                        const ActIcon = activity.icon;
                        return (
                          <div key={activity.id} className="flex gap-4 relative">
                            <div className={`mt-0.5 relative z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-sm shrink-0 border border-background ring-4 ring-background ${activity.bg}`}>
                              <ActIcon className={`h-3.5 w-3.5 ${activity.color}`} />
                            </div>
                            <div className="flex flex-col">
                              <p className="text-sm font-semibold">{activity.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activity.description}</p>
                              <p className="text-[10px] font-medium text-muted-foreground/70 mt-1 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Your activity will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Right Column (AI Insights) */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl p-px shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
            <div className="bg-card/90 backdrop-blur-2xl rounded-[15px] h-full p-5 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center p-[2px]">
                  <div className="h-full w-full bg-background rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">AI Syndicate Engine</h3>
                  <p className="text-xs text-muted-foreground">Optimal matches found</p>
                </div>
              </div>
              <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
          </div>

          {/* AI Talent Recommendations */}
          <Card className="bg-background/60 backdrop-blur-xl border-border/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                  <UserPlus className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Suggested Talent</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {data?.talentRecommendations && data.talentRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {data.talentRecommendations.map((talent: any) => (
                    <div key={talent._id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors border border-border/30 cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarImage src={talent.avatar} />
                            <AvatarFallback className="text-xs bg-primary/5">{getInitials(talent.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{talent.name}</p>
                            <p className="text-[10px] text-muted-foreground">{talent.role || 'Talent'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {talent.skills?.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No talent on the platform yet</p>
                </div>
              )}
              <Button variant="ghost" className="w-full mt-3 text-xs text-primary hover:text-primary hover:bg-primary/5">
                View all pipeline matches
              </Button>
            </CardContent>
          </Card>

          {/* AI Investor Profiles */}
          <Card className="bg-background/60 backdrop-blur-xl border-border/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <CardHeader className="pb-2 pt-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  <Target className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-bold uppercase tracking-wide">Target Investors</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {data?.investorRecommendations && data.investorRecommendations.length > 0 ? (
                <div className="space-y-4">
                  {data.investorRecommendations.map((investor: any) => (
                    <div key={investor._id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors border border-border/30 cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarImage src={investor.avatar} />
                            <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600">{getInitials(investor.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold leading-tight">{investor.name}</p>
                            <p className="text-[10px] text-muted-foreground">{investor.role || 'Investor'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {investor.sectors?.slice(0, 2).map((sector: string) => (
                          <span key={sector} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                            {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No investors on the platform yet</p>
                </div>
              )}
              <Button variant="ghost" className="w-full mt-3 text-xs text-primary hover:text-primary hover:bg-primary/5">
                Explore capital network
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Helpers
function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
