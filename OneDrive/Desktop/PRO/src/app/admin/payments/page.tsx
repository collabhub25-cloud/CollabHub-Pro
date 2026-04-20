'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  CreditCard, IndianRupee, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, TrendingUp, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaymentRecord {
  _id: string;
  type: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  fromUserId: { _id: string; name: string; email: string } | null;
  startupId: { _id: string; name: string } | null;
  razorpayPaymentId?: string;
  createdAt: string;
}

interface PaymentSummary {
  totalRevenue: number;
  totalFees: number;
  totalCompleted: number;
  thisMonth: { revenue: number; count: number };
  lastMonth: { revenue: number; count: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_FILTERS = ['all', 'completed', 'pending', 'failed', 'refunded'];

const STATUS_STYLES: Record<string, { style: string; icon: typeof CheckCircle2 }> = {
  completed: { style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  pending: { style: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  processing: { style: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Clock },
  failed: { style: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
  refunded: { style: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: AlertCircle },
};

const PURPOSE_LABELS: Record<string, string> = {
  founder_profile: 'Founder Profile',
  boost_subscription: 'Boost Subscription',
  ai_report: 'AI Report',
  mentor_session: 'Mentor Session',
  fundraising_commission: 'Commission',
};

function formatINR(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await apiFetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPagination(data.pagination);
        setSummary(data.summary);
      }
    } catch {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const monthChange = summary && summary.lastMonth.revenue > 0
    ? ((summary.thisMonth.revenue - summary.lastMonth.revenue) / summary.lastMonth.revenue) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-400" />
            Payments & Revenue
          </h1>
          <p className="text-sm text-slate-500 mt-1">Financial overview and transaction history</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={() => fetchPayments(pagination.page)}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Revenue Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{formatINR(summary.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Total Revenue</p>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                {monthChange !== 0 && (
                  <Badge className={`text-[10px] ${monthChange > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {monthChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    {Math.abs(monthChange).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-white">{formatINR(summary.thisMonth.revenue)}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">This Month</p>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{summary.totalCompleted}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Completed Txns</p>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{formatINR(summary.totalFees)}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Platform Fees</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === status
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-white/5'
            }`}
          >
            {status === 'all' ? 'All Payments' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CreditCard className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Purpose</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Razorpay ID</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const statusInfo = STATUS_STYLES[payment.status] || STATUS_STYLES.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr
                        key={payment._id}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[160px]">
                              {payment.fromUserId?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-500 truncate max-w-[160px]">
                              {payment.fromUserId?.email || ''}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-300">
                            {PURPOSE_LABELS[payment.purpose] || payment.purpose}
                          </span>
                          {payment.startupId && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{payment.startupId.name}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-semibold text-white">
                            {formatINR(payment.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <Badge className={`text-[10px] ${statusInfo.style}`}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className="text-xs text-slate-500 font-mono">
                            {payment.razorpayPaymentId ? payment.razorpayPaymentId.slice(0, 16) + '...' : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-slate-500">
                            {new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} payments)
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" disabled={pagination.page <= 1} onClick={() => fetchPayments(pagination.page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 h-7" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchPayments(pagination.page + 1)}>
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
