'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Briefcase, CheckCircle2, Clock, DollarSign, Award, Zap,
  Search, Building2, Users, Loader2, ExternalLink, FileText,
  Edit, Save, X, Settings, Bell, Shield, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Application {
  _id: string;
  status: string;
  coverLetter: string;
  talentId: { _id: string; name: string; email: string };
  startupId: { _id: string; name: string; industry: string; stage: string; logo?: string };
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
}

interface Agreement {
  _id: string;
  title: string;
  type: string;
  status: string;
  parties: Array<{ _id: string; name: string; role: string; signedAt?: string }>;
  createdAt: string;
  startupId?: { _id: string; name: string };
}

interface Startup {
  _id: string;
  name: string;
  vision: string;
  industry: string;
  stage: string;
  trustScore: number;
  rolesNeeded: { title: string; skills: string[] }[];
}

interface TalentDashboardProps {
  activeTab: string;
}

export function TalentDashboard({ activeTab }: TalentDashboardProps) {
  const { user, setUser } = useAuthStore();
  const { setActiveTab: setGlobalTab } = useUIStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    bio: user?.bio || '',
    skills: user?.skills || [],
    githubUrl: user?.githubUrl || '',
    linkedinUrl: user?.linkedinUrl || '',
    portfolioUrl: user?.portfolioUrl || '',
    location: user?.location || '',
    experience: user?.experience || '',
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    allianceRequests: true,
    applicationUpdates: true,
    marketingEmails: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const verificationSteps = [
    { level: 0, title: 'Profile Complete', completed: true },
    { level: 1, title: 'Skill Test', completed: user?.verificationLevel && user.verificationLevel >= 1 },
    { level: 2, title: 'Project Verification', completed: user?.verificationLevel && user.verificationLevel >= 2 },
    { level: 3, title: 'KYC & NDA', completed: user?.verificationLevel && user.verificationLevel >= 3 },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch applications
      const appsRes = await fetch('/api/applications', {
          credentials: 'include',
      });
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
      }

      // Fetch milestones
      const milestonesRes = await fetch('/api/milestones?assigned=true', {
          credentials: 'include',
      });
      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        setMilestones(data.milestones || []);
      }

      // Fetch agreements
      const agreementsRes = await fetch('/api/agreements', {
          credentials: 'include',
      });
      if (agreementsRes.ok) {
        const data = await agreementsRes.json();
        setAgreements(data.agreements || []);
      }

      // Fetch startups for browsing
      const startupsRes = await fetch('/api/startups?all=true&limit=10', {
          credentials: 'include',
      });
      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartups(data.startups || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchData();
    };
    loadData();
  }, [activeTab, fetchData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
          credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: profile.bio,
          skills: profile.skills,
          githubUrl: profile.githubUrl || undefined,
          linkedinUrl: profile.linkedinUrl || undefined,
          portfolioUrl: profile.portfolioUrl || undefined,
          location: profile.location || undefined,
          experience: profile.experience || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    setProfile({
      bio: user?.bio || '',
      skills: user?.skills || [],
      githubUrl: user?.githubUrl || '',
      linkedinUrl: user?.linkedinUrl || '',
      portfolioUrl: user?.portfolioUrl || '',
      location: user?.location || '',
      experience: user?.experience || '',
    });
    setIsEditing(false);
  };

  const handleSaveSettings = async () => {
    // In a real app, this would save to backend
    toast.success('Settings saved successfully');
  };

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    const activeMilestones = milestones.filter(m => m.status === 'in_progress');
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const pendingApplications = applications.filter(a => a.status === 'pending');
    const acceptedApplications = applications.filter(a => a.status === 'accepted');
    const activeAgreements = agreements.filter(a => a.status === 'active');
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Track your progress and find new opportunities</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeMilestones.length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedMilestones.length}</div>
              <p className="text-xs text-muted-foreground">Total completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApplications.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting response</p>
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

        {/* Verification Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Verification Progress
            </CardTitle>
            <CardDescription>Complete all levels to unlock premium opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {verificationSteps.map((step, index) => (
                <div key={step.level} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.level}
                    </div>
                    <span className="text-xs mt-2 text-center">{step.title}</span>
                  </div>
                  {index < verificationSteps.length - 1 && (
                    <div className={`w-16 h-1 mx-2 ${step.completed ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeMilestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No active milestones</p>
              ) : (
                <div className="space-y-4">
                  {activeMilestones.map((milestone) => (
                    <div key={milestone._id} className="space-y-2">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground">{milestone.startupId?.name}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">${milestone.amount}</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : startups.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No opportunities found</p>
              ) : (
                <div className="space-y-4">
                  {startups.slice(0, 3).map((startup) => (
                    <div key={startup._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{startup.name}</p>
                        <p className="text-xs text-muted-foreground">{startup.industry} • {startup.stage}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {startup.trustScore}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setGlobalTab('search');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Profile
  if (activeTab === 'profile') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Profile</h1>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge className="bg-primary">Level {user?.verificationLevel}</Badge>
                <Badge variant="outline">Trust: {user?.trustScore}</Badge>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Free Account
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Update your professional information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skills (comma separated)</Label>
                  <Input
                    value={profile.skills.join(', ')}
                    onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="React, TypeScript, Node.js"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Experience</Label>
                  <Textarea
                    value={profile.experience}
                    onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                    placeholder="Describe your professional experience..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input
                      value={profile.githubUrl}
                      onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                      placeholder="https://github.com/username"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input
                      value={profile.linkedinUrl}
                      onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Portfolio URL</Label>
                    <Input
                      value={profile.portfolioUrl}
                      onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                      placeholder="https://yourportfolio.com"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Applications
  if (activeTab === 'applications') {
    const pendingApps = applications.filter(a => a.status === 'pending');
    const acceptedApps = applications.filter(a => a.status === 'accepted');
    const rejectedApps = applications.filter(a => a.status === 'rejected');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Applications</h1>
          <Button onClick={() => setGlobalTab('search')}>
            <Search className="h-4 w-4 mr-2" />
            Browse Opportunities
          </Button>
        </div>
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({pendingApps.length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedApps.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingApps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active applications</p>
                  <Button className="mt-4" onClick={() => setGlobalTab('search')}>
                    Find Opportunities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pendingApps.map((app) => (
                <Card key={app._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {app.startupId?.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{app.startupId?.name}</h3>
                        <p className="text-sm text-muted-foreground">{app.startupId?.industry}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{app.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="accepted" className="space-y-4 mt-4">
            {acceptedApps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No accepted applications yet</p>
                </CardContent>
              </Card>
            ) : (
              acceptedApps.map((app) => (
                <Card key={app._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center font-bold text-green-500">
                        {app.startupId?.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{app.startupId?.name}</h3>
                        <p className="text-sm text-muted-foreground">{app.startupId?.industry}</p>
                      </div>
                      <Badge className="bg-green-500">Accepted</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="rejected" className="space-y-4 mt-4">
            {rejectedApps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No rejected applications</p>
                </CardContent>
              </Card>
            ) : (
              rejectedApps.map((app) => (
                <Card key={app._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {app.startupId?.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{app.startupId?.name}</h3>
                        <p className="text-sm text-muted-foreground">{app.startupId?.industry}</p>
                      </div>
                      <Badge variant="destructive">Rejected</Badge>
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

  // Milestones (Active Tasks)
  if (activeTab === 'milestones') {
    const activeMilestones = milestones.filter(m => m.status === 'in_progress' || m.status === 'pending');
    const completedMilestones = milestones.filter(m => m.status === 'completed');

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Active Tasks</h1>
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">In Progress ({activeMilestones.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedMilestones.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activeMilestones.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active tasks</p>
                  <p className="text-sm text-muted-foreground mt-1">Tasks will appear here when you're assigned to milestones</p>
                </CardContent>
              </Card>
            ) : (
              activeMilestones.map((milestone) => (
                <Card key={milestone._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{milestone.startupId?.name}</Badge>
                          <span className="text-sm text-muted-foreground">Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">${milestone.amount.toLocaleString()}</p>
                        <Badge variant={milestone.status === 'in_progress' ? 'default' : 'secondary'}>
                          {milestone.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedMilestones.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No completed tasks yet</p>
                </CardContent>
              </Card>
            ) : (
              completedMilestones.map((milestone) => (
                <Card key={milestone._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{milestone.startupId?.name}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">${milestone.amount.toLocaleString()}</p>
                        <Badge className="bg-green-500">Completed</Badge>
                      </div>
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

  // Agreements
  if (activeTab === 'agreements') {
    const pendingAgreements = agreements.filter(a => a.status === 'pending');
    const signedAgreements = agreements.filter(a => a.status === 'active' || a.status === 'signed');

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Agreements</h1>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending Signature ({pendingAgreements.length})</TabsTrigger>
            <TabsTrigger value="signed">Signed ({signedAgreements.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingAgreements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending agreements</p>
                </CardContent>
              </Card>
            ) : (
              pendingAgreements.map((agreement) => (
                <Card key={agreement._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{agreement.title}</h3>
                        <p className="text-sm text-muted-foreground">{agreement.type}</p>
                        {agreement.startupId && (
                          <Badge variant="outline" className="mt-2">{agreement.startupId.name}</Badge>
                        )}
                      </div>
                      <Button>Sign Agreement</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="signed" className="space-y-4 mt-4">
            {signedAgreements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No signed agreements yet</p>
                </CardContent>
              </Card>
            ) : (
              signedAgreements.map((agreement) => (
                <Card key={agreement._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{agreement.title}</h3>
                        <p className="text-sm text-muted-foreground">{agreement.type}</p>
                      </div>
                      <Badge className="bg-green-500">Signed</Badge>
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

  // Earnings
  if (activeTab === 'earnings') {
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const totalEarnings = completedMilestones.reduce((sum, m) => sum + m.amount, 0);
    const pendingPayments = milestones.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.amount, 0);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">${totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">${pendingPayments.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : completedMilestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">Complete milestones to earn</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedMilestones.map((milestone) => (
                  <div key={milestone._id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">{milestone.startupId?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">${milestone.amount.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-xs">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Settings
  if (activeTab === 'settings') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alliance Requests</Label>
                <p className="text-sm text-muted-foreground">Get notified when someone sends you an alliance request</p>
              </div>
              <Switch
                checked={settings.allianceRequests}
                onCheckedChange={(checked) => setSettings({ ...settings, allianceRequests: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Application Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about your application status changes</p>
              </div>
              <Switch
                checked={settings.applicationUpdates}
                onCheckedChange={(checked) => setSettings({ ...settings, applicationUpdates: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive updates about new features and opportunities</p>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={(checked) => setSettings({ ...settings, marketingEmails: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Account Status</Label>
                <p className="text-sm text-muted-foreground">Your account is active and in good standing</p>
              </div>
              <Badge className="bg-green-500">Active</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Plan</Label>
                <p className="text-sm text-muted-foreground">Talent accounts are completely free</p>
              </div>
              <Badge variant="secondary">Free Account</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </div>
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
