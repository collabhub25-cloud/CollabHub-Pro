'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Building2, Search, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Eye, Power, Zap, CheckCircle2, XCircle, Clock, Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StartupRecord {
  _id: string;
  name: string;
  stage: string;
  industry: string;
  isActive: boolean;
  AlloySphereVerified: boolean;
  verificationStatus: string;
  fundingStage: string;
  fundingAmount?: number;
  isBoosted: boolean;
  createdAt: string;
  founderId: { _id: string; name: string; email: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STAGE_FILTERS = ['all', 'idea', 'validation', 'mvp', 'growth', 'scaling'];
const VERIFICATION_FILTERS = ['all', 'pending', 'approved', 'rejected', 'none'];

const STAGE_BADGE_STYLES: Record<string, string> = {
  idea: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  validation: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  mvp: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  growth: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  scaling: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const VERIFICATION_BADGE: Record<string, { style: string; icon: typeof CheckCircle2 }> = {
  approved: { style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  pending: { style: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  rejected: { style: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
  none: { style: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: Filter },
};

export default function AdminStartupsPage() {
  const router = useRouter();
  const [startups, setStartups] = useState<StartupRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStartups = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(stageFilter !== 'all' && { stage: stageFilter }),
        ...(verificationFilter !== 'all' && { verification: verificationFilter }),
      });
      const res = await apiFetch(`/api/admin/startups?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStartups(data.startups || []);
        setPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to fetch startups');
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, verificationFilter]);

  useEffect(() => {
    fetchStartups();
  }, [fetchStartups]);

  const handleToggleActive = async (startupId: string, isActive: boolean) => {
    setActionLoading(startupId);
    try {
      const res = await apiFetch('/api/admin/startups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId, updates: { isActive: !isActive } }),
      });
      if (res.ok) {
        toast.success(isActive ? 'Startup deactivated' : 'Startup activated');
        fetchStartups(pagination.page);
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStartups(1);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-400" />
            Startup Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {pagination.total.toLocaleString()} total startups
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={() => fetchStartups(pagination.page)}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/[0.03] border-white/5">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </form>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Stage</p>
              <div className="flex gap-1.5 flex-wrap">
                {STAGE_FILTERS.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setStageFilter(stage)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      stageFilter === stage
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-white/[0.04] border border-white/5'
                    }`}
                  >
                    {stage === 'all' ? 'All' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-medium">Verification</p>
              <div className="flex gap-1.5 flex-wrap">
                {VERIFICATION_FILTERS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerificationFilter(v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      verificationFilter === v
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-white/[0.04] border border-white/5'
                    }`}
                  >
                    {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Startups Table */}
      <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : startups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">No startups found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Startup</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Stage</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Verification</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Founder</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {startups.map((startup) => {
                    const vBadge = VERIFICATION_BADGE[startup.verificationStatus] || VERIFICATION_BADGE.none;
                    const VIcon = vBadge.icon;
                    return (
                      <tr
                        key={startup._id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[200px]">{startup.name}</p>
                            <p className="text-xs text-slate-500">{startup.industry}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={`text-[10px] ${STAGE_BADGE_STYLES[startup.stage] || 'border-white/10'}`}>
                            {startup.stage}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <Badge className={`text-[10px] ${vBadge.style}`}>
                            <VIcon className="h-3 w-3 mr-0.5" />
                            {startup.verificationStatus || 'none'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-slate-400 truncate block max-w-[150px]">
                            {startup.founderId?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <div className="flex gap-1.5">
                            {startup.isActive ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>
                            ) : (
                              <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">Inactive</Badge>
                            )}
                            {startup.isBoosted && (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                                <Zap className="h-2.5 w-2.5 mr-0.5" /> Boosted
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white h-7 px-2"
                              onClick={() => router.push(`/startup/${startup._id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 ${startup.isActive ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-emerald-400'}`}
                              disabled={actionLoading === startup._id}
                              onClick={() => handleToggleActive(startup._id, startup.isActive)}
                            >
                              {actionLoading === startup._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" disabled={pagination.page <= 1} onClick={() => fetchStartups(pagination.page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchStartups(pagination.page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
