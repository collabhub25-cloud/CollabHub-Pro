'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Building2, Users, CheckCircle2, Clock,
  Briefcase, Target, Zap, Loader2, Edit, Trash2,
  FileText, AlertCircle, DollarSign, Lock, ExternalLink,
  ChevronRight, TrendingUp, Presentation, Check, Shield, Star, Trophy, Eye, EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { apiFetch } from '@/lib/api-client';
import { MilestonePaymentModal } from '@/components/milestones/milestone-payment-modal';
import { AlloySphereVerifiedBadge } from '@/components/ui/alloysphere-verified-badge';
import { AIMatchingPanel } from '@/components/ai/ai-matching-panel';
import { AIAnalyticsPanel } from '@/components/ai/ai-analytics-panel';

interface Startup {
  _id: string;
  name: string;
  vision: string;
  description: string;
  stage: string;
  industry: string;
  fundingStage: string;

  team: { _id: string; name: string }[];
  founderId: { _id: string; name: string; email: string };
  AlloySphereVerified?: boolean;
  AlloySphereVerifiedAt?: string;
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
  paymentStatus?: string;
  paymentProofUrl?: string;
  disputeReason?: string;
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

interface Pitch {
  _id: string;
  startupId: { _id: string; name: string };
  investorId: { _id: string; name: string; avatar?: string; verificationLevel: number; email: string };
  pitchStatus: 'requested' | 'sent' | 'rejected' | 'invested' | 'expired';
  message?: string;
  amountRequested?: number;
  equityOffered?: number;
  pitchDocumentUrl?: string;
  pitchMessage?: string;
  pitchSentAt?: string;
  createdAt: string;
}

interface InvestmentConfirmation {
  _id: string;
  startupId: { _id: string; name: string; logo?: string };
  investorId: { _id: string; name: string; avatar?: string; email: string };
  pitchId: string;
  status: 'pending' | 'awaiting_entries' | 'founder_submitted' | 'investor_submitted' | 'matched' | 'mismatched' | 'expired';
  founderAmount?: number;
  founderEquity?: number;
  investorAmount?: number;
  investorEquity?: number;
  promptSentAt?: string;
  expiresAt?: string;
  retryCount: number;
}


const chartConfig = {
  sales: {
    label: "Revenue",
    color: "hsl(var(--chart-4))",
  },
  customers: {
    label: "Team Members",
    color: "hsl(var(--chart-1))",
  },
};

interface FounderDashboardProps {
  activeTab: string;
}

export function FounderDashboard({ activeTab }: FounderDashboardProps) {
  const { user } = useAuthStore();
  const router = useRouter();
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

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Achievements
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [showCreateAchievement, setShowCreateAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', type: 'milestone', visibility: 'public', startupId: '' });
  const [achievementSubmitting, setAchievementSubmitting] = useState(false);

  // Pitches & Confirmations
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [confirmations, setConfirmations] = useState<InvestmentConfirmation[]>([]);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [showSendPitchModal, setShowSendPitchModal] = useState<Pitch | null>(null);
  const [sendPitchData, setSendPitchData] = useState({ pitchDocumentUrl: '', message: '' });
  const [showConfirmModal, setShowConfirmModal] = useState<InvestmentConfirmation | null>(null);
  const [confirmTerms, setConfirmTerms] = useState({ amount: '', equity: '' });

  // Compute dynamic chart data from real user data
  const dynamicChartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const chartMonths: { month: string; customers: number; sales: number }[] = [];

    // Build last 7 months
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = months[d.getMonth()];
      chartMonths.push({ month: label, customers: 0, sales: 0 });
    }

    // Calculate cumulative team members from startups
    const totalTeam = startups.reduce((sum, s) => sum + (s.team?.length || 0), 0);
    // Calculate total raised from funding rounds
    const totalRaised = fundingRounds.reduce((sum, r) => sum + (r.raisedAmount || 0), 0);

    // Distribute growth progressively across months
    chartMonths.forEach((m, idx) => {
      const factor = (idx + 1) / chartMonths.length;
      m.customers = Math.round(totalTeam * factor);
      m.sales = Math.round(totalRaised * factor);
    });

    return chartMonths;
  }, [startups, fundingRounds]);

  // Dynamic summary stats
  const totalTeamMembers = startups.reduce((sum, s) => sum + (s.team?.length || 0), 0);
  const totalRaised = fundingRounds.reduce((sum, r) => sum + (r.raisedAmount || 0), 0);
  const totalRaisedDisplay = totalRaised >= 1000 ? `$${(totalRaised / 1000).toFixed(1)}K` : `$${totalRaised}`;
  const prevMonthTeam = dynamicChartData.length >= 2 ? dynamicChartData[dynamicChartData.length - 2]?.customers || 0 : 0;
  const teamGrowth = totalTeamMembers - prevMonthTeam;
  const prevMonthSales = dynamicChartData.length >= 2 ? dynamicChartData[dynamicChartData.length - 2]?.sales || 0 : 0;
  const salesGrowth = totalRaised - prevMonthSales;

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

  const [fundingRoundErrors, setFundingRoundErrors] = useState<Record<string, string>>({});
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
    setLoading(true);
    try {
      // Fetch startups
      const startupsRes = await fetch('/api/startups', {
        credentials: 'include',
      });
      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartups(data.startups || []);
        setStats(prev => ({ ...prev, startups: (data.startups || []).length }));
      }

      // Fetch applications
      const appsRes = await fetch('/api/applications/received', {
        credentials: 'include',
      });
      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(data.applications || []);
      }

      // Fetch milestones
      const milestonesRes = await fetch('/api/milestones', {
        credentials: 'include',
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

    // Fetch real activity feed from notifications
    try {
      const notifRes = await fetch('/api/notifications?limit=6', { credentials: 'include' });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch { /* silent */ }
  }, []);

  const fetchPitches = useCallback(async () => {
    setPitchLoading(true);
    try {
      const res = await fetch('/api/pitches', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPitches(data.pitches || []);
      }
    } catch (err) {
      console.error('Error fetching pitches:', err);
    } finally {
      setPitchLoading(false);
    }
  }, []);

  const fetchConfirmations = useCallback(async () => {
    setConfirmationLoading(true);
    try {
      const res = await fetch('/api/investment-confirmation', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConfirmations(data.confirmations || []);
      }
    } catch (err) {
      console.error('Error fetching confirmations:', err);
    } finally {
      setConfirmationLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'dashboard' || activeTab === 'startups' || activeTab === 'applications' || activeTab === 'milestones' || activeTab === 'funding' || activeTab === 'agreements' || activeTab === 'achievements' || activeTab === 'pitch-requests') {
        await fetchData();
        await fetchPitches();
        await fetchConfirmations();
      }
    };
    loadData();
  }, [activeTab, fetchData, fetchPitches, fetchConfirmations]);

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    if (startups.length === 0) return;
    setAchievementsLoading(true);
    try {
      const allAchievements: any[] = [];
      for (const s of startups) {
        const res = await fetch(`/api/achievements?startupId=${s._id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          allAchievements.push(...(data.achievements || []).map((a: any) => ({ ...a, startupName: s.name })));
        }
      }
      setAchievements(allAchievements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      console.error('Error fetching achievements');
    }
    setAchievementsLoading(false);
  }, [startups]);

  useEffect(() => {
    if (activeTab === 'achievements' && startups.length > 0) {
      fetchAchievements();
    }
  }, [activeTab, startups, fetchAchievements]);

  // Fetch funding rounds
  const fetchFundingRounds = useCallback(async () => {
    try {
      const res = await fetch('/api/funding/create-round?status=open', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setFundingRounds(data.rounds || []);
      }
    } catch (error) {
      console.error('Error fetching funding rounds:', error);
    }
  }, []);

  // Fetch agreements
  const fetchAgreements = useCallback(async () => {
    try {
      const res = await fetch('/api/agreements', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAgreements(data.agreements || []);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
    }
  }, []);

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
      const res = await apiFetch('/api/startups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          const firstError = typeof data.details[0] === 'string' ? data.details[0] : data.details[0].message;
          toast.error(firstError || data.error || 'Validation failed');
        } else {
          toast.error(data.error || 'Failed to create startup');
        }
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
      const res = await apiFetch('/api/startups', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      const res = await apiFetch(`/api/startups?id=${showDeleteStartup._id}`, {
        method: 'DELETE',

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
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  const handleSendPitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSendPitchModal) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pitches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: showSendPitchModal._id,
          action: 'send_pitch',
          pitchDocumentUrl: sendPitchData.pitchDocumentUrl,
          message: sendPitchData.message
        }),
      });
      if (res.ok) {
        toast.success('Pitch sent successfully!');
        setShowSendPitchModal(null);
        setSendPitchData({ pitchDocumentUrl: '', message: '' });
        fetchPitches();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send pitch');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPitch = async (pitchId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/pitches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pitchId, action: 'reject' }),
      });
      if (res.ok) {
        toast.success('Pitch request rejected');
        fetchPitches();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to reject pitch');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitInvestmentTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirmModal) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/investment-confirmation/founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationId: showConfirmModal._id,
          founderAmount: Number(confirmTerms.amount),
          founderEquity: Number(confirmTerms.equity)
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.matched ? 'Investment confirmed! Match found. 🎉' : 'Details submitted. Awaiting investor entry.');
        setShowConfirmModal(null);
        setConfirmTerms({ amount: '', equity: '' });
        fetchConfirmations();
        fetchData(); // Refresh funding stats
      } else {
        toast.error(data.error || 'Failed to submit terms');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    const activeMilestones = milestones.filter(m => m.status !== 'completed');
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const pendingApplications = applications.filter(a => a.status === 'pending');

    return (
      <div className="space-y-6 page-enter relative">
        {/* Glassmorphic Header */}
        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with <span className="font-semibold text-foreground">your startups</span></p>
          </div>
          <Badge variant="outline" className="px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.2)' }}>
            Level {user?.verificationLevel || 0} Verified
          </Badge>
        </div>

        {/* Premium Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Startups', value: startups.length, icon: '🏢', gradient: 'rgba(0,0,0,0.03)' },
            { label: 'Team Members', value: totalTeamMembers, icon: '👥', gradient: 'rgba(0,0,0,0.03)' },
            { label: 'Active Milestones', value: activeMilestones.length, icon: '🎯', gradient: 'rgba(0,0,0,0.03)' },
            { label: 'Funding Raised', value: totalRaisedDisplay, icon: '💰', gradient: 'rgba(0,0,0,0.03)' },
            { label: 'Agreements', value: agreements.length, icon: '📄', gradient: 'rgba(0,0,0,0.03)' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] cursor-default" style={{ background: stat.gradient, backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.25)' }}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <p className="text-xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Verification Banner */}
        {(user?.verificationLevel || 0) < 2 && (
          <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.06) 0%, rgba(0,71,171,0.04) 100%)', border: '1px solid rgba(46,139,87,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)' }}>
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Unlock Full Potential (Level 2)</p>
                <p className="text-xs text-muted-foreground">Raise capital with funding rounds and form strategic alliances</p>
              </div>
            </div>
            <Button variant="outline" className="cursor-pointer hover:bg-primary/5" style={{ borderColor: 'var(--sea-green)', color: 'var(--sea-green)' }} onClick={() => useUIStore.getState().setActiveTab('verification')}>Continue →</Button>
          </div>
        )}

        {/* Pending Investment Confirmations */}
        {confirmations.some(c => c.status === 'awaiting_entries' || c.status === 'investor_submitted' || c.status === 'mismatched') && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-semibold text-sm">Action Required: Investment Confirmation</p>
                  <p className="text-xs text-muted-foreground">
                    You have {confirmations.filter(c => c.status === 'awaiting_entries' || c.status === 'investor_submitted' || c.status === 'mismatched').length} investment(s) awaiting your term confirmation.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => useUIStore.getState().setActiveTab('funding')}>
                Confirm Now
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {/* Recent Milestones */}
            <div className="p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2"><Target className="h-4 w-4" style={{ color: 'var(--sea-green)' }} /> Recent Milestones</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0">View All <ChevronRight className="ml-1 h-3 w-3" /></Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : milestones.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No milestones yet</p>
              ) : (
                <div className="space-y-4">
                  {milestones.slice(0, 4).map((milestone) => {
                    const isCompleted = milestone.status === 'completed';
                    return (
                      <div key={milestone._id} className="p-3 rounded-lg transition-all hover:bg-black/5" style={{ border: '1px solid rgba(0,0,0,0.25)' }}>
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{milestone.startupId?.name || 'Startup'}</span>
                          <span className="text-xs text-muted-foreground">
                            {milestone.dueDate ? formatDistanceToNow(new Date(milestone.dueDate), { addSuffix: true }) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          {isCompleted ? <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--sea-green)' }} /> : <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />}
                          <span className="text-muted-foreground truncate text-xs">{milestone.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Funding Activity */}
            <div className="p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" style={{ color: 'var(--cobalt-blue)' }} /> Funding Activity</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0">View All <ChevronRight className="ml-1 h-3 w-3" /></Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : fundingRounds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No funding activity yet</p>
              ) : (
                <div className="space-y-3">
                  {fundingRounds.slice(0, 3).map((round, index) => (
                    <div key={round._id} className="flex justify-between items-center p-3 rounded-lg transition-all hover:bg-black/5" style={{ border: '1px solid rgba(0,0,0,0.25)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          <span className="font-semibold">{round.startupId?.name}</span>{" "}
                          <span className="font-bold">${(round.targetAmount / 1000).toFixed(0)}k</span>{" "}
                          <span className="text-muted-foreground text-xs ml-1">{round.roundName} Round</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(round.createdAt), { addSuffix: true })}</span>
                        {index === 0 && <Badge className="text-caption px-1.5 py-0 h-5" style={{ background: 'linear-gradient(135deg, #2E8B57, #0047AB)', color: 'white' }}>New</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-7 flex flex-col gap-6">
            {/* Growth Chart */}
            <div className="p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 className="text-base font-semibold mb-4">Startup Growth</h3>
              <div className="flex flex-wrap gap-8 items-start mb-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{totalTeamMembers}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sea-green)' }}>{teamGrowth >= 0 ? '+' : ''}{teamGrowth}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Team Members</span>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{totalRaisedDisplay}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sea-green)' }}>{salesGrowth >= 0 ? '+' : ''}{salesGrowth >= 1000 ? `$${(salesGrowth / 1000).toFixed(1)}K` : `$${salesGrowth}`}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Revenue <span style={{ color: 'var(--sea-green)' }}>raised this month</span></span>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart data={dynamicChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-customers)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--color-customers)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="customers" stroke="var(--color-customers)" strokeWidth={2} fill="url(#fillCustomers)" fillOpacity={1} />
                    <Area type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} fill="url(#fillSales)" fillOpacity={1} />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>

            {/* Real Activity Feed */}
            <div className="p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)]" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2"><Zap className="h-4 w-4" style={{ color: 'var(--sea-green)' }} /> Activity Feed</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity. Start by creating a startup!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 6).map((notif: any) => (
                    <div key={notif._id} className="flex gap-3 items-start p-3 rounded-lg transition-all hover:bg-black/5" style={{ border: '1px solid rgba(0,0,0,0.25)' }}>
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: notif.type?.includes('milestone') ? 'rgba(46,139,87,0.1)' : notif.type?.includes('funding') ? 'rgba(234,179,8,0.1)' : 'rgba(0,71,171,0.1)', color: notif.type?.includes('milestone') ? '#2E8B57' : notif.type?.includes('funding') ? '#B45309' : '#0047AB' }}>
                        {notif.type?.includes('milestone') ? '🎯' : notif.type?.includes('funding') ? '💰' : notif.type?.includes('agreement') ? '📄' : '🔔'}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-medium leading-snug">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                        <span className="text-caption text-muted-foreground/60">{notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                <Label>Industry *</Label>
                <Select value={newStartup.industry} onValueChange={(v) => setNewStartup({ ...newStartup, industry: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education', 'Real Estate', 'Food & Beverage', 'Travel', 'Entertainment', 'Manufacturing', 'Other'].map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateStartup(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton type="submit" disabled={submitting} text={submitting ? 'Creating...' : 'Create Startup'} className="w-40" />
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
          {startups.length === 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <InteractiveHoverButton text="Create Startup" onClick={() => setShowCreateStartup(true)} disabled={(user?.verificationLevel || 0) < 1} className="w-40" />
                  </div>
                </TooltipTrigger>
                {(user?.verificationLevel || 0) < 1 && (
                  <TooltipContent>
                    <p>You need to complete your profile (Level 1) to create a startup.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : startups.length === 0 ? (
          <Card className="border-dashed bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No startups yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first startup to start building your team
              </p>
              <InteractiveHoverButton text="Create Startup" onClick={() => setShowCreateStartup(true)} disabled={(user?.verificationLevel || 0) < 1} className="w-40" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {startups.map((startup) => (
              <Card key={startup._id} className="hover:border-primary/50 transition-colors cursor-pointer bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5" onClick={() => router.push(`/startup/${startup._id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-1.5">
                        {startup.name}
                        {startup.AlloySphereVerified && (
                          <AlloySphereVerifiedBadge verified={true} variant="inline" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{startup.industry}</CardDescription>
                    </div>
                    <Badge>{startup.stage}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{startup.vision}</p>
                  <div className="flex items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{startup.team?.length || 1} members</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); router.push(`/startup/${startup._id}`); }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteStartup(startup); }}
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
                <Label>Industry *</Label>
                <Select value={newStartup.industry} onValueChange={(v) => setNewStartup({ ...newStartup, industry: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education', 'Real Estate', 'Food & Beverage', 'Travel', 'Entertainment', 'Manufacturing', 'Other'].map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateStartup(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton type="submit" disabled={submitting} text={submitting ? 'Creating...' : 'Create Startup'} className="w-40" />
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
                <InteractiveHoverButton type="submit" disabled={submitting} text={submitting ? 'Saving...' : 'Save Changes'} className="w-40" />
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

  // Milestones
  if (activeTab === 'milestones') {
    return (
      <div className="space-y-6">
        {selectedMilestone && (
          <MilestonePaymentModal
            milestone={selectedMilestone}
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={fetchData}
          />
        )}

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
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${milestone.status === 'completed' ? 'bg-green-500/10 text-green-500' :
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
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="font-semibold">₹{milestone.amount.toLocaleString('en-IN')}</p>
                        <p className="text-sm text-muted-foreground">Due: {new Date(milestone.dueDate).toLocaleDateString()}</p>
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
          <InteractiveHoverButton text="Create Funding Round" onClick={() => setShowCreateFundingRound(true)} className="w-52" />
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
                  className={fundingRoundErrors.roundName ? "border-red-500" : ""}
                  placeholder="e.g., Seed Round"
                  value={newFundingRound.roundName}
                  onChange={(e) => setNewFundingRound({ ...newFundingRound, roundName: e.target.value })}
                  required
                />
                {fundingRoundErrors.roundName && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.roundName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount ($)</Label>
                  <Input
                    className={fundingRoundErrors.targetAmount ? "border-red-500" : ""}
                    type="number"
                    placeholder="500000"
                    value={newFundingRound.targetAmount || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, targetAmount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {fundingRoundErrors.targetAmount && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.targetAmount}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Equity Offered (%)</Label>
                  <Input
                    className={fundingRoundErrors.equityOffered ? "border-red-500" : ""}
                    type="number"
                    step="0.01"
                    placeholder="10"
                    value={newFundingRound.equityOffered || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, equityOffered: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {fundingRoundErrors.equityOffered && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.equityOffered}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valuation ($)</Label>
                  <Input
                    className={fundingRoundErrors.valuation ? "border-red-500" : ""}
                    type="number"
                    placeholder="5000000"
                    value={newFundingRound.valuation || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, valuation: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {fundingRoundErrors.valuation && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.valuation}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Min Investment ($)</Label>
                  <Input
                    className={fundingRoundErrors.minInvestment ? "border-red-500" : ""}
                    type="number"
                    placeholder="1000"
                    value={newFundingRound.minInvestment || ''}
                    onChange={(e) => setNewFundingRound({ ...newFundingRound, minInvestment: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  {fundingRoundErrors.minInvestment && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.minInvestment}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Closes At (Optional)</Label>
                <Input
                  className={fundingRoundErrors.closesAt ? "border-red-500" : ""}
                  type="date"
                  value={newFundingRound.closesAt}
                  onChange={(e) => setNewFundingRound({ ...newFundingRound, closesAt: e.target.value })}
                />
                {fundingRoundErrors.closesAt && <p className="text-xs text-red-500 mt-1">{fundingRoundErrors.closesAt}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateFundingRound(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton type="submit" disabled={submitting} text={submitting ? 'Creating...' : 'Create Round'} className="w-40" />
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
                        <span>Target: ₹{round.targetAmount.toLocaleString('en-IN')}</span>
                        <span>Raised: ₹{round.raisedAmount.toLocaleString('en-IN')}</span>
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

        {/* Investment Confirmations */}
        <Card className="mt-6 border-orange-500/20 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Investment Confirmations
            </CardTitle>
            <CardDescription>Finalize deals by confirming agreed terms independently.</CardDescription>
          </CardHeader>
          <CardContent>
            {confirmationLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : confirmations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic border rounded-lg border-dashed">
                <p>No investment confirmations in progress</p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmations.map((conf) => (
                  <div key={conf._id} className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-black/40 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={conf.investorId.avatar} />
                        <AvatarFallback>{conf.investorId.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{conf.investorId.name}</h4>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">Deal ID: {conf._id.substring(18)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{conf.startupId.name}</p>
                        <div className="flex gap-2 mt-2">
                          {conf.status === 'matched' ? (
                            <Badge className="bg-green-500 text-[10px] py-0 h-4">✅ Matched</Badge>
                          ) : conf.status === 'mismatched' ? (
                            <Badge className="bg-red-500 text-[10px] py-0 h-4">❌ Mismatch</Badge>
                          ) : conf.status === 'founder_submitted' ? (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-500 text-orange-500">Awaiting Investor</Badge>
                          ) : conf.status === 'investor_submitted' ? (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-500 text-blue-500">Awaiting You</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4">Awaiting Both</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Terms</p>
                        {conf.status === 'matched' || conf.status === 'mismatched' ? (
                          <div className="text-xs font-bold text-primary">
                            ₹{conf.founderAmount?.toLocaleString('en-IN')} / {conf.founderEquity}%
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">Hidden until match</div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant={conf.status === 'investor_submitted' || conf.status === 'mismatched' ? 'default' : 'outline'}
                        onClick={() => {
                          setConfirmTerms({ 
                            amount: conf.founderAmount?.toString() || '', 
                            equity: conf.founderEquity?.toString() || '' 
                          });
                          setShowConfirmModal(conf);
                        }}
                        disabled={conf.status === 'matched' || conf.status === 'founder_submitted'}
                      >
                        {conf.status === 'matched' ? 'Confirmed' : conf.status === 'founder_submitted' ? 'Submitted' : 'Confirm Terms'}
                      </Button>
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

  // Pitch Requests
  if (activeTab === 'pitch-requests') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pitch Requests</h1>
            <p className="text-sm text-muted-foreground">Investors interested in viewing your pitch deck</p>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pitches.filter(p => p.pitchStatus === 'requested').length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({pitches.filter(p => p.pitchStatus === 'sent').length})</TabsTrigger>
            <TabsTrigger value="all">All ({pitches.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pitchLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : pitches.filter(p => p.pitchStatus === 'requested').length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No pending pitch requests</CardContent></Card>
            ) : (
              pitches.filter(p => p.pitchStatus === 'requested').map((pitch) => (
                <Card key={pitch._id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={pitch.investorId.avatar} />
                          <AvatarFallback>{pitch.investorId.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{pitch.investorId.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{pitch.startupId.name} • {formatDistanceToNow(new Date(pitch.createdAt))} ago</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Level {pitch.investorId.verificationLevel} Investor</Badge>
                            {pitch.investorId.verificationLevel >= 3 && <AlloySphereVerifiedBadge verified={true} />}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleRejectPitch(pitch._id)}>Decline</Button>
                        <Button size="sm" onClick={() => setShowSendPitchModal(pitch)}>Send Pitch Deck</Button>
                      </div>
                    </div>
                    {pitch.message && (
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 border italic text-sm text-muted-foreground">
                        &quot;{pitch.message}&quot;
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4 mt-6">
            {pitches.filter(p => p.pitchStatus === 'sent').map((pitch) => (
              <Card key={pitch._id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pitch.investorId.avatar} />
                        <AvatarFallback>{pitch.investorId.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{pitch.investorId.name}</h3>
                        <p className="text-sm text-muted-foreground">Sent {formatDistanceToNow(new Date(pitch.pitchSentAt!))} ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500">Pitch Sent</Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted p-1 px-2 rounded-full">
                              <Clock className="h-3 w-3" />
                              2h Timer Active
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Investment confirmation will be enabled 2 hours after sending the pitch.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Achievements Tab
  if (activeTab === 'achievements') {
    const typeIcons: Record<string, any> = {
      funding: '💰',
      product: '🚀',
      growth: '📈',
      milestone: '🎯',
    };
    const typeColors: Record<string, string> = {
      funding: 'from-green-400/20 to-green-600/10 border-green-200 dark:border-green-800/30',
      product: 'from-blue-400/20 to-blue-600/10 border-blue-200 dark:border-blue-800/30',
      growth: 'from-purple-400/20 to-purple-600/10 border-purple-200 dark:border-purple-800/30',
      milestone: 'from-orange-400/20 to-orange-600/10 border-orange-200 dark:border-orange-800/30',
    };

    const handleCreateAchievement = async () => {
      if (!newAchievement.startupId && startups.length > 0) {
        newAchievement.startupId = startups[0]._id;
      }
      if (!newAchievement.startupId || !newAchievement.title || !newAchievement.description) {
        toast.error('Please fill in all required fields');
        return;
      }
      setAchievementSubmitting(true);
      try {
        const res = await fetch('/api/achievements', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAchievement),
        });
        if (res.ok) {
          toast.success('Achievement posted!');
          setShowCreateAchievement(false);
          setNewAchievement({ title: '', description: '', type: 'milestone', visibility: 'public', startupId: '' });
          fetchAchievements();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to create achievement');
        }
      } catch {
        toast.error('Something went wrong');
      }
      setAchievementSubmitting(false);
    };

    return (
      <div className="space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" style={{ color: 'var(--sea-green)' }} /> Achievements</h1>
            <p className="text-sm text-muted-foreground mt-1">Celebrate and share your startup milestones</p>
          </div>
          <Button onClick={() => setShowCreateAchievement(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Post Achievement
          </Button>
        </div>

        {achievementsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : achievements.length === 0 ? (
          <Card className="border-dashed bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
              <p className="text-muted-foreground text-center text-sm mb-4">Post your first achievement to track and celebrate startup progress</p>
              <Button onClick={() => setShowCreateAchievement(true)} size="sm" variant="outline">Post Achievement</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((ach: any) => (
              <div key={ach._id} className={`p-5 rounded-xl border bg-gradient-to-br ${typeColors[ach.type] || typeColors.milestone} transition-all hover:-translate-y-0.5 hover:shadow-lg`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{typeIcons[ach.type] || '🎯'}</span>
                  <div className="flex items-center gap-2">
                    {ach.visibility === 'private' && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    <Badge variant="outline" className="text-[10px] capitalize">{ach.type}</Badge>
                  </div>
                </div>
                <h3 className="font-bold text-sm mb-1">{ach.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{ach.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-muted-foreground font-medium">{ach.startupName}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(ach.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Achievement Dialog */}
        <Dialog open={showCreateAchievement} onOpenChange={setShowCreateAchievement}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Post Achievement</DialogTitle>
              <DialogDescription>Share a milestone or accomplishment with your network</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {startups.length > 1 && (
                <div className="space-y-2">
                  <Label>Startup</Label>
                  <Select value={newAchievement.startupId || startups[0]?._id} onValueChange={(v) => setNewAchievement({ ...newAchievement, startupId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {startups.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={newAchievement.title} onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })} placeholder="e.g., Secured $500K in Seed Funding" />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={newAchievement.description} onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })} placeholder="Describe this achievement..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newAchievement.type} onValueChange={(v) => setNewAchievement({ ...newAchievement, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funding">💰 Funding</SelectItem>
                      <SelectItem value="product">🚀 Product</SelectItem>
                      <SelectItem value="growth">📈 Growth</SelectItem>
                      <SelectItem value="milestone">🎯 Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={newAchievement.visibility} onValueChange={(v) => setNewAchievement({ ...newAchievement, visibility: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateAchievement(false)}>Cancel</Button>
              <Button onClick={handleCreateAchievement} disabled={achievementSubmitting}>
                {achievementSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // AI Insights
  if (activeTab === 'ai-insights') {
    return (
      <div className="space-y-6 page-enter relative">
        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.06) 0%, rgba(0,71,171,0.04) 50%, rgba(255,255,255,0.8) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(46,139,87,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-semibold">AI Insights</h1>
            <p className="text-muted-foreground mt-1">Smart matching and analytics tailored for your startup</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Analytics */}
          <div className="space-y-6">
            <AIAnalyticsPanel role="founder" />
          </div>

          {/* Right Column: Matching */}
          <div className="space-y-6">
            <AIMatchingPanel type="talent-startup" onConnect={(id) => useUIStore.getState().setActiveTab('search')} />
          </div>
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

