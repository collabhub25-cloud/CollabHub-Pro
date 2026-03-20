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
  Search, Briefcase, Target, FileText, Wallet, TrendingUp,
  ChevronRight, Loader2, Bell, CheckCircle2, Clock, Circle,
  Building2, MapPin, Star, Eye, MessageSquare, Award
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TrustScoreIcon } from '@/components/ui/trust-score-icon';
import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface TalentDashboardData {
  applications: any[];
  milestones: any[];
  agreements: any[];
  stats: {
    totalApplications: number;
    pendingApplications: number;
    acceptedApplications: number;
    activeMilestones: number;
    completedMilestones: number;
    totalMilestones: number;
    totalEarnings: number;
    pendingEarnings: number;
    pendingAgreements: number;
  };
}

export function TalentDashboardNew() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
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
      
      const [applicationsRes, milestonesRes, agreementsRes] = await Promise.all([
        apiFetch('/api/applications/talent'),
        apiFetch('/api/milestones'),
        apiFetch('/api/agreements'),
      ]);

      const applications = applicationsRes.ok ? await applicationsRes.json() : [];
      const milestones = milestonesRes.ok ? await milestonesRes.json() : [];
      const agreements = agreementsRes.ok ? await agreementsRes.json() : [];

      const pendingApps = applications.filter((a: any) => a.status === 'pending');
      const acceptedApps = applications.filter((a: any) => a.status === 'accepted');
      const activeMilestones = milestones.filter((m: any) => m.status === 'in_progress');
      const completedMilestones = milestones.filter((m: any) => m.status === 'completed');
      const pendingAgreements = agreements.filter((a: any) => a.status === 'pending');

      const totalEarnings = completedMilestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
      const pendingEarnings = activeMilestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

      setData({
        applications,
        milestones,
        agreements,
        stats: {
          totalApplications: applications.length,
          pendingApplications: pendingApps.length,
          acceptedApplications: acceptedApps.length,
          activeMilestones: activeMilestones.length,
          completedMilestones: completedMilestones.length,
          totalMilestones: milestones.length,
          totalEarnings,
          pendingEarnings,
          pendingAgreements: pendingAgreements.length,
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
    activeMilestones: 0,
    completedMilestones: 0,
    totalMilestones: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    pendingAgreements: 0,
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
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
            <TrustScoreIcon size={14} />
            <span className="font-semibold">{user?.trustScore || 0}</span>
            <span className="text-muted-foreground">Trust Score</span>
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <QuickActionCard
          icon={Wallet}
          label="Earnings"
          description={formatCurrency(stats.totalEarnings)}
          onClick={() => setActiveTab('earnings')}
        />
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          icon={Briefcase}
          iconColor="text-blue-500"
          label="Applications"
          value={stats.totalApplications}
          subtext={`${stats.pendingApplications} pending · ${stats.acceptedApplications} accepted`}
          onClick={() => setActiveTab('applications')}
        />
        <StatsCard
          icon={Target}
          iconColor="text-amber-500"
          label="Milestones"
          value={`${stats.completedMilestones}/${stats.totalMilestones}`}
          subtext={`${stats.activeMilestones} in progress`}
          progress={milestoneProgress}
          onClick={() => setActiveTab('milestones')}
        />
        <StatsCard
          icon={Wallet}
          iconColor="text-green-500"
          label="Total Earnings"
          value={formatCurrency(stats.totalEarnings)}
          subtext={`${formatCurrency(stats.pendingEarnings)} pending`}
          trend={stats.totalEarnings > 0 ? '+12% this month' : undefined}
          trendPositive={true}
          onClick={() => setActiveTab('earnings')}
        />
      </div>

      {/* Applications & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Applications List */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">My Applications</CardTitle>
                <Badge variant="secondary" className="text-xs">{data?.applications?.length || 0}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Tabs value={applicationFilter} onValueChange={setApplicationFilter}>
              <TabsList className="h-8 bg-muted/50">
                <TabsTrigger value="all" className="text-xs h-6">All</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs h-6">Pending</TabsTrigger>
                <TabsTrigger value="shortlisted" className="text-xs h-6">Shortlisted</TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs h-6">Accepted</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs h-6">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No applications found</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('search')}>
                  Browse Startups
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApplications.slice(0, 4).map((app: any) => (
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

          {/* Recent Activity */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {data?.applications && data.applications.length > 0 ? (
                <div className="space-y-2">
                  {data.applications.slice(0, 3).map((app: any) => (
                    <div key={app._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 text-xs">
                      <StatusDot status={app.status} />
                      <span className="truncate flex-1">Applied to {app.startupId?.name}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </span>
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

function StatsCard({ icon: Icon, iconColor, label, value, subtext, trend, trendPositive, progress, onClick }: { 
  icon: any; iconColor: string; label: string; value: string | number; subtext: string;
  trend?: string; trendPositive?: boolean; progress?: number; onClick: () => void;
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
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
            <p className="text-[10px] text-muted-foreground mt-1">{progress}% completion</p>
          </div>
        )}
        {trend && (
          <p className={`text-xs mt-2 ${trendPositive ? 'text-green-500' : 'text-red-500'}`}>↗ {trend}</p>
        )}
      </CardContent>
    </Card>
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pending' },
    accepted: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Accepted' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Rejected' },
    shortlisted: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Shortlisted' },
  };
  const { bg, text, label } = config[status] || config.pending;
  return <Badge className={`${bg} ${text} border-0 text-[10px]`}>{label}</Badge>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-500',
    shortlisted: 'bg-blue-500',
  };
  return <span className={`h-2 w-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}
