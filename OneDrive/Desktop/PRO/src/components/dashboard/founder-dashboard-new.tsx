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
  Plus, Search, FileText, CreditCard, Users, Target,
  TrendingUp, ChevronRight, Loader2, Bell, AlertCircle,
  CheckCircle2, Clock, Circle, MessageSquare, Eye
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TrustScoreIcon } from '@/components/ui/trust-score-icon';
import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface DashboardData {
  startup: any;
  applications: any[];
  milestones: any[];
  agreements: any[];
  funding: any;
  activities: any[];
  stats: {
    totalApplications: number;
    pendingApplications: number;
    activeMilestones: number;
    completedMilestones: number;
    totalMilestones: number;
    pendingAgreements: number;
    teamSlotsFilled: number;
    totalTeamSlots: number;
    fundingRaised: number;
    fundingTarget: number;
  };
}

export function FounderDashboardNew() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [milestoneFilter, setMilestoneFilter] = useState('all');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch multiple endpoints in parallel - using correct API paths
      const [startupsRes, applicationsRes, milestonesRes, agreementsRes] = await Promise.all([
        apiFetch('/api/startups'),
        apiFetch('/api/applications/received'),
        apiFetch('/api/milestones'),
        apiFetch('/api/agreements'),
      ]);

      const startupsData = startupsRes.ok ? await startupsRes.json() : { startups: [] };
      const applications = applicationsRes.ok ? await applicationsRes.json() : [];
      const milestones = milestonesRes.ok ? await milestonesRes.json() : [];
      const agreements = agreementsRes.ok ? await agreementsRes.json() : [];

      const startups = startupsData.startups || startupsData || [];
      const startup = Array.isArray(startups) ? startups[0] : startups;
      const appList = Array.isArray(applications) ? applications : applications.applications || [];
      
      const pendingApps = appList.filter((a: any) => a.status === 'pending');
      const activeMilestones = milestones.filter((m: any) => m.status === 'in_progress' || m.status === 'pending');
      const completedMilestones = milestones.filter((m: any) => m.status === 'completed');
      const pendingAgreements = agreements.filter((a: any) => a.status === 'pending');

      // Calculate team slots
      const rolesNeeded = startup?.rolesNeeded?.length || 0;
      const teamMembers = startup?.team?.length || 0;

      setData({
        startup,
        applications: appList,
        milestones,
        agreements,
        funding: null,
        activities: [],
        stats: {
          totalApplications: appList.length,
          pendingApplications: pendingApps.length,
          activeMilestones: activeMilestones.length,
          completedMilestones: completedMilestones.length,
          totalMilestones: milestones.length,
          pendingAgreements: pendingAgreements.length,
          teamSlotsFilled: teamMembers,
          totalTeamSlots: rolesNeeded + teamMembers,
          fundingRaised: startup?.fundingRaised || 0,
          fundingTarget: startup?.fundingTarget || 0,
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
    activeMilestones: 0,
    completedMilestones: 0,
    totalMilestones: 0,
    pendingAgreements: 0,
    teamSlotsFilled: 0,
    totalTeamSlots: 0,
    fundingRaised: 0,
    fundingTarget: 0,
  };

  const milestoneProgress = stats.totalMilestones > 0 
    ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100) 
    : 0;

  const teamProgress = stats.totalTeamSlots > 0
    ? Math.round((stats.teamSlotsFilled / stats.totalTeamSlots) * 100)
    : 0;

  const filteredMilestones = data?.milestones?.filter((m: any) => {
    if (milestoneFilter === 'all') return true;
    if (milestoneFilter === 'in_progress') return m.status === 'in_progress';
    if (milestoneFilter === 'at_risk') return m.status === 'at_risk' || new Date(m.dueDate) < new Date();
    if (milestoneFilter === 'overdue') return new Date(m.dueDate) < new Date() && m.status !== 'completed';
    if (milestoneFilter === 'completed') return m.status === 'completed';
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {getGreeting()}, {user?.name?.split(' ')[0]} 
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.pendingApplications > 0 && (
              <span>You have {stats.pendingApplications} pending application{stats.pendingApplications > 1 ? 's' : ''}</span>
            )}
            {stats.pendingApplications > 0 && stats.pendingAgreements > 0 && <span> and </span>}
            {stats.pendingAgreements > 0 && (
              <span>{stats.pendingAgreements} unsigned agreement{stats.pendingAgreements > 1 ? 's' : ''}</span>
            )}
            {stats.pendingApplications === 0 && stats.pendingAgreements === 0 && (
              <span>All caught up! Here's your startup overview.</span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="w-fit flex items-center gap-2 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickActionCard
          icon={Plus}
          label="Post a Role"
          description="Find your next team member"
          onClick={() => setActiveTab('startups')}
        />
        <QuickActionCard
          icon={Search}
          label="Discover Talent"
          description="Browse verified profiles"
          onClick={() => setActiveTab('search')}
        />
        <QuickActionCard
          icon={FileText}
          label="New Agreement"
          description="Generate a smart contract"
          onClick={() => setActiveTab('agreements')}
        />
        <QuickActionCard
          icon={CreditCard}
          label="Release Payment"
          description="Approve milestone & pay"
          onClick={() => setActiveTab('payments')}
        />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Applications */}
        <StatsCard
          icon={Users}
          iconColor="text-blue-500"
          label="Active Applications"
          value={stats.totalApplications}
          subtext={`${stats.pendingApplications} pending review`}
          trend={stats.pendingApplications > 0 ? `+${stats.pendingApplications} this week` : undefined}
          trendPositive={true}
          onClick={() => setActiveTab('applications')}
        />

        {/* Milestones On Track */}
        <StatsCard
          icon={Target}
          iconColor="text-amber-500"
          label="Milestones On Track"
          value={`${stats.completedMilestones}/${stats.totalMilestones}`}
          subtext={`${stats.activeMilestones} in progress`}
          progress={milestoneProgress}
          alert={stats.activeMilestones > 3}
          onClick={() => setActiveTab('milestones')}
        />

        {/* Funding Secured */}
        <StatsCard
          icon={TrendingUp}
          iconColor="text-green-500"
          label="Funding Secured"
          value={formatCurrency(stats.fundingRaised)}
          subtext={stats.fundingTarget > 0 ? `${Math.round((stats.fundingRaised / stats.fundingTarget) * 100)}% of target` : 'Set your target'}
          onClick={() => setActiveTab('search')}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Agreements */}
        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => setActiveTab('agreements')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Agreements</p>
                  <p className="text-2xl font-bold">{stats.pendingAgreements}</p>
                  <p className="text-xs text-muted-foreground">Awaiting signature</p>
                </div>
              </div>
              {stats.pendingAgreements > 0 && (
                <Badge variant="destructive" className="text-[10px]">Action required</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Slots */}
        <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors cursor-pointer" onClick={() => setActiveTab('startups')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Team Slots Filled</p>
                <p className="text-2xl font-bold">{stats.teamSlotsFilled}/{stats.totalTeamSlots}</p>
                <p className="text-xs text-muted-foreground">{stats.totalTeamSlots - stats.teamSlotsFilled} roles still open</p>
                {stats.totalTeamSlots > 0 && (
                  <div className="mt-2">
                    <Progress value={teamProgress} className="h-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">{teamProgress}% staffed</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Tracker & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Milestone Tracker */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Milestone Tracker</CardTitle>
                <Badge variant="secondary" className="text-xs">{data?.milestones?.length || 0}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('milestones')}>
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Tabs value={milestoneFilter} onValueChange={setMilestoneFilter} className="w-full">
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs h-6">In Progress</TabsTrigger>
                <TabsTrigger value="at_risk" className="text-xs h-6">At Risk</TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs h-6">Overdue</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs h-6">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No milestones found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMilestones.slice(0, 4).map((milestone: any) => (
                  <MilestoneItem key={milestone._id} milestone={milestone} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Activity</CardTitle>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                Mark all read
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data?.applications && data.applications.length > 0 ? (
              <div className="space-y-3">
                {data.applications.slice(0, 5).map((app: any) => (
                  <ActivityItem key={app._id} application={app} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      {data?.applications && data.applications.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Applications</CardTitle>
                <Badge variant="secondary" className="text-xs">{data.applications.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border/50">
                    <th className="text-left py-2 px-3 font-medium">Applicant</th>
                    <th className="text-left py-2 px-3 font-medium">Role</th>
                    <th className="text-left py-2 px-3 font-medium">Skills</th>
                    <th className="text-left py-2 px-3 font-medium">Trust</th>
                    <th className="text-left py-2 px-3 font-medium">Applied</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications.slice(0, 5).map((app: any) => (
                    <tr key={app._id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={app.talentId?.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(app.talentId?.name || 'Unknown')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{app.talentId?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{app.talentId?.experience || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm">{app.roleTitle || 'Role'}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {app.talentId?.skills?.slice(0, 2).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <TrustScoreIcon size={12} />
                          <span className="text-sm font-medium">{app.talentId?.trustScore || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function QuickActionCard({ icon: Icon, label, description, onClick }: { 
  icon: any; 
  label: string; 
  description: string; 
  onClick: () => void;
}) {
  return (
    <Card 
      className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group"
      onClick={onClick}
    >
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

function StatsCard({ 
  icon: Icon, 
  iconColor, 
  label, 
  value, 
  subtext, 
  trend, 
  trendPositive, 
  progress, 
  alert,
  onClick 
}: { 
  icon: any;
  iconColor: string;
  label: string;
  value: string | number;
  subtext: string;
  trend?: string;
  trendPositive?: boolean;
  progress?: number;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className="bg-card/50 backdrop-blur border-border/50 hover:border-border transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-lg ${iconColor.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
          {alert && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-[10px] text-muted-foreground mt-1">{progress}% completion</p>
          </div>
        )}
        {trend && (
          <p className={`text-xs mt-2 ${trendPositive ? 'text-green-500' : 'text-red-500'}`}>
            ↗ {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneItem({ milestone }: { milestone: any }) {
  const isOverdue = new Date(milestone.dueDate) < new Date() && milestone.status !== 'completed';
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
        milestone.status === 'completed' ? 'bg-green-500/20 text-green-500' :
        isOverdue ? 'bg-red-500/20 text-red-500' :
        'bg-amber-500/20 text-amber-500'
      }`}>
        {milestone.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isOverdue ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{milestone.title}</p>
          <Badge variant="secondary" className="text-[10px]">
            {milestone.status === 'completed' ? 'PAID' : milestone.status?.toUpperCase()}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {milestone.startupId?.name} · {format(new Date(milestone.dueDate), 'dd MMM yyyy')}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{formatCurrency(milestone.amount)}</p>
        {milestone.progress !== undefined && (
          <Progress value={milestone.progress} className="h-1 w-20 mt-1" />
        )}
      </div>
    </div>
  );
}

function ActivityItem({ application }: { application: any }) {
  const getActivityIcon = () => {
    switch (application.status) {
      case 'accepted': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Users className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
        {getActivityIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{application.talentId?.name} applied</p>
        <p className="text-xs text-muted-foreground truncate">
          {application.roleTitle || 'Role'} · {application.startupId?.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pending' },
    accepted: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Accepted' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Rejected' },
    shortlisted: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Shortlisted' },
  };

  const { bg, text, label } = config[status] || config.pending;

  return (
    <Badge className={`${bg} ${text} border-0 text-[10px]`}>
      {label}
    </Badge>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
