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
  ArrowRight, Loader2, Target, CheckCircle2,
  Clock, Activity, Zap, Presentation, Trophy, Briefcase,
  Building2, FileText
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface DashboardData {
  startup: any;
  applications: any[];
  activities: any[];
  milestones: any[];
  pitches: any[];
  achievements: any[];
  stats: {
    pendingApplications: number;
    pendingMilestones: number;
    pendingPitchRequests: number;
    totalAchievements: number;
    totalTeam: number;
    startupsCount: number;
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

      const [startupsRes, notificationsRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/notifications?limit=10'),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const notifData = notificationsRes.ok ? await notificationsRes.json() : { notifications: [] };

      const startups = startupsData.startups || startupsData || [];
      const startup = Array.isArray(startups) ? startups[0] : startups;
      const notifications = notifData.notifications || [];

      let appList: any[] = [];
      let milestonesList: any[] = [];
      let pitchesList: any[] = [];
      let achievementsList: any[] = [];

      if (startup?._id) {
        const [applicationsRes, milestonesRes, pitchesRes, achievementsRes] = await Promise.all([
          apiFetch(`/api/applications/received?startupId=${startup._id}`),
          apiFetch(`/api/milestones?startupId=${startup._id}`),
          apiFetch(`/api/pitches?startupId=${startup._id}`),
          apiFetch(`/api/achievements?startupId=${startup._id}`),
        ]);

        const applications = applicationsRes.ok ? await applicationsRes.json() : [];
        const milestonesData = milestonesRes.ok ? await milestonesRes.json() : { milestones: [] };
        const pitchesData = pitchesRes.ok ? await pitchesRes.json() : { pitches: [] };
        const achievementsData = achievementsRes.ok ? await achievementsRes.json() : { achievements: [] };

        appList = Array.isArray(applications) ? applications : applications.applications || [];
        milestonesList = milestonesData.milestones || [];
        pitchesList = pitchesData.pitches || [];
        achievementsList = achievementsData.achievements || [];
      }

      const pendingApps = appList.filter((a: any) => a.status === 'pending');
      const pendingMilestones = milestonesList.filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled');
      const pendingPitchRequests = pitchesList.filter((p: any) => p.pitchStatus === 'requested');
      const totalTeam = Array.isArray(startups) ? startups.reduce((sum: number, s: any) => sum + (s.team?.length || 0), 0) : 0;

      // Build real activity feed from notifications
      const realActivities = notifications.slice(0, 6).map((notif: any) => {
        let icon = Bell;
        let color = 'text-blue-500';
        let bg = 'bg-blue-500/10';
        if (notif.type?.includes('application')) { icon = UserPlus; color = 'text-blue-500'; bg = 'bg-blue-500/10'; }
        else if (notif.type?.includes('milestone')) { icon = Target; color = 'text-emerald-500'; bg = 'bg-emerald-500/10'; }
        else if (notif.type?.includes('pitch')) { icon = Presentation; color = 'text-purple-500'; bg = 'bg-purple-500/10'; }
        else if (notif.type?.includes('alliance')) { icon = Users; color = 'text-orange-500'; bg = 'bg-orange-500/10'; }
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

      setData({
        startup,
        applications: appList,
        activities: realActivities,
        milestones: milestonesList,
        pitches: pitchesList,
        achievements: achievementsList,
        stats: {
          pendingApplications: pendingApps.length,
          pendingMilestones: pendingMilestones.length,
          pendingPitchRequests: pendingPitchRequests.length,
          totalAchievements: achievementsList.length,
          totalTeam,
          startupsCount: Array.isArray(startups) ? startups.length : 1,
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

  const pendingApps = data?.applications?.filter((a: any) => a.status === 'pending') || [];
  const pendingMilestones = data?.milestones?.filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled') || [];
  const pendingPitchRequests = data?.pitches?.filter((p: any) => p.pitchStatus === 'requested') || [];

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
            Your command center is synchronized and up to date.
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Startups', value: data?.stats.startupsCount || 0, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Team Members', value: data?.stats.totalTeam || 0, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Pending Apps', value: data?.stats.pendingApplications || 0, icon: UserPlus, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          { label: 'Pitch Requests', value: data?.stats.pendingPitchRequests || 0, icon: Presentation, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl bg-background/40 backdrop-blur-xl border ${stat.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending Pitch Requests (Prominent if any) */}
      {pendingPitchRequests.length > 0 && (
        <Card className="overflow-hidden relative border-purple-500/30 bg-purple-500/5 shadow-xl">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <CardHeader className="pb-2 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Presentation className="h-4 w-4 text-purple-500" />
                </div>
                <CardTitle className="text-base font-semibold">Incoming Pitch Requests</CardTitle>
                <Badge variant="default" className="text-xs bg-purple-600">{pendingPitchRequests.length}</Badge>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                onClick={() => setActiveTab('pitch-requests')}
              >
                View All
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {pendingPitchRequests.slice(0, 3).map((pitch: any) => (
                <div key={pitch._id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarImage src={pitch.investorId?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-foreground font-semibold">
                        {getInitials(pitch.investorId?.name || 'I')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm leading-none mb-1">{pitch.investorId?.name || 'Investor'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="truncate max-w-[140px]">{pitch.startupId?.name || 'Startup'}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-[10px]">
                      Level {pitch.investorId?.verificationLevel || 0}
                    </Badge>
                    <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setActiveTab('pitch-requests')}>
                      Respond
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <CardTitle className="text-base font-semibold">Pending Applications</CardTitle>
                {pendingApps.length > 0 && (
                  <Badge variant="default" className="text-xs bg-blue-600">{pendingApps.length}</Badge>
                )}
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
            {pendingApps.length > 0 ? (
              <div className="space-y-4">
                {pendingApps.slice(0, 4).map((app: any) => (
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

        {/* Pending Milestones */}
        <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Target className="h-4 w-4 text-emerald-500" />
                </div>
                <CardTitle className="text-base font-semibold">Pending Milestones</CardTitle>
                {pendingMilestones.length > 0 && (
                  <Badge variant="default" className="text-xs bg-emerald-600">{pendingMilestones.length}</Badge>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                onClick={() => setActiveTab('milestones')}
              >
                View All
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {pendingMilestones.length > 0 ? (
              <div className="space-y-3">
                {pendingMilestones.slice(0, 4).map((milestone: any) => (
                  <div key={milestone._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        milestone.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {milestone.status === 'in_progress' ? <Clock className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {milestone.startupId?.name || 'Startup'} • Due {milestone.dueDate ? formatDistanceToNow(new Date(milestone.dueDate), { addSuffix: true }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {(milestone.status || 'pending').replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No active milestones</p>
                <p className="text-xs text-muted-foreground mt-1">Create milestones to track progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Journey / Achievements Summary */}
        <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                </div>
                <CardTitle className="text-base font-semibold">Journey & Achievements</CardTitle>
                {(data?.stats.totalAchievements || 0) > 0 && (
                  <Badge variant="default" className="text-xs bg-yellow-600">{data?.stats.totalAchievements}</Badge>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer"
                onClick={() => setActiveTab('journey')}
              >
                View Journey
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {data?.achievements && data.achievements.length > 0 ? (
              <div className="space-y-3">
                {data.achievements.slice(0, 4).map((achievement: any) => (
                  <div key={achievement._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50">
                    <div className="h-9 w-9 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{achievement.description}</p>
                      {achievement.createdAt && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(achievement.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Trophy className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">No achievements yet</p>
                <p className="text-xs text-muted-foreground mt-1">Record milestones and wins on your journey.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab('journey')}>
                  Start Journey
                </Button>
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
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
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
  );
}
