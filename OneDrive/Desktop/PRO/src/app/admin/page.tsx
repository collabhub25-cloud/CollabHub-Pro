'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import {
  Users, Building2, CreditCard, ShieldCheck, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, Loader2, RefreshCw,
  UserPlus, Activity, IndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  users: {
    total: number;
    byRole: { founder: number; investor: number; talent: number };
    newThisWeek: number;
    newThisMonth: number;
    recent: Array<{
      _id: string;
      name: string;
      email: string;
      role: string;
      isEmailVerified: boolean;
      createdAt: string;
    }>;
  };
  startups: {
    total: number;
    active: number;
    pendingVerifications: number;
    approved: number;
    rejected: number;
    byStage: Array<{ _id: string; count: number }>;
    byIndustry: Array<{ _id: string; count: number }>;
  };
  payments: {
    total: number;
    completed: number;
    totalRevenue: number;
    byPurpose: Array<{ _id: string; count: number; total: number }>;
  };
  growth: {
    monthlyUsers: Array<{ _id: { year: number; month: number }; count: number }>;
  };
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-purple-500',
  validation: 'bg-blue-500',
  mvp: 'bg-cyan-500',
  growth: 'bg-emerald-500',
  scaling: 'bg-amber-500',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  founder: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  investor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  talent: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  admin: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/stats');
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const revenueInRupees = (data.payments.totalRevenue / 100).toLocaleString('en-IN');
  const maxBarValue = Math.max(...(data.growth.monthlyUsers.map(m => m.count) || [1]), 1);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Platform overview and key metrics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={fetchData}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />+{data.users.newThisWeek} this week
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{data.users.total.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Total Users</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-indigo-400" />
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
                {data.startups.active} active
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{data.startups.total.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Total Startups</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-emerald-400" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                {data.payments.completed} txns
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">₹{revenueInRupees}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Total Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-yellow-400" />
              </div>
              {data.startups.pendingVerifications > 0 && (
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px] animate-pulse">
                  Action needed
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-white">{data.startups.pendingVerifications}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Pending Verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              User Growth
            </CardTitle>
            <CardDescription className="text-slate-500">New registrations per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {data.growth.monthlyUsers.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">{month.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 min-h-[4px]"
                    style={{ height: `${Math.max((month.count / maxBarValue) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] text-slate-600">
                    {MONTH_NAMES[month._id.month - 1]}
                  </span>
                </div>
              ))}
              {data.growth.monthlyUsers.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
                  No growth data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Role Distribution */}
        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.users.byRole).map(([role, count]) => (
              <div key={role} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 capitalize">{role}s</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
                <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      role === 'founder' ? 'bg-indigo-500' : role === 'investor' ? 'bg-emerald-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${data.users.total ? (count / data.users.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Startups by Stage */}
        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              Startups by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.startups.byStage.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${STAGE_COLORS[item._id] || 'bg-slate-500'}`} />
                  <span className="text-sm text-slate-300 capitalize flex-1">{item._id}</span>
                  <span className="text-sm font-semibold text-white">{item.count}</span>
                  <div className="w-24 h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[item._id] || 'bg-slate-500'}`}
                      style={{ width: `${data.startups.total ? (item.count / data.startups.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.startups.byStage.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">No startups yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Industries */}
        <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              Top Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.startups.byIndustry.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <span className="text-sm text-slate-300">{item._id || 'N/A'}</span>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                    {item.count}
                  </Badge>
                </div>
              ))}
              {data.startups.byIndustry.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4 w-full">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-400" />
            Recent Sign-ups
          </CardTitle>
          <CardDescription className="text-slate-500">Latest users who joined the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.users.recent.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {user.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Badge className={`text-[10px] ${ROLE_BADGE_STYLES[user.role] || 'border-white/10 text-slate-400'}`}>
                  {user.role}
                </Badge>
                {user.isEmailVerified && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                    Verified
                  </Badge>
                )}
                <span className="text-[10px] text-slate-600 shrink-0">
                  {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
