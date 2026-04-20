'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldX, Clock, Building2, Users,
  Loader2, CheckCircle2, XCircle, RefreshCw, Eye,
  Mail, Calendar, Filter, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StartupVerification {
  _id: string;
  name: string;
  industry: string;
  stage: string;
  description: string;
  AlloySphereVerified: boolean;
  AlloySphereVerifiedAt?: string;
  verificationStatus: string;
  verificationRequestedAt?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  founderId: {
    _id: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
  };
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const [startups, setStartups] = useState<StartupVerification[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    startupId: string;
    startupName: string;
    action: 'approve' | 'reject';
  }>({ open: false, startupId: '', startupName: '', action: 'approve' });

  const fetchStartups = useCallback(async (status: string) => {
    setFetching(true);
    try {
      const res = await apiFetch(`/api/admin/verify-startup?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setStartups(data.startups || []);
      }
    } catch {
      toast.error('Failed to fetch startups');
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes, allRes] = await Promise.all([
        apiFetch('/api/admin/verify-startup?status=pending'),
        apiFetch('/api/admin/verify-startup?status=verified'),
        apiFetch('/api/admin/verify-startup?status=rejected'),
        apiFetch('/api/admin/verify-startup?status=all'),
      ]);
      const pending = pendingRes.ok ? (await pendingRes.json()).startups : [];
      const approved = approvedRes.ok ? (await approvedRes.json()).startups : [];
      const rejected = rejectedRes.ok ? (await rejectedRes.json()).startups : [];
      const all = allRes.ok ? (await allRes.json()).startups : [];
      setCounts({
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        all: all.length,
      });
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchStartups(activeFilter);
    fetchCounts();
  }, [activeFilter, fetchStartups, fetchCounts]);

  const handleAction = async (startupId: string, verified: boolean) => {
    setActionLoading(startupId);
    try {
      const res = await apiFetch('/api/admin/verify-startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startupId,
          verified,
          notes: verified ? 'Approved via Admin Panel' : 'Rejected via Admin Panel',
        }),
      });
      if (res.ok) {
        toast.success(verified ? 'Startup verified successfully! ✅' : 'Verification rejected ❌');
        fetchStartups(activeFilter);
        fetchCounts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, startupId: '', startupName: '', action: 'approve' });
    }
  };

  const handleTabChange = (value: string) => {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      approved: 'verified',
      rejected: 'rejected',
      all: 'all',
    };
    setActiveFilter(statusMap[value] || 'pending');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/15 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Startup Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage verification requests</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={() => { fetchStartups(activeFilter); fetchCounts(); }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">All</p>
              <p className="text-xl font-bold text-white mt-0.5">{counts.all}</p>
            </div>
            <Building2 className="h-5 w-5 text-blue-400" />
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Pending</p>
              <p className="text-xl font-bold text-yellow-400 mt-0.5">{counts.pending}</p>
            </div>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Approved</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{counts.approved}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </CardContent>
        </Card>
        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase">Rejected</p>
              <p className="text-xl font-bold text-red-400 mt-0.5">{counts.rejected}</p>
            </div>
            <ShieldX className="h-5 w-5 text-red-400" />
          </CardContent>
        </Card>
      </div>

      {/* Verification Table */}
      <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="pending" onValueChange={handleTabChange}>
            <TabsList className="bg-white/[0.03] border border-white/5 mb-6">
              <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-400">
                <Clock className="h-3.5 w-3.5 mr-1.5" /> Pending ({counts.pending})
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="data-[state=active]:bg-red-500/15 data-[state=active]:text-red-400">
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Rejected
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
                <Filter className="h-3.5 w-3.5 mr-1.5" /> All
              </TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected', 'all'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {fetching ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                  </div>
                ) : startups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Building2 className="h-10 w-10 text-slate-700 mb-3" />
                    <p className="text-sm text-slate-400">No startups in this category</p>
                    <p className="text-xs text-slate-600 mt-1">Verification requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {startups.map((startup) => (
                      <div
                        key={startup._id}
                        className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="font-semibold text-white text-sm">{startup.name}</h3>
                              {getStatusBadge(startup.verificationStatus || 'none')}
                              <Badge variant="outline" className="text-xs border-white/10 text-slate-400 capitalize">{startup.stage}</Badge>
                              <Badge variant="outline" className="text-xs border-white/10 text-slate-400">{startup.industry}</Badge>
                            </div>
                            {startup.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 max-w-xl">{startup.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {startup.founderId?.name || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {startup.founderId?.email || 'N/A'}
                              </span>
                              {startup.founderId?.isEmailVerified && (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                  Email Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-slate-600">
                              {startup.verificationRequestedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Requested: {new Date(startup.verificationRequestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {startup.verifiedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified: {new Date(startup.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {startup.verificationNotes && (
                              <p className="text-[11px] text-slate-600 italic">Note: {startup.verificationNotes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white"
                              onClick={() => router.push(`/startup/${startup._id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                            {(startup.verificationStatus === 'pending' || startup.verificationStatus === 'none' || !startup.verificationStatus) && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                                  disabled={actionLoading === startup._id}
                                  onClick={() => setConfirmDialog({ open: true, startupId: startup._id, startupName: startup.name, action: 'approve' })}
                                >
                                  {actionLoading === startup._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</>}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  disabled={actionLoading === startup._id}
                                  onClick={() => setConfirmDialog({ open: true, startupId: startup._id, startupName: startup.name, action: 'reject' })}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {startup.verificationStatus === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                disabled={actionLoading === startup._id}
                                onClick={() => setConfirmDialog({ open: true, startupId: startup._id, startupName: startup.name, action: 'reject' })}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.action === 'approve' ? '✅ Approve Verification' : '❌ Reject Verification'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmDialog.action === 'approve'
                ? `Are you sure you want to approve "${confirmDialog.startupName}"? This will grant them the AlloySphere Verified Badge.`
                : `Are you sure you want to reject "${confirmDialog.startupName}"? The verified badge will be removed.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}
              onClick={() => handleAction(confirmDialog.startupId, confirmDialog.action === 'approve')}
            >
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
