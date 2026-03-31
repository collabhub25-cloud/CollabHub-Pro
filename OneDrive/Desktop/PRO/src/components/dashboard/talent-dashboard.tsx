'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import { useAuthStore, useUIStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
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
  Edit, Save, X, Settings, Bell, Shield, Trash2, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { MilestonePaymentModal } from '@/components/milestones/milestone-payment-modal';
import { FloatingTooltip } from '@/components/ui/floating-tooltip';
import { AIMatchingPanel } from '@/components/ai/ai-matching-panel';
import { AIAnalyticsPanel } from '@/components/ai/ai-analytics-panel';

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
  paymentStatus?: string;
  paymentProofUrl?: string;
  disputeReason?: string;
}

interface Agreement {
  _id: string;
  title: string;
  type: string;
  status: string;
  role?: string;
  equity?: number;
  signedAt?: string;
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

  rolesNeeded: { title: string; skills: string[] }[];
}

interface TalentDashboardProps {
  activeTab: string;
}

export function TalentDashboard({ activeTab }: TalentDashboardProps) {
  const router = useRouter();
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

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

    // Intelligence Widgets Data
    const totalEarnings = completedMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const nextDeadline = activeMilestones.length > 0
      ? DateTime.fromMillis(Math.min(...activeMilestones.map(m => new Date(m.dueDate).getTime()))).toLocaleString(DateTime.DATE_MED)
      : 'No assignments';

    return (
      <div className="space-y-6 page-enter relative" data-aos="fade-in">
        {/* Header with glassmorphism */}
        <div data-aos="slide-down" className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(0,71,171,0.05) 0%, rgba(46,139,87,0.04) 50%, rgba(255,255,255,0.8) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,71,171,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground mt-1">Track your progress and find new opportunities</p>
          </div>
          <Button onClick={() => setGlobalTab('search')} className="rounded-xl px-5" style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0066CC 100%)', boxShadow: '0 4px 14px rgba(0,71,171,0.25)' }}>
            <Search className="h-4 w-4 mr-2" />
            Browse Opportunities
          </Button>
        </div>

        {/* Stats Cards — Premium Glassmorphic */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: '1000px' }}>
          {[
            { title: 'Active Projects', value: activeMilestones.length, sub: 'In progress', icon: Briefcase, iconColor: '#0047AB', bg: 'rgba(0,71,171,0.06)' },
            { title: 'Completed Tasks', value: completedMilestones.length, sub: 'Total completed', icon: CheckCircle2, iconColor: '#2E8B57', bg: 'rgba(46,139,87,0.06)' },
            { title: 'Pending Applications', value: pendingApplications.length, sub: 'Awaiting response', icon: Clock, iconColor: '#F97316', bg: 'rgba(249,115,22,0.06)' },
            { title: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, sub: 'From completed tasks', icon: DollarSign, iconColor: '#2E8B57', bg: 'rgba(46,139,87,0.06)', tooltip: 'Based on your completed milestones.' },
            { title: 'Next Deadline', value: nextDeadline, sub: 'Upcoming milestone', icon: Calendar, iconColor: '#F97316', bg: 'rgba(249,115,22,0.06)', truncate: true },
          ].map((stat, index) => (
            <div data-aos="fade-up" data-aos-delay={index * 100} key={stat.title} className="group rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg" style={{ background: `linear-gradient(135deg, ${stat.bg} 0%, rgba(255,255,255,0.9) 100%)`, backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transformStyle: 'preserve-3d' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: stat.bg }}>
                  <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
                </div>
              </div>
              <div className={`text-xl font-semibold ${stat.truncate ? 'truncate' : ''}`}>
                {stat.tooltip ? (
                  <FloatingTooltip content={stat.tooltip} placement="top">
                    <span>{stat.value}</span>
                  </FloatingTooltip>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>

            </div>
          ))}
        </div>

        {/* Verification Progress — Premium Stepper */}
        <div className="rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(46,139,87,0.08)' }}>
                <Award className="h-4 w-4" style={{ color: '#2E8B57' }} />
              </div>
              <h3 className="text-lg font-semibold">Verification Progress</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-10">Complete all levels to unlock premium opportunities</p>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between">
              {verificationSteps.map((step, index) => (
                <div key={step.level} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500"
                      style={{
                        background: step.completed
                          ? 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)'
                          : 'rgba(0,0,0,0.04)',
                        color: step.completed ? 'white' : '#6C635C',
                        boxShadow: step.completed ? '0 4px 14px rgba(46,139,87,0.3)' : 'none',
                      }}
                    >
                      {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.level}
                    </div>
                    <span className="text-xs mt-2 text-center font-medium" style={{ color: step.completed ? '#2E8B57' : '#6C635C' }}>{step.title}</span>
                  </div>
                  {index < verificationSteps.length - 1 && (
                    <div className="w-16 h-1 mx-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: step.completed ? '100%' : '0%', background: 'linear-gradient(90deg, #2E8B57 0%, #0047AB 100%)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity — Premium Two-Column */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Milestones</h3>
                <Button variant="ghost" size="sm" className="rounded-xl text-sm" onClick={() => setGlobalTab('projects')}>View All</Button>
              </div>
            </div>
            <div className="px-6 pb-6">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeMilestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No active milestones</p>
              ) : (
                <div className="space-y-3">
                  {activeMilestones.map((milestone) => (
                    <div key={milestone._id} className="p-4 rounded-xl space-y-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,248,0.9) 100%)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold text-base-body">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground">{milestone.startupId?.name}</p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: '#2E8B57' }}>${milestone.amount}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: '50%', background: 'linear-gradient(90deg, #2E8B57 0%, #0047AB 100%)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recommended Opportunities</h3>
                <Button variant="ghost" size="sm" className="rounded-xl text-sm" onClick={() => setGlobalTab('search')}>See Trends</Button>
              </div>
            </div>
            <div className="px-6 pb-6">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : startups.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No opportunities found</p>
              ) : (
                <div className="space-y-3">
                  {startups.slice(0, 3).map((startup) => (
                    <div key={startup._id} className="flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,248,0.9) 100%)', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div>
                        <p className="font-semibold text-base-body">{startup.name}</p>
                        <p className="text-xs text-muted-foreground">{startup.industry} • {startup.stage}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(46,139,87,0.08)' }}>
                          <span className="text-sm font-medium" style={{ color: '#2E8B57' }}><Shield className="h-3 w-3 inline mr-1" />Verified</span>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0066CC 100%)', boxShadow: '0 4px 12px rgba(0,71,171,0.2)' }}
                          onClick={() => setGlobalTab('search')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                    <InteractiveHoverButton type="submit" disabled={saving} text={saving ? 'Saving...' : 'Save Changes'} className="w-40" />
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
          <InteractiveHoverButton text="Browse Opportunities" onClick={() => setGlobalTab('search')} className="w-52" />
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
                  <InteractiveHoverButton text="Find Opportunities" onClick={() => setGlobalTab('search')} className="w-44" />
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
        {selectedMilestone && (
          <MilestonePaymentModal
            milestone={selectedMilestone}
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={fetchData}
          />
        )}
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
                          <span className="text-sm text-muted-foreground">Due: {DateTime.fromISO(milestone.dueDate).toLocaleString(DateTime.DATE_MED)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{milestone.amount.toLocaleString('en-IN')}</p>
                          <Badge variant={milestone.status === 'in_progress' ? 'default' : 'secondary'}>
                            {milestone.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMilestone(milestone);
                            setIsPaymentModalOpen(true);
                          }}
                        >
                          Manage Payment
                        </Button>
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
                        <p className="text-lg font-bold text-green-600">₹{milestone.amount.toLocaleString('en-IN')}</p>
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
                <Card 
                  key={agreement._id}
                  onClick={() => router.push(`/agreements/${agreement._id}`)}
                  className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 mt-1 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{agreement.title || 'Agreement'}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {agreement.startupId?.name || 'Unknown Startup'} • {agreement.role || 'Team Member'}
                          </p>
                          <div className="flex gap-2 mt-2.5">
                            {agreement.equity && agreement.equity > 0 ? (
                               <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20">{agreement.equity}% Equity</Badge>
                            ) : null}
                            <Badge variant="outline" className="capitalize text-muted-foreground bg-muted/30">{agreement.type?.replace('_', ' ') || 'Standard'}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-between h-full min-h-[60px]">
                        <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 shadow-none border-yellow-500/20">Pending Signature</Badge>
                        <p className="text-xs text-muted-foreground mt-3">
                          {new Date(agreement.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
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
                <Card 
                  key={agreement._id}
                  onClick={() => router.push(`/agreements/${agreement._id}`)}
                  className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all duration-200"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="h-10 w-10 mt-1 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{agreement.title || 'Agreement'}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {agreement.startupId?.name || 'Unknown Startup'} • {agreement.role || 'Team Member'}
                          </p>
                          <div className="flex gap-2 mt-2.5">
                            {agreement.equity && agreement.equity > 0 ? (
                               <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/20">{agreement.equity}% Equity</Badge>
                            ) : null}
                            <Badge variant="outline" className="capitalize text-muted-foreground bg-muted/30">{agreement.type?.replace('_', ' ') || 'Standard'}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end justify-between h-full min-h-[60px]">
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-green-500/20">Signed</Badge>
                        <p className="text-xs text-muted-foreground mt-3">
                          {new Date(agreement.signedAt || agreement.createdAt || Date.now()).toLocaleDateString()}
                        </p>
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
              <div className="text-2xl font-bold text-green-500">₹{totalEarnings.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">₹{pendingPayments.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalEarnings.toLocaleString('en-IN')}</div>
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
                      <p className="font-semibold text-green-600">₹{milestone.amount.toLocaleString('en-IN')}</p>
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

  // Projects — startups where talent is a team member
  if (activeTab === 'projects') {
    return <TalentProjects />;
  }

  // AI Insights
  if (activeTab === 'ai-insights') {
    return (
      <div className="space-y-6 page-enter relative">
        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.06) 0%, rgba(59,130,246,0.04) 50%, rgba(255,255,255,0.8) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(88,28,135,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-semibold">AI Career Insights</h1>
            <p className="text-muted-foreground mt-1">Smart matching and career analytics tailored for you</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Analytics */}
          <div className="space-y-6">
            <AIAnalyticsPanel role="talent" />
          </div>

          {/* Right Column: Matching */}
          <div className="space-y-6">
            <AIMatchingPanel type="talent-startup" onConnect={(id) => useUIStore.getState().setActiveTab('search')} />
          </div>
        </div>
      </div>
    );
  }

  // Settings handled by Dashboard component

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

function TalentProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/startups?member=true', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProjects(data.startups || []);
        }
      } catch (err) {
        console.error('Projects fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Projects</h1>
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center">
              When you join a startup team, your projects will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project: any) => (
            <Card
              key={project._id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/startup/${project._id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="mt-1">{project.industry}</CardDescription>
                  </div>
                  <Badge className="capitalize">{project.stage}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.vision}</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{project.team?.length || 1} members</span>
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
