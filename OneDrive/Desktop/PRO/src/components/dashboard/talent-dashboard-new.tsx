'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Briefcase, Target, FileText, Wallet, TrendingUp,
  ChevronRight, Loader2, Bell, CheckCircle2, Clock, Circle,
  Building2, MapPin, Star, Eye, MessageSquare, Award
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatCurrencyShort, QuickActionCard, StatsCard, StatusBadge, StatusDot } from '@/components/dashboard/shared-components';
interface TalentDashboardData {
  applications: any[];
  milestones: any[];
  matchingStartups?: any[];
  startupActivities?: any[];
  stats: {
    totalApplications: number;
    pendingApplications: number;
    acceptedApplications: number;
    rejectedApplications: number;
    activeMilestones: number;
    completedMilestones: number;
    totalMilestones: number;
    totalEarnings: number;
    pendingEarnings: number;
  };
}

export function TalentDashboardNew() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TalentDashboardData | null>(null);
  const [applicationFilter, setApplicationFilter] = useState('all');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [applicationsRes, notificationsRes] = await Promise.all([
        apiFetch('/api/applications'),
        apiFetch('/api/notifications?limit=5'),
      ]);

      const applicationsData = applicationsRes.ok ? await applicationsRes.json() : { applications: [] };
      const notifData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };

      const applications = Array.isArray(applicationsData) ? applicationsData : applicationsData.applications || [];
      const notifications = notifData.notifications || [];

      const pendingApps = applications.filter((a: any) => a.status === 'pending');
      const acceptedApps = applications.filter((a: any) => a.status === 'accepted');
      const rejectedApps = applications.filter((a: any) => a.status === 'rejected');

      let milestoneList: any[] = [];
      let startupActivities: any[] = [];
      let matchingStartups: any[] = [];

      // If hired by a startup, fetch its activities and milestones
      if (acceptedApps.length > 0) {
        const startupId = acceptedApps[0].startupId?._id;
        if (startupId) {
          try {
            const mRes = await apiFetch(`/api/milestones?startupId=${startupId}`);
            if (mRes.ok) {
              const mData = await mRes.json();
              milestoneList = mData.milestones || [];
            }
          } catch (e) {}
        }
        
        // Use real notifications as startup activities
        startupActivities = notifications.slice(0, 4).map((n: any) => ({
          id: n._id,
          title: n.title || 'Activity',
          date: n.createdAt,
        }));
      } else {
        // Not hired, use AI matching for startups
        try {
          const matchRes = await apiFetch('/api/ai/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'talent-startup' }),
          });
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            matchingStartups = matchData.matches || [];
          }
          // Fallback to basic search if AI matching fails
          if (matchingStartups.length === 0) {
            const userSkills = user?.skills?.join(',') || '';
            const skillsParam = userSkills ? `&skills=${encodeURIComponent(userSkills)}` : '';
            const sRes = await apiFetch(`/api/search/startups?limit=5${skillsParam}`);
            if (sRes.ok) {
              const sData = await sRes.json();
              matchingStartups = sData.startups || [];
            }
          }
        } catch (e) {}
      }

      // Calculate real earnings from completed milestones
      const totalEarnings = milestoneList
        .filter((m: any) => m.status === 'completed')
        .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
      const pendingEarnings = milestoneList
        .filter((m: any) => m.status === 'completed' && m.paymentStatus !== 'paid')
        .reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

      setData({
        applications,
        milestones: milestoneList,
        matchingStartups,
        startupActivities,
        stats: {
          totalApplications: applications.length,
          pendingApplications: pendingApps.length,
          acceptedApplications: acceptedApps.length,
          rejectedApplications: rejectedApps.length,
          activeMilestones: milestoneList.filter((m: any) => m.status === 'in_progress').length,
          completedMilestones: milestoneList.filter((m: any) => m.status === 'completed').length,
          totalMilestones: milestoneList.length,
          totalEarnings,
          pendingEarnings,
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    activeMilestones: 0,
    completedMilestones: 0,
    totalMilestones: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  };

  const milestoneProgress = stats.totalMilestones > 0 
    ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100) 
    : 0;

  const filteredApplications = data?.applications?.filter((a: any) => {
    if (applicationFilter === 'all') return true;
    return a.status === applicationFilter;
  }) || [];

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
            {stats.pendingApplications > 0 ? (
              <span>You have {stats.pendingApplications} application{stats.pendingApplications > 1 ? 's' : ''} under review</span>
            ) : stats.acceptedApplications > 0 ? (
              <span>Great work! {stats.acceptedApplications} application{stats.acceptedApplications > 1 ? 's' : ''} accepted</span>
            ) : (
              <span>Find your next opportunity!</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">

        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <QuickActionCard
          icon={Search}
          label="Find Startups"
          description="Browse open positions"
          onClick={() => setActiveTab('search')}
        />
        <QuickActionCard
          icon={Briefcase}
          label="My Applications"
          description={`${stats.totalApplications} total`}
          onClick={() => setActiveTab('applications')}
        />
        <QuickActionCard
          icon={Target}
          label="Milestones"
          description={`${stats.activeMilestones} active`}
          onClick={() => setActiveTab('milestones')}
        />
      </div>

      {/* Hired Banner */}
      {stats.acceptedApplications > 0 ? (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <CardHeader className="pt-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              <span className="text-2xl animate-bounce">🎉</span> You're Hired!
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.applications?.filter((a: any) => a.status === 'accepted').map((app: any) => (
              <div key={app._id} className="flex flex-col md:flex-row gap-5 items-start md:items-center bg-card/60 p-5 rounded-2xl border border-emerald-500/10 dark:border-white/5 transition-all hover:bg-card/80 mt-2">
                 <Avatar className="h-16 w-16 border-2 border-emerald-500/20 shadow-sm">
                   <AvatarImage src={app.startupId?.logo} />
                   <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold text-lg">{getInitials(app.startupId?.name || 'S')}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1 space-y-1">
                   <h3 className="text-xl font-extrabold tracking-tight">{app.startupId?.name}</h3>
                   <div className="flex flex-wrap gap-2 items-center">
                     <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none font-semibold">
                       {app.roleTitle || 'Team Member'}
                     </Badge>
                     {app.startupId?.industry && <span className="text-xs text-muted-foreground">• {app.startupId.industry}</span>}
                   </div>
                   {app.coverLetter && <p className="text-sm text-foreground/80 mt-2 line-clamp-2 leading-relaxed">{app.coverLetter}</p>}
                 </div>
                 <Button onClick={() => router.push(`/startup/${app.startupId?._id}`)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ml-auto shrink-0 transition-transform active:scale-95">
                   View Startup Profile
                 </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30 border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-10 text-muted-foreground text-center">
             <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center mb-3">
               <Briefcase className="h-5 w-5 opacity-40" />
             </div>
             <p className="font-semibold text-foreground/80">No active engagements yet</p>
             <p className="text-sm mt-1 mb-4">Keep applying to top startups to land your dream role.</p>
             <Button variant="outline" onClick={() => setActiveTab('search')}>Browse Opportunities</Button>
          </CardContent>
        </Card>
      )}

      {/* Applications & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Applications List */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-4 border-b border-border/50 mb-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  Applications Overview
                </CardTitle>
              </div>
            </div>
            
            {/* Unified Metrics Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-2">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/50">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold mt-0.5">{stats.totalApplications}</p>
              </div>
              <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-semibold uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{stats.pendingApplications}</p>
              </div>
              <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Accepted</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.acceptedApplications}</p>
              </div>
              <div className={`bg-red-500/5 p-3 rounded-xl border border-red-500/10 ${stats.rejectedApplications === 0 && 'opacity-50'}`}>
                 <p className="text-[10px] text-red-600/70 dark:text-red-400/70 font-semibold uppercase tracking-wider">Rejected</p>
                 <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">{stats.rejectedApplications}</p>
              </div>
            </div>

            <Tabs value={applicationFilter} onValueChange={setApplicationFilter}>
              <TabsList className="h-9 bg-muted/50 p-1 w-full md:w-auto mt-2">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                <TabsTrigger value="shortlisted" className="text-xs">Shortlisted</TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs">Accepted</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-sm font-medium">No applications found in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApplications.map((app: any) => (
                  <ApplicationItem key={app._id} application={app} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Match & Activity */}
        <div className="space-y-4">
          {/* Verification Status */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Verification Level</p>
                  <p className="text-xs text-muted-foreground">Level {user?.verificationLevel || 0}/5</p>
                </div>
              </div>
              <Progress value={(user?.verificationLevel || 0) * 20} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-2">
                Complete verification to unlock more opportunities
              </p>
            </CardContent>
          </Card>

          {/* Conditional Activity/Matches */}
          {stats.acceptedApplications > 0 ? (
            <div className="space-y-4">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-sm">Startup Milestones</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {data?.milestones && data.milestones.length > 0 ? (
                    <div className="space-y-2">
                      {data.milestones.slice(0, 3).map((m: any) => (
                        <div key={m._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 text-xs text-muted-foreground border border-transparent hover:border-border/50 transition-colors">
                          <span className="truncate flex-1">{m.title}</span>
                          <StatusBadge status={m.status === 'completed' ? 'accepted' : 'shortlisted'} />
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground text-center py-4">No milestones yet</p>}
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm">Startup Activity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {/* Startup activities from notifications */}
                    {(data as any)?.startupActivities?.map((act: any) => (
                      <div key={act.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span className="truncate flex-1 text-muted-foreground">{act.title}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border/50 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Matching Startups</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {(data as any)?.matchingStartups && (data as any).matchingStartups.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {(data as any).matchingStartups.map((s: any) => (
                      <div key={s._id} onClick={() => router.push(`/startup/${s._id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.logo} />
                          <AvatarFallback className="text-[10px] bg-primary/10">{getInitials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.industry} · {s.stage}</p>
                          {s.rolesNeeded?.filter((r: any) => r.status === 'open').length > 0 && (
                            <p className="text-[10px] text-emerald-500 font-medium">{s.rolesNeeded.filter((r: any) => r.status === 'open').length} open role{s.rolesNeeded.filter((r: any) => r.status === 'open').length > 1 ? 's' : ''}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <MapPin className="h-6 w-6 mb-2 opacity-50" />
                    <p className="text-xs">No matching startups found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationItem({ application }: { application: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={application.startupId?.logo} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(application.startupId?.name || 'S')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{application.startupId?.name}</p>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-xs text-muted-foreground">{application.roleTitle || 'Role'}</p>
        <p className="text-[10px] text-muted-foreground">
          Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
