'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Mail, MailCheck, ShieldCheck, UserCog, Eye, X, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isEmailVerified: boolean;
  verificationLevel: number;
  createdAt: string;
  lastActive?: string;
  authProvider: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_FILTERS = ['all', 'founder', 'investor', 'talent', 'admin'];

const ROLE_BADGE_STYLES: Record<string, string> = {
  founder: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  investor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  talent: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  admin: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editVerified, setEditVerified] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      });
      const res = await apiFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleViewUser = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        setDetailUser(await res.json());
      }
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditVerified(user.isEmailVerified);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setActionLoading(true);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser._id,
          updates: { role: editRole, isEmailVerified: editVerified },
        }),
      });
      if (res.ok) {
        toast.success('User updated successfully');
        setEditingUser(null);
        fetchUsers(pagination.page);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {pagination.total.toLocaleString()} total users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-slate-300 hover:bg-white/5"
          onClick={() => fetchUsers(pagination.page)}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="bg-white/[0.03] border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-10 pr-4 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </form>
            <div className="flex gap-1.5 flex-wrap">
              {ROLE_FILTERS.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    roleFilter === role
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-white/5'
                  }`}
                >
                  {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-10 w-10 text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">No users found</p>
              <p className="text-xs text-slate-600 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Email Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Auth</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Joined</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[180px]">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge className={`text-[10px] ${ROLE_BADGE_STYLES[user.role] || 'border-white/10 text-slate-400'}`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {user.isEmailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <MailCheck className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 capitalize">{user.authProvider}</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-slate-500">
                          {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white h-7 px-2"
                            onClick={() => handleViewUser(user._id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-blue-400 h-7 px-2"
                            onClick={() => handleEditUser(user)}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 h-7"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 h-7"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchUsers(pagination.page + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <AlertDialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <UserCog className="h-4 w-4 text-blue-400" />
              Edit User: {editingUser?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Update role and verification status for {editingUser?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1.5 block">Role</label>
              <div className="flex gap-2 flex-wrap">
                {['founder', 'investor', 'talent', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setEditRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      editRole === role
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'text-slate-400 border-white/5 hover:bg-white/[0.04]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Email Verified</label>
              <button
                onClick={() => setEditVerified(!editVerified)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  editVerified ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  editVerified ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleSaveEdit}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Detail Modal */}
      {detailUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailUser(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">User Details</h3>
              <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setDetailUser(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {detailLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto" />
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg font-bold">
                      {detailUser.user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{detailUser.user.name}</p>
                      <p className="text-xs text-slate-400">{detailUser.user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase">Role</p>
                      <p className="text-white capitalize mt-0.5">{detailUser.user.role}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase">Verification</p>
                      <p className="text-white mt-0.5">Level {detailUser.user.verificationLevel}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase">Auth Provider</p>
                      <p className="text-white capitalize mt-0.5">{detailUser.user.authProvider}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase">Joined</p>
                      <p className="text-white mt-0.5">
                        {new Date(detailUser.user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {detailUser.user.bio && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Bio</p>
                      <p className="text-xs text-slate-300">{detailUser.user.bio}</p>
                    </div>
                  )}
                  {detailUser.startups?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Startups</p>
                      {detailUser.startups.map((s: any) => (
                        <div key={s._id} className="flex items-center gap-2 p-2 rounded bg-white/[0.02]">
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm text-slate-300">{s.name}</span>
                          <Badge className="text-[9px] ml-auto" variant="outline">{s.stage}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
