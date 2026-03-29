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
import { formatCurrencyShort } from '@/components/dashboard/shared-components';

interface DashboardData {
  startup: any;
  applications: any[];
  activities: any[];
  talentRecommendations: any[];
  investorRecommendations: any[];
  fundingRounds: any[];
  pitches: any[];
  accessRequests: any[];
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
      
      const [startupsRes, searchTalentRes, searchInvestorsRes, notificationsRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/search/talents?limit=5'),
        apiFetch('/api/search/investors?limit=5'),
        apiFetch('/api/notifications?limit=10'),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const talentData = searchTalentRes.ok ? await searchTalentRes.json() : [];
      const investorData = searchInvestorsRes.ok ? await searchInvestorsRes.json() : [];
      const notifData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };

      const startups = startupsData.startups || startupsData || [];
      const startup = Array.isArray(startups) ? startups[0] : startups;
      const talentList = Array.isArray(talentData) ? talentData : talentData.talents || [];
      const investorList = Array.isArray(investorData) ? investorData : investorData.investors || [];
      const notifications = notifData.notifications || [];

      let appList: any[] = [];
      let rounds: any[] = [];
      let milestonesList: any[] = [];
      let pitchesList: any[] = [];
      let accessRequestsList: any[] = [];

      if (startup?._id) {
        const [applicationsRes, fundingRes, milestonesRes, pitchesRes, accessRes] = await Promise.all([
          apiFetch(`/api/applications/received?startupId=${startup._id}`),
          apiFetch(`/api/funding/create-round?startupId=${startup._id}`),
          apiFetch(`/api/milestones?startupId=${startup._id}`),
          apiFetch(`/api/pitches?startupId=${startup._id}`),
          apiFetch(`/api/funding/request-access?startupId=${startup._id}&status=pending`)
        ]);

        const applications = applicationsRes.ok ? await applicationsRes.json() : [];
        const fundingData = fundingRes.ok ? await fundingRes.json() : { rounds: [] };
        const milestonesData = milestonesRes.ok ? await milestonesRes.json() : { milestones: [] };
        const pitchesData = pitchesRes.ok ? await pitchesRes.json() : { pitches: [] };
        const accessData = accessRes.ok ? await accessRes.json() : { requests: [] };

        appList = Array.isArray(applications) ? applications : applications.applications || [];
        rounds = fundingData.rounds || [];
        milestonesList = milestonesData.milestones || [];
        pitchesList = pitchesData.pitches || [];
        accessRequestsList = accessData.requests || [];
      }

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
        pitches: pitchesList,
        accessRequests: accessRequestsList,
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

  const handleLogInvestment = async (pitch: any) => {
    try {
      const res = await apiFetch('/api/investments', {
        method: 'POST',
        body: JSON.stringify({
          startupId: pitch.startupId,
          investorId: pitch.investorId._id,
          amountInvested: pitch.amountRequested,
          equityPercentage: pitch.equityOffered,
          pitchId: pitch._id
        })
      });
      if (res.ok) {
        toast.success('Investment logged and investor added to team successfully!');
        fetchDashboardData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to log investment');
      }
    } catch (err) {
      toast.error('Failed to log investment');
    }
  };

  const handleAccessRequestRespond = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await apiFetch('/api/funding/request-access/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId, status })
      });
      if (res.ok) {
        toast.success(`Access request ${status} successfully.`);
        fetchDashboardData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || `Failed to ${status} request`);
      }
    } catch {
      toast.error('An error occurred while responding to request');
    }
  };

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
        <div className="lg:col-span-12 space-y-6">
          
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
                        {formatCurrencyShort(data?.stats.fundingRaised || 0)}
                      </span>
                      {data?.stats.fundingTarget ? (
                        <span className="text-lg text-muted-foreground font-medium">
                          / {formatCurrencyShort(data.stats.fundingTarget)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Expenditure */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-muted-foreground">Raised: <span className="font-semibold text-foreground">{formatCurrencyShort(data?.stats.fundingRaised || 0)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500"></div>
                      <span className="text-muted-foreground">Spent: <span className="font-semibold text-foreground">{formatCurrencyShort(data?.stats.totalExpenditure || 0)}</span></span>
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


      </div>

      {/* Accepted Pitches Needing Action */}
      {data?.pitches && data.pitches.filter(p => p.pitchStatus === 'accepted').length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-base font-semibold">Accepted Pitches</CardTitle>
              <Badge variant="default" className="text-xs bg-emerald-500">{data.pitches.filter(p => p.pitchStatus === 'accepted').length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.pitches.filter((p: any) => p.pitchStatus === 'accepted').map((pitch: any) => (
              <div key={pitch._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40 gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={pitch.investorId?.avatar} />
                    <AvatarFallback>{getInitials(pitch.investorId?.name || 'I')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{pitch.investorId?.name} accepted your pitch!</p>
                    <p className="text-xs text-muted-foreground">{formatCurrencyShort(pitch.amountRequested)} for {pitch.equityOffered}% equity</p>
                  </div>
                </div>
                <Button onClick={() => handleLogInvestment(pitch)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow">
                  Record Investment & Add to Team
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Access Requests */}
      {data?.accessRequests && data.accessRequests.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-xl mt-6 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base font-semibold">Incoming Access Requests</CardTitle>
              <Badge variant="default" className="text-xs bg-blue-500">{data.accessRequests.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.accessRequests.map((req: any) => (
              <div key={req._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40 gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={req.investorId?.avatar} />
                    <AvatarFallback>{getInitials(req.investorId?.name || 'I')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{req.investorId?.name} requested access</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{req.message || 'No message provided'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleAccessRequestRespond(req._id, 'rejected')} className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20">
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleAccessRequestRespond(req._id, 'approved')} className="bg-blue-600 hover:bg-blue-700 text-white shadow">
                    Approve Access
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}


