'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Building2, Users, CheckCircle2, Clock, 
  Briefcase, Target, Zap, Loader2, Edit, Trash2,
  FileText, AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CreateMilestoneModal } from '@/components/milestones/create-milestone-modal';

interface Startup {
  _id: string;
  name: string;
  vision: string;
  description: string;
  stage: string;
  industry: string;
  fundingStage: string;
  trustScore: number;
  team: { _id: string; name: string }[];
  founderId: { _id: string; name: string; email: string };
}

interface Application {
  _id: string;
  status: string;
  coverLetter: string;
  talentId: { _id: string; name: string; email: string; avatar?: string; skills?: string[] };
  startupId: { _id: string; name: string; industry: string };
  roleId: string;
  createdAt: string;
}

interface Milestone {
  _id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
  startupId: { _id: string; name: string };
  assignedTo: { _id: string; name: string };
}

interface FundingRound {
  _id: string;
  startupId: { _id: string; name: string; industry: string };
  roundName: string;
  targetAmount: number;
  raisedAmount: number;
  equityOffered: number;
  valuation: number;
  minInvestment: number;
  status: string;
  closesAt?: string;
  createdAt: string;
}

interface Agreement {
  _id: string;
  type: string;
  status: string;
  startupId: { _id: string; name: string; industry: string };
  parties: Array<{ _id: string; name: string; email: string; role: string; avatar?: string }>;
  createdAt: string;
  signedBy: Array<{ userId: string; signedAt: string }>;
}

interface FounderDashboardProps {
  activeTab: string;
}

export function FounderDashboard({ activeTab }: FounderDashboardProps) {
  const { user, token } = useAuthStore();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateStartup, setShowCreateStartup] = useState(false);
  const [showEditStartup, setShowEditStartup] = useState<Startup | null>(null);
  const [showDeleteStartup, setShowDeleteStartup] = useState<Startup | null>(null);
  const [showCreateFundingRound, setShowCreateFundingRound] = useState(false);
  const [stats, setStats] = useState({ startups: 0, teamMembers: 0, activeMilestones: 0 });

  // Form states
  const [newStartup, setNewStartup] = useState({
    name: '',
    vision: '',
    description: '',
    stage: 'idea',
    industry: '',
    fundingStage: 'pre-seed',
  });

  const [editStartup, setEditStartup] = useState({
    name: '',
    vision: '',
    description: '',
    stage: '',
    industry: '',
    fundingStage: '',
  });

  const [newFundingRound, setNewFundingRound] = useState({
    startupId: '',
    roundName: '',
    targetAmount: 0,
    equityOffered: 0,
    valuation: 0,
    minInvestment: 0,
    closesAt: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch startups
      const startupsRes = await fetch('/api/startups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartups(data.startups || []);
        setStats(prev => ({ ...prev, startups: (data.startups || []).length }));
      }

      // Fetch applications
      const appsRes = await fetch('/api/applications/received', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
      }

      // Fetch milestones
      const milestonesRes = await fetch('/api/milestones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        setMilestones(data.milestones || []);
        const active = (data.milestones || []).filter((m: Milestone) => m.status !== 'completed').length;
        setStats(prev => ({ ...prev, activeMilestones: active }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'dashboard' || activeTab === 'startups' || activeTab === 'applications' || activeTab === 'milestones' || activeTab === 'funding' || activeTab === 'agreements') {
        await fetchData();
      }
    };
    loadData();
  }, [activeTab, fetchData]);

  // Fetch funding rounds
  const fetchFundingRounds = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/funding/create-round?status=open', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFundingRounds(data.rounds || []);
      }
    } catch (error) {
      console.error('Error fetching funding rounds:', error);
    }
  }, [token]);

  // Fetch agreements
  const fetchAgreements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/agreements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgreements(data.agreements || []);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'funding') {
      fetchFundingRounds();
    }
    if (activeTab === 'agreements') {
      fetchAgreements();
    }
  }, [activeTab, fetchFundingRounds, fetchAgreements]);

  const handleCreateStartup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStartup),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Startup created successfully!');
        setShowCreateStartup(false);
        fetchData();
        setNewStartup({
          name: '',
          vision: '',
          description: '',
          stage: 'idea',
          industry: '',
          fundingStage: 'pre-seed',
        });
      } else {
        toast.error(data.error || 'Failed to create startup');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStartup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditStartup) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/startups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: showEditStartup._id,
          ...editStartup,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Startup updated successfully!');
        setShowEditStartup(null);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to update startup');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStartup = async () => {
    if (!showDeleteStartup) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/startups?id=${showDeleteStartup._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Startup deleted successfully!');
        setShowDeleteStartup(null);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete startup');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditStartup = (startup: Startup) => {
    setEditStartup({
      name: startup.name,
      vision: startup.vision,
      description: startup.description,
      stage: startup.stage,
      industry: startup.industry,
      fundingStage: startup.fundingStage,
    });
    setShowEditStartup(startup);
  };

  const handleUpdateApplication = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Application ${status}`);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update application');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  // Create funding round
  const handleCreateFundingRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundingRound.startupId) {
      toast.error('Please select a startup');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/funding/create-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startupId: newFundingRound.startupId,
          roundName: newFundingRound.roundName,
          targetAmount: Number(newFundingRound.targetAmount),
          equityOffered: Number(newFundingRound.equityOffered),
          valuation: Number(newFundingRound.valuation),
          minInvestment: Number(newFundingRound.minInvestment),
          closesAt: newFundingRound.closesAt || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Funding round created successfully!');
        setShowCreateFundingRound(false);
        fetchFundingRounds();
        setNewFundingRound({
          startupId: '',
          roundName: '',
          targetAmount: 0,
          equityOffered: 0,
          valuation: 0,
          minInvestment: 0,
          closesAt: '',
        });
      } else {
        toast.error(data.error || 'Failed to create funding round');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const getAgreementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      NDA: 'bg-blue-500',
      Work: 'bg-green-500',
      Equity: 'bg-purple-500',
      SAFE: 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your startups</p>
          </div>
          <Button onClick={() => setShowCreateStartup(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Startup
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Startups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.startups}</div>
              <p className="text-xs text-muted-foreground">Active ventures</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground">Across all startups</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Milestones</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeMilestones}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.trustScore || 50}</div>
              <Progress value={user?.trustScore || 50} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Latest talent applications to your startups</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : applications.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No applications yet</p>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((app) => (
                    <div key={app._id} className="flex items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{app.talentId?.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.talentId?.name}</p>
                        <p className="text-xs text-muted-foreground">{app.startupId?.name}</p>
                      </div>
                      <Badge variant={app.status === 'pending' ? 'secondary' : 'default'}>{app.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestone Progress</CardTitle>
              <CardDescription>Current milestones across your startups</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : milestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No milestones yet</p>
              ) : (
                <div className="space-y-4">
                  {milestones.slice(0, 3).map((milestone) => (
                    <div key={milestone._id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{milestone.title}</span>
                        <Badge variant="outline">{milestone.status}</Badge>
                      </div>
                      <Progress value={milestone.status === 'completed' ? 100 : milestone.status === 'in_progress' ? 50 : 0} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Startup Dialog */}
        <Dialog open={showCreateStartup} onOpenChange={setShowCreateStartup}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Startup</DialogTitle>
              <DialogDescription>
                Fill in the details to create your startup profile
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStartup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Startup Name *</Label>
                <Input
                  id="name"
                  value={newStartup.name}
                  onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision">Vision *</Label>
                <Input
                  id="vision"
                  value={newStartup.vision}
                  onChange={(e) => setNewStartup({ ...newStartup, vision: e.target.value })}
                  placeholder="One-line vision statement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newStartup.description}
                  onChange={(e) => setNewStartup({ ...newStartup, description: e.target.value })}
                  placeholder="Describe your startup..."
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage *</Label>
                  <Select value={newStartup.stage} onValueChange={(v) => setNewStartup({ ...newStartup, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scaling">Scaling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funding Stage *</Label>
                  <Select value={newStartup.fundingStage} onValueChange={(v) => setNewStartup({ ...newStartup, fundingStage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Input
                  id="industry"
                  value={newStartup.industry}
                  onChange={(e) => setNewStartup({ ...newStartup, industry: e.target.value })}
                  placeholder="e.g., SaaS, FinTech, AI/ML"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateStartup(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Startup
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // My Startups
  if (activeTab === 'startups') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Startups</h1>
          <Button onClick={() => setShowCreateStartup(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Startup
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : startups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No startups yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first startup to start building your team
              </p>
              <Button onClick={() => setShowCreateStartup(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Startup
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {startups.map((startup) => (
              <Card key={startup._id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{startup.name}</CardTitle>
                      <CardDescription className="mt-1">{startup.industry}</CardDescription>
                    </div>
                    <Badge>{startup.stage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{startup.vision}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{startup.team?.length || 1} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Trust: {startup.trustScore}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditStartup(startup)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteStartup(startup)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Startup Dialog */}
        <Dialog open={showCreateStartup} onOpenChange={setShowCreateStartup}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Startup</DialogTitle>
              <DialogDescription>
                Fill in the details to create your startup profile
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStartup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name2">Startup Name *</Label>
                <Input
                  id="name2"
                  value={newStartup.name}
                  onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vision2">Vision *</Label>
                <Input
                  id="vision2"
                  value={newStartup.vision}
                  onChange={(e) => setNewStartup({ ...newStartup, vision: e.target.value })}
                  placeholder="One-line vision statement"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description2">Description *</Label>
                <Textarea
                  id="description2"
                  value={newStartup.description}
                  onChange={(e) => setNewStartup({ ...newStartup, description: e.target.value })}
                  placeholder="Describe your startup..."
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage *</Label>
                  <Select value={newStartup.stage} onValueChange={(v) => setNewStartup({ ...newStartup, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scaling">Scaling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funding Stage *</Label>
                  <Select value={newStartup.fundingStage} onValueChange={(v) => setNewStartup({ ...newStartup, fundingStage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry2">Industry *</Label>
                <Input
                  id="industry2"
                  value={newStartup.industry}
                  onChange={(e) => setNewStartup({ ...newStartup, industry: e.target.value })}
                  placeholder="e.g., SaaS, FinTech, AI/ML"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateStartup(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Startup
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Startup Dialog */}
        <Dialog open={!!showEditStartup} onOpenChange={() => setShowEditStartup(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Startup</DialogTitle>
              <DialogDescription>
                Update your startup information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditStartup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Startup Name *</Label>
                <Input
                  id="editName"
                  value={editStartup.name}
                  onChange={(e) => setEditStartup({ ...editStartup, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVision">Vision *</Label>
                <Input
                  id="editVision"
                  value={editStartup.vision}
                  onChange={(e) => setEditStartup({ ...editStartup, vision: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description *</Label>
                <Textarea
                  id="editDescription"
                  value={editStartup.description}
                  onChange={(e) => setEditStartup({ ...editStartup, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage *</Label>
                  <Select value={editStartup.stage} onValueChange={(v) => setEditStartup({ ...editStartup, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="validation">Validation</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="scaling">Scaling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funding Stage *</Label>
                  <Select value={editStartup.fundingStage} onValueChange={(v) => setEditStartup({ ...editStartup, fundingStage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIndustry">Industry *</Label>
                <Input
                  id="editIndustry"
                  value={editStartup.industry}
                  onChange={(e) => setEditStartup({ ...editStartup, industry: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditStartup(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Startup Confirmation */}
        <AlertDialog open={!!showDeleteStartup} onOpenChange={() => setShowDeleteStartup(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Startup</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{showDeleteStartup?.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteStartup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Applications
  if (activeTab === 'applications') {
    const pendingApps = applications.filter(a => a.status === 'pending');
    const reviewedApps = applications.filter(a => a.status === 'reviewed');
    const acceptedApps = applications.filter(a => a.status === 'accepted');
    const rejectedApps = applications.filter(a => a.status === 'rejected');

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Applications</h1>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewedApps.length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedApps.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingApps.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No pending applications</p>
                </CardContent>
              </Card>
            ) : (
              pendingApps.map((app) => (
                <Card key={app._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{app.talentId?.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{app.talentId?.name}</h3>
                        <p className="text-sm text-muted-foreground">Applied to {app.startupId?.name}</p>
                        {app.talentId?.skills && (
                          <div className="flex gap-1 mt-1">
                            {app.talentId.skills.slice(0, 3).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleUpdateApplication(app._id, 'reviewed')}>Review</Button>
                        <Button size="sm" onClick={() => handleUpdateApplication(app._id, 'accepted')}>Accept</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="reviewed" className="space-y-4 mt-4">
            {reviewedApps.map((app) => (
              <Card key={app._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{app.talentId?.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{app.talentId?.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.startupId?.name}</p>
                    </div>
                    <Badge>Reviewed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="accepted" className="space-y-4 mt-4">
            {acceptedApps.map((app) => (
              <Card key={app._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{app.talentId?.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{app.talentId?.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.startupId?.name}</p>
                    </div>
                    <Badge className="bg-green-500">Accepted</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-4 mt-4">
            {rejectedApps.map((app) => (
              <Card key={app._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{app.talentId?.name?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{app.talentId?.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.startupId?.name}</p>
                    </div>
                    <Badge variant="destructive">Rejected</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Milestones
  if (activeTab === 'milestones') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Milestones</h1>
          <CreateMilestoneModal onSuccess={fetchData} />
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : milestones.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create milestones to track deliverables and payments
              </p>
              <CreateMilestoneModal onSuccess={fetchData} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {milestones.map((milestone) => (
              <Card key={milestone._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        milestone.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        milestone.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {milestone.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                         milestone.status === 'in_progress' ? <Clock className="h-5 w-5" /> :
                         <Target className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground">{milestone.startupId?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${milestone.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Due: {new Date(milestone.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Funding
  if (activeTab === 'funding') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Funding</h1>
          <Button onClick={() => setShowCreateFundingRound(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Funding Round
          </Button>
        </div>

        {/* Create Funding Round Modal */}
        <Dialog open={showCreateFundingRound} onOpenChange={setShowCreateFundingRound}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Funding Round</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFundingRound} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Startup</Label>
                <Select 
                  value={newFundingRound.startupId} 
                  onValueChange={(v) => setNewFundingRound({ ...newFundingRound, startupId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a startup" />
                  </SelectTrigger>
                  <SelectContent>
                    {startups.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Round Name</Label>
                <Input 
                  placeholder="e.g., Seed Round" 
                  value={newFundingRound.roundName}
                  onChange={(e) => setNewFundingRound({ ...newFundingRound, roundName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount ($)</Label>
                  <Input 
                    type="number"
                    placeholder="500000"
                    value={newFundingRound.targetAmount || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, targetAmount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equity Offered (%)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="10"
                    value={newFundingRound.equityOffered || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, equityOffered: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valuation ($)</Label>
                  <Input 
                    type="number"
                    placeholder="5000000"
                    value={newFundingRound.valuation || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, valuation: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Investment ($)</Label>
                  <Input 
                    type="number"
                    placeholder="1000"
                    value={newFundingRound.minInvestment || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, minInvestment: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Closes At (Optional)</Label>
                <Input 
                  type="date"
                  value={newFundingRound.closesAt}
                  onChange={(e) => setNewFundingRound({ ...newFundingRound, closesAt: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateFundingRound(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create Round
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Active Rounds */}
        <Card>
          <CardHeader>
            <CardTitle>Active Funding Rounds</CardTitle>
            <CardDescription>Manage your fundraising activities</CardDescription>
          </CardHeader>
          <CardContent>
            {fundingRounds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active funding rounds</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateFundingRound(true)}>
                  Start a Round
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fundingRounds.map((round) => (
                  <div key={round._id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <h3 className="font-semibold">{round.roundName}</h3>
                      <p className="text-sm text-muted-foreground">{round.startupId?.name}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Target: ${round.targetAmount.toLocaleString()}</span>
                        <span>Raised: ${round.raisedAmount.toLocaleString()}</span>
                        <span>Equity: {round.equityOffered}%</span>
                      </div>
                    </div>
                    <Badge variant={round.status === 'open' ? 'default' : 'secondary'}>
                      {round.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Agreements
  if (activeTab === 'agreements') {
    const pendingAgreements = agreements.filter(a => a.status === 'pending_signature');
    const signedAgreements = agreements.filter(a => a.status === 'signed');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agreements</h1>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingAgreements.length})</TabsTrigger>
            <TabsTrigger value="signed">Signed ({signedAgreements.length})</TabsTrigger>
            <TabsTrigger value="all">All ({agreements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingAgreements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending agreements</p>
                </CardContent>
              </Card>
            ) : (
              pendingAgreements.map((agreement) => (
                <Card key={agreement._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getAgreementTypeColor(agreement.type)}`}>
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agreement.type} Agreement</h3>
                          <p className="text-sm text-muted-foreground">{agreement.startupId?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-orange-500 border-orange-500">
                          Pending Signature
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {agreement.parties.slice(0, 4).map((party) => (
                          <Avatar key={party._id} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs">{party.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {agreement.parties.length > 4 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{agreement.parties.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        {agreement.signedBy.length}/{agreement.parties.length} signed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="signed" className="space-y-4 mt-4">
            {signedAgreements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No signed agreements yet</p>
                </CardContent>
              </Card>
            ) : (
              signedAgreements.map((agreement) => (
                <Card key={agreement._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getAgreementTypeColor(agreement.type)}`}>
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agreement.type} Agreement</h3>
                          <p className="text-sm text-muted-foreground">{agreement.startupId?.name}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Signed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-4">
            {agreements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No agreements found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Agreements are created when you accept talent applications or receive investments
                  </p>
                </CardContent>
              </Card>
            ) : (
              agreements.map((agreement) => (
                <Card key={agreement._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getAgreementTypeColor(agreement.type)}`}>
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{agreement.type} Agreement</h3>
                          <p className="text-sm text-muted-foreground">{agreement.startupId?.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(agreement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={agreement.status === 'signed' ? 'default' : 'outline'}>
                        {agreement.status === 'signed' ? 'Signed' : 'Pending'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold capitalize">{activeTab}</h1>
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">This section is coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
