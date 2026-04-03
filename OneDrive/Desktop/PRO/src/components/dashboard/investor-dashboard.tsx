/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import { safeLocalStorage, STORAGE_KEYS } from '@/lib/client-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AIMatchingPanel } from '@/components/ai/ai-matching-panel';
import { AIAnalyticsPanel } from '@/components/ai/ai-analytics-panel';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, Building2, DollarSign, Users, Zap, Star,
  Filter, ExternalLink, Loader2, Heart, CheckCircle2,
  Shield, Bell, Settings as SettingsIcon, Award, Search, Lock,
  Target, Briefcase, Clock, FileText, Send, Edit, Save, X
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';

interface FundingRound {
  _id: string;
  startupId: {
    _id: string;
    name: string;
    industry: string;
    stage: string;
    logo?: string;

    founderId?: { _id: string; name: string };
  };
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

interface Investment {
  _id: string;
  startupId: {
    _id: string;
    name: string;
    industry: string;
    logo?: string;
  };
  fundingRoundId: {
    _id: string;
    roundName: string;
    status: string;
  };
  amount: number;
  equityPercent: number;
  status: string;
  createdAt: string;
}

interface Pitch {
  _id: string;
  startupId: { _id: string; name: string; industry: string; logo?: string };
  investorId: string;
  pitchStatus: 'requested' | 'sent' | 'rejected' | 'invested' | 'expired';
  message?: string;
  pitchDocumentUrl?: string;
  pitchMessage?: string;
  pitchSentAt?: string;
  createdAt: string;
}

interface InvestmentConfirmation {
  _id: string;
  startupId: { _id: string; name: string; logo?: string };
  investorId: { _id: string; name: string };
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

interface Startup {
  _id: string;
  name: string;
  industry: string;
  stage: string;

  fundingStage: string;
  logo?: string;
  description?: string;
  vision?: string;
  founderId?: { _id: string; name: string };
}

interface InvestorDashboardProps {
  activeTab: string;
}

const industries = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education',
  'Real Estate', 'Food & Beverage', 'Travel', 'Entertainment', 'Other'
];

const stages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];

export function InvestorDashboard({ activeTab }: InvestorDashboardProps) {
  const { user, setUser } = useAuthStore();
  const { setActiveTab: setGlobalTab } = useUIStore();

  // State
  const [loading, setLoading] = useState(true);
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [confirmations, setConfirmations] = useState<InvestmentConfirmation[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  // Modal states
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<FundingRound | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<InvestmentConfirmation | null>(null);
  const [confirmTerms, setConfirmTerms] = useState({ amount: '', equity: '' });

  // Form states
  const [investAmount, setInvestAmount] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    bio: user?.bio || '',
    location: user?.location || '',
    investmentThesis: user?.investmentThesis || '',
    preferredIndustries: user?.preferredIndustries || [],
    stagePreference: user?.stagePreference || [],
    ticketSizeMin: user?.ticketSize?.min || 10000,
    ticketSizeMax: user?.ticketSize?.max || 100000,
    accreditationStatus: user?.accreditationStatus || 'pending',
  });

  // Settings
  const [settings, setSettings] = useState({
    emailNotifications: true,
    dealAlerts: true,
    investmentUpdates: true,
    marketingEmails: false,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {

    setLoading(true);

    try {
      // Fetch funding rounds
      const roundsRes = await fetch('/api/funding/create-round?status=open', {
        credentials: 'include',
      });
      if (roundsRes.ok) {
        const data = await roundsRes.json();
        setFundingRounds(Array.isArray(data.rounds) ? data.rounds.filter(r => r && r.startupId) : []);
      } else {
        setFundingRounds([]);
      }

      // Fetch user investments
      const investmentsRes = await fetch('/api/funding/invest', {
        credentials: 'include',
      });
      if (investmentsRes.ok) {
        const data = await investmentsRes.json();
        setInvestments(Array.isArray(data.investments) ? data.investments.filter(i => i && i.startupId && i.fundingRoundId) : []);
      } else {
        setInvestments([]);
      }

      // Fetch pitches (investor's own requests)
      const pitchesRes = await fetch('/api/pitches?investor=true', {
        credentials: 'include',
      });
      if (pitchesRes.ok) {
        const data = await pitchesRes.json();
        setPitches(Array.isArray(data.pitches) ? data.pitches : []);
      } else {
        setPitches([]);
      }

      // Fetch favorites
      const favoritesRes = await fetch('/api/favorites', {
        credentials: 'include',
      });
      if (favoritesRes.ok) {
        const data = await favoritesRes.json();
        setFavorites(data.favoriteIds || []);
      }

      // Fetch startups for deal flow
      const startupsRes = await fetch('/api/search/startups?limit=20', {
        credentials: 'include',
      });
      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartups(Array.isArray(data.startups) ? data.startups.filter(s => s && s.name) : []);
      } else {
        setStartups([]);
      }
    } catch (error) {
      console.error('Error fetching investor data:', error);
      setFundingRounds([]);
      setInvestments([]);
      setPitches([]);
      setStartups([]);
    }

    setLoading(false);
  }, []);

  const fetchPitches = useCallback(async () => {
    setPitchLoading(true);
    try {
      const res = await fetch('/api/pitches?investor=true', { credentials: 'include' });
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
    fetchData();
    fetchPitches();
    fetchConfirmations();
  }, [fetchData, fetchPitches, fetchConfirmations]);

  // Calculate portfolio stats
  const portfolioStats = {
    totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
    totalEquity: investments.reduce((sum, inv) => sum + inv.equityPercent, 0),
    activeInvestments: investments.filter(i => i.status === 'completed').length,
    pendingInvestments: investments.filter(i => i.status === 'pending' || i.status === 'processing').length,
    pendingPitches: pitches.filter(p => p.pitchStatus === 'requested').length,
    receivedPitches: pitches.filter(p => p.pitchStatus === 'sent').length,
    pendingConfirmations: confirmations.filter(c => c.status === 'awaiting_entries' || c.status === 'founder_submitted' || c.status === 'mismatched').length,
  };

  // Handle favorite toggle
  const toggleFavorite = async (startupId: string) => {
    try {
      const res = await fetch('/api/favorites', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startupId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isFavorite) {
          setFavorites(prev => [...prev, startupId]);
          toast.success('Added to watchlist');
        } else {
          setFavorites(prev => prev.filter(id => id !== startupId));
          toast.success('Removed from watchlist');
        }
      }
    } catch {
      toast.error('Failed to update watchlist');
    }
  };

  // Handle request pitch
  const handleRequestPitch = async () => {
    if (!selectedStartup) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/pitches', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupId: selectedStartup._id,
          message: accessMessage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Pitch request sent!');
        setShowAccessModal(false);
        setAccessMessage('');
        fetchPitches();
      } else {
        toast.error(data.error || 'Failed to send request');
      }
    } catch {
      toast.error('Failed to send request');
    }

    setSubmitting(false);
  };

  const handleSubmitInvestmentTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirmModal) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/investment-confirmation/investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationId: showConfirmModal._id,
          investorAmount: Number(confirmTerms.amount),
          investorEquity: Number(confirmTerms.equity)
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.matched ? 'Investment confirmed! Match found. 🎉' : 'Details submitted. Awaiting founder entry.');
        setShowConfirmModal(null);
        setConfirmTerms({ amount: '', equity: '' });
        fetchConfirmations();
        fetchData(); 
      } else {
        toast.error(data.error || 'Failed to submit terms');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle contact founder for investment
  const handleContactFounder = (founderId?: { _id: string; name: string }, startupName?: string) => {
    if (!founderId) {
      toast.error('Founder information not available');
      return;
    }
    // Navigate to messages with this founder
    safeLocalStorage.setItem(STORAGE_KEYS.MESSAGE_USER, founderId._id);
    setGlobalTab('messages');
    window.dispatchEvent(new CustomEvent('navigateToMessages'));
    setShowInvestModal(false);
    toast.success(`Opening conversation with ${founderId.name} about ${startupName || 'investment'}`);
  };

  // Handle profile update
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
          location: profile.location,
          investmentThesis: profile.investmentThesis,
          preferredIndustries: profile.preferredIndustries,
          stagePreference: profile.stagePreference,
          ticketSize: { min: profile.ticketSizeMin, max: profile.ticketSizeMax },
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
    setProfile({
      bio: user?.bio || '',
      location: user?.location || '',
      investmentThesis: user?.investmentThesis || '',
      preferredIndustries: user?.preferredIndustries || [],
      stagePreference: user?.stagePreference || [],
      ticketSizeMin: user?.ticketSize?.min || 10000,
      ticketSizeMax: user?.ticketSize?.max || 100000,
      accreditationStatus: user?.accreditationStatus || 'pending',
    });
    setIsEditing(false);
  };

  // Check if pitch already requested
  const getPitchStatus = (startupId: string) => {
    const pitch = pitches.find(p => p.startupId?._id === startupId);
    return pitch?.pitchStatus || null;
  };

  // View startup detail page
  const router = useRouter();
  const viewStartup = (startupId: string) => {
    router.push(`/startup/${startupId}`);
  };

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    const dueDiligenceCount = pitches.filter(p => p.pitchStatus === 'requested' || p.pitchStatus === 'sent').length;

    return (
      <div className="space-y-6 page-enter relative">
        {/* Header with glassmorphism */}
        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.06) 0%, rgba(0,71,171,0.04) 50%, rgba(255,255,255,0.8) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(46,139,87,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground mt-1">Discover your next investment opportunity</p>
          </div>
          <Button onClick={() => setGlobalTab('search')} className="rounded-xl px-5" style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0066CC 100%)', boxShadow: '0 4px 14px rgba(0,71,171,0.25)' }}>
            <Search className="h-4 w-4 mr-2" />
            Discover Startups
          </Button>
        </div>



        {/* Stats Cards — Premium Glassmorphic */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: '1000px' }}>
          {[
            { title: 'Active Due Diligence', value: dueDiligenceCount, sub: 'Approved or pending access', icon: FileText, iconColor: '#F97316', bg: 'rgba(249,115,22,0.06)' },
            { title: 'Average Equity', value: `${(portfolioStats.totalEquity / Math.max(portfolioStats.activeInvestments, 1)).toFixed(2)}%`, sub: 'Per investment', icon: Target, iconColor: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
            { title: 'Total Invested', value: `₹${portfolioStats.totalInvested.toLocaleString('en-IN')}`, sub: `${portfolioStats.activeInvestments} investments`, icon: TrendingUp, iconColor: '#2E8B57', bg: 'rgba(46,139,87,0.06)' },
            { title: 'Portfolio Equity', value: `${portfolioStats.totalEquity.toFixed(4)}%`, sub: 'Across all investments', icon: Briefcase, iconColor: '#2A2623', bg: 'rgba(42,38,35,0.04)' },
            { title: 'Open Rounds', value: fundingRounds.length, sub: 'Available for investment', icon: Building2, iconColor: '#0047AB', bg: 'rgba(0,71,171,0.06)' },
          ].map((stat, index) => (
            <div key={stat.title} className="group rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg" style={{ background: `linear-gradient(135deg, ${stat.bg} 0%, rgba(255,255,255,0.9) 100%)`, backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transformStyle: 'preserve-3d', animationDelay: `${index * 80}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: stat.bg }}>
                  {typeof stat.icon === 'string' ? (
                    <span style={{ color: stat.iconColor }}>{stat.icon}</span>
                  ) : (
                    <stat.icon className="h-4 w-4" style={{ color: stat.iconColor }} />
                  )}
                </div>
              </div>
              <div className="text-xl font-semibold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Pending Pitch Requests / Confirmations Alerts */}
        {(portfolioStats.pendingPitches > 0 || portfolioStats.pendingConfirmations > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {portfolioStats.pendingPitches > 0 && (
              <Card className="border-blue-500/50 bg-blue-500/5">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Pitches Requested</p>
                      <p className="text-xs text-muted-foreground">
                        {portfolioStats.pendingPitches} request(s) awaiting founder response
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setGlobalTab('dealflow')}>
                    View Status
                  </Button>
                </CardContent>
              </Card>
            )}
            {portfolioStats.pendingConfirmations > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5 shadow-lg shadow-orange-500/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-semibold text-sm">Action Required: Confirmation</p>
                      <p className="text-xs text-muted-foreground">
                        {portfolioStats.pendingConfirmations} investment(s) awaiting your term entry
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setGlobalTab('investments')} className="bg-orange-600 hover:bg-orange-700 text-white">
                    Confirm Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.4)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Open Funding Rounds</CardTitle>
                <CardDescription>Startups currently raising capital</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setGlobalTab('investments')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fundingRounds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No open funding rounds available</p>
                <Button variant="outline" className="mt-4" onClick={() => setGlobalTab('search')}>
                  Discover Startups
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fundingRounds.slice(0, 5).map((round) => (
                  <div key={round._id} className="flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,250,248,0.9) 100%)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-sm transition-transform duration-300 group-hover:scale-105" style={{ background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)', boxShadow: '0 4px 12px rgba(46,139,87,0.2)' }}>
                        {round.startupId.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">{round.startupId.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{round.startupId.industry}</Badge>
                          <Badge variant="outline">{round.roundName}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="font-semibold">₹{round.targetAmount.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">
                          {((round.raisedAmount / round.targetAmount) * 100).toFixed(0)}% filled
                        </p>
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (round.startupId.founderId) {
                                    handleContactFounder(round.startupId.founderId, round.startupId.name);
                                  } else {
                                    setSelectedRound(round);
                                    setShowInvestModal(true);
                                  }
                                }}
                                disabled={(user?.verificationLevel || 0) < 3}
                              >
                                {(user?.verificationLevel || 0) < 3 ? <Lock className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                                Contact Founder
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {(user?.verificationLevel || 0) < 3 && (
                            <TooltipContent>
                              <p>Complete Level 3 verification to contact founders.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Founder Modal (fallback when founder info is missing from the round) */}
        <Dialog open={showInvestModal} onOpenChange={setShowInvestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact {selectedRound?.startupId.name} Founder</DialogTitle>
              <DialogDescription>
                {selectedRound?.roundName} — Request a pitch and discuss investment terms directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.targetAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Raised:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.raisedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity:</span>
                  <span className="ml-2 font-medium">{selectedRound?.equityOffered}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valuation:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.valuation.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> Message the founder to request a pitch. All payments are handled off-platform between you and the startup. Investment terms will be managed here on AlloySphere.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvestModal(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton
                  text="Message Founder"
                  onClick={() => {
                    if (selectedRound?.startupId.founderId) {
                      handleContactFounder(selectedRound.startupId.founderId, selectedRound.startupId.name);
                    } else {
                      toast.error('Founder information not available for this startup');
                    }
                  }}
                  className="w-44"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Deal Flow
  if (activeTab === 'dealflow') {
    return (
      <div className="space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deal Flow</h1>
            <p className="text-muted-foreground">Discover startups and request access to detailed information</p>
          </div>
        </div>

        {/* Pitch Requests Summary */}
        {pitches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-primary">Your Pitch Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{portfolioStats.pendingPitches} Awaiting Pitch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{portfolioStats.receivedPitches} Pitches Received</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : startups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No startups available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '0.1s' }}>
            {startups.map((startup) => {
              const pitchStatus = getPitchStatus(startup._id);

              return (
                <Card key={startup._id} className="hover:border-primary/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={startup.logo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {startup.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{startup.name}</CardTitle>
                          <CardDescription>{startup.industry}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{startup.fundingStage}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {startup.description || startup.vision}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stage</span>
                        <span className="font-medium capitalize">{startup.stage}</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          variant="outline"
                          onClick={() => viewStartup(startup._id)}
                        >
                          View Profile
                        </Button>
                        <Button
                          variant={pitchStatus === 'sent' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (!pitchStatus || pitchStatus === 'rejected') {
                              setSelectedStartup(startup);
                              setShowAccessModal(true);
                            }
                          }}
                          disabled={pitchStatus === 'requested' || pitchStatus === 'sent'}
                        >
                          {pitchStatus === 'sent' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : pitchStatus === 'requested' ? (
                            <Clock className="h-4 w-4 text-blue-500" />
                          ) : (
                            'Request Pitch'
                          )}
                        </Button>
                        <Button
                          variant={favorites.includes(startup._id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFavorite(startup._id)}
                        >
                          <Heart className={`h-4 w-4 ${favorites.includes(startup._id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Access Request Modal */}
        <Dialog open={showAccessModal} onOpenChange={setShowAccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Pitch</DialogTitle>
              <DialogDescription>
                Send a request to the founder of <span className="font-semibold">{selectedStartup?.name}</span> to receive their pitch deck.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={accessMessage}
                  onChange={(e) => setAccessMessage(e.target.value)}
                  placeholder="Introduce yourself and explain your interest in this startup..."
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">{accessMessage.length}/500</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAccessModal(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton
                  onClick={handleRequestPitch}
                  disabled={submitting}
                  text={submitting ? 'Sending...' : 'Send Request'}
                  className="w-40"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div >
    );
  }

  // Portfolio
  if (activeTab === 'portfolio') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Portfolio</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{portfolioStats.totalInvested.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolioStats.totalEquity.toFixed(4)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolioStats.activeInvestments}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Investment History</CardTitle>
            <CardDescription>Your startup investments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No investments yet</p>
                <p className="text-sm mt-2">Start exploring funding rounds to make your first investment</p>
                <Button variant="outline" className="mt-4" onClick={() => setGlobalTab('investments')}>
                  Explore Opportunities
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={inv.startupId.logo} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {inv.startupId.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{inv.startupId.name}</h3>
                        <p className="text-sm text-muted-foreground">{inv.equityPercent.toFixed(4)}% equity</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Invested</p>
                        <p className="font-medium">₹{inv.amount.toLocaleString('en-IN')}</p>
                      </div>
                      <Badge className={
                        inv.status === 'completed' ? 'bg-green-500' :
                          inv.status === 'pending' ? 'bg-yellow-500' :
                            inv.status === 'processing' ? 'bg-blue-500' :
                              'bg-red-500'
                      }>
                        {inv.status}
                      </Badge>
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

  // Investments
  if (activeTab === 'investments') {
    const openRounds = fundingRounds.filter(r => r.status === 'open');
    const completedInvestments = investments.filter(i => i.status === 'completed');
    const pendingInvestments = investments.filter(i => i.status === 'pending' || i.status === 'processing');

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Investments</h1>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Rounds ({openRounds.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingInvestments.length})</TabsTrigger>
            <TabsTrigger value="history">History ({completedInvestments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : openRounds.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active funding rounds</p>
                  <Button variant="outline" className="mt-4" onClick={() => setGlobalTab('search')}>
                    Discover Startups
                  </Button>
                </CardContent>
              </Card>
            ) : (
              openRounds.map((round) => (
                <Card key={round._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={round.startupId.logo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {round.startupId.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{round.startupId.name} - {round.roundName}</h3>
                          <p className="text-sm text-muted-foreground">
                            ₹{round.raisedAmount.toLocaleString('en-IN')} / ₹{round.targetAmount.toLocaleString('en-IN')} raised
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <Progress
                            value={(round.raisedAmount / round.targetAmount) * 100}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {((round.raisedAmount / round.targetAmount) * 100).toFixed(0)}%
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRound(round);
                            setInvestAmount(round.minInvestment.toString());
                            setShowInvestModal(true);
                          }}
                        >
                          Invest
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {/* Investment Confirmations Section */}
            {confirmations.length > 0 && (
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 px-1">
                  <Shield className="h-5 w-5 text-orange-500" />
                  <h3 className="font-bold text-lg">Confirmations Required</h3>
                </div>
                {confirmations.map((conf) => (
                  <Card key={conf._id} className="border-orange-500/20 bg-orange-500/5 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-orange-500/20">
                            <AvatarImage src={conf.startupId.logo} />
                            <AvatarFallback>{conf.startupId.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold">{conf.startupId.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {conf.status === 'mismatched' ? (
                                <Badge variant="destructive" className="text-[10px] py-0 h-4">Mismatch Flagged</Badge>
                              ) : conf.status === 'investor_submitted' ? (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-500 text-orange-500">Awaiting Founder</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4">Awaiting Your Entry</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground italic">
                                {conf.expiresAt ? `Expires ${formatDistanceToNow(new Date(conf.expiresAt))} ago` : 'Confirmation period active'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            setConfirmTerms({ 
                              amount: conf.investorAmount?.toString() || '', 
                              equity: conf.investorEquity?.toString() || '' 
                            });
                            setShowConfirmModal(conf);
                          }}
                          disabled={conf.status === 'investor_submitted' || conf.status === 'matched'}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          {conf.status === 'investor_submitted' ? 'Submitted' : 'Confirm Terms'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingInvestments.length === 0 && confirmations.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No pending investments</p>
                </CardContent>
              </Card>
            ) : (
              pendingInvestments.map((inv) => (
                <Card key={inv._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={inv.startupId.logo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {inv.startupId.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{inv.startupId.name}</h3>
                          <p className="text-sm text-muted-foreground">₹{inv.amount.toLocaleString('en-IN')} for {inv.equityPercent.toFixed(4)}% equity</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500">Processing</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            {completedInvestments.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No completed investments</p>
                </CardContent>
              </Card>
            ) : (
              completedInvestments.map((inv) => (
                <Card key={inv._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={inv.startupId.logo} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {inv.startupId.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{inv.startupId.name}</h3>
                          <p className="text-sm text-muted-foreground">₹{inv.amount.toLocaleString('en-IN')} for {inv.equityPercent.toFixed(4)}% equity</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">Completed</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Contact Founder Modal */}
        <Dialog open={showInvestModal} onOpenChange={setShowInvestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact {selectedRound?.startupId.name} Founder</DialogTitle>
              <DialogDescription>
                {selectedRound?.roundName} — Request a pitch and discuss investment terms directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.targetAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Raised:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.raisedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity:</span>
                  <span className="ml-2 font-medium">{selectedRound?.equityOffered}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valuation:</span>
                  <span className="ml-2 font-medium">₹{selectedRound?.valuation.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>How it works:</strong> Message the founder to request a pitch. All payments are handled off-platform between you and the startup. Investment terms will be managed here on AlloySphere.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvestModal(false)}>
                  Cancel
                </Button>
                <InteractiveHoverButton
                  text="Message Founder"
                  onClick={() => {
                    if (selectedRound?.startupId.founderId) {
                      handleContactFounder(selectedRound.startupId.founderId, selectedRound.startupId.name);
                    } else {
                      toast.error('Founder information not available for this startup');
                    }
                  }}
                  className="w-44"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // AI Insights
  if (activeTab === 'ai-insights') {
    return (
      <div className="space-y-6 page-enter relative">
        <div className="flex items-center justify-between p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.06) 0%, rgba(59,130,246,0.04) 50%, rgba(255,255,255,0.8) 100%)', backdropFilter: 'blur(20px)', border: '1px solid rgba(88,28,135,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div>
            <h1 className="text-xl font-semibold">AI Investment Insights</h1>
            <p className="text-muted-foreground mt-1">Smart deal flow matching and portfolio analytics tailored for you</p>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Analytics */}
          <div className="space-y-6">
            <AIAnalyticsPanel role="investor" />
          </div>

          {/* Right Column: Matching */}
          <div className="space-y-6">
            <AIMatchingPanel type="investor-startup" onConnect={(id) => useUIStore.getState().setActiveTab('search')} />
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
          <h1 className="text-2xl font-bold">Investor Profile</h1>
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
              <CardTitle>Investment Profile</CardTitle>
              <CardDescription>Your investment preferences and thesis</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell founders about yourself..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Investment Thesis</Label>
                  <Textarea
                    value={profile.investmentThesis}
                    onChange={(e) => setProfile({ ...profile, investmentThesis: e.target.value })}
                    placeholder="Describe your investment philosophy and what you look for in startups..."
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Accreditation Status</Label>
                    <Select
                      value={profile.accreditationStatus}
                      onValueChange={(v) => setProfile({ ...profile, accreditationStatus: v })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Verification</SelectItem>
                        <SelectItem value="verified">Accredited Investor</SelectItem>
                        <SelectItem value="qualified">Qualified Purchaser</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ticket Size Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Minimum ($)</Label>
                      <Input
                        type="number"
                        value={profile.ticketSizeMin}
                        onChange={(e) => setProfile({ ...profile, ticketSizeMin: parseInt(e.target.value) || 0 })}
                        placeholder="10000"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Maximum ($)</Label>
                      <Input
                        type="number"
                        value={profile.ticketSizeMax}
                        onChange={(e) => setProfile({ ...profile, ticketSizeMax: parseInt(e.target.value) || 0 })}
                        placeholder="100000"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Industries</Label>
                  <div className="flex flex-wrap gap-2">
                    {industries.map((ind) => (
                      <Badge
                        key={ind}
                        variant={profile.preferredIndustries.includes(ind) ? 'default' : 'outline'}
                        className={`cursor-pointer ${!isEditing ? 'cursor-default' : ''}`}
                        onClick={() => {
                          if (!isEditing) return;
                          setProfile(prev => ({
                            ...prev,
                            preferredIndustries: prev.preferredIndustries.includes(ind)
                              ? prev.preferredIndustries.filter(i => i !== ind)
                              : [...prev.preferredIndustries, ind]
                          }));
                        }}
                      >
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Stages</Label>
                  <div className="flex flex-wrap gap-2">
                    {stages.map((stage) => (
                      <Badge
                        key={stage}
                        variant={profile.stagePreference.includes(stage) ? 'default' : 'outline'}
                        className={`cursor-pointer capitalize ${!isEditing ? 'cursor-default' : ''}`}
                        onClick={() => {
                          if (!isEditing) return;
                          setProfile(prev => ({
                            ...prev,
                            stagePreference: prev.stagePreference.includes(stage)
                              ? prev.stagePreference.filter(s => s !== stage)
                              : [...prev.stagePreference, stage]
                          }));
                        }}
                      >
                        {stage.replace('-', ' ')}
                      </Badge>
                    ))}
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

        {/* Investment Confirmation Modal for Investor */}
        <Dialog open={!!showConfirmModal} onOpenChange={(open) => !open && setShowConfirmModal(null)}>
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl text-foreground">
            <div className="p-6 pb-0" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.06) 100%)' }}>
              <DialogHeader>
                <div className="h-12 w-12 rounded-2xl bg-white/80 backdrop-blur shadow-sm flex items-center justify-center mb-4 border border-white/40">
                  <Shield className="h-6 w-6 text-orange-500" />
                </div>
                <DialogTitle className="text-xl">Submit Investment Details</DialogTitle>
                <DialogDescription className="text-muted-foreground/80">
                  Enter the final terms for your investment in {showConfirmModal?.startupId.name}.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-6 pt-6">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6">
                <p className="text-xs text-orange-700 font-bold flex items-center gap-2 mb-1">
                  <Zap className="h-3 w-3" /> Double Confirmation System
                </p>
                <p className="text-[11px] text-orange-700/80 leading-relaxed">
                  Both you and the founder must enter these terms independently. If they match <strong>exactly</strong>, the investment will be officially recorded on-platform.
                </p>
              </div>
              <form onSubmit={handleSubmitInvestmentTerms} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount ($) *</Label>
                    <div className="relative group">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                      <Input 
                        type="number" 
                        placeholder="e.g. 50000" 
                        className="pl-10 h-10 transition-all border-muted focus:border-primary/50 bg-background"
                        value={confirmTerms.amount}
                        onChange={(e) => setConfirmTerms({...confirmTerms, amount: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equity (%) *</Label>
                    <div className="relative group">
                      <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-primary" />
                      <Input 
                        type="number" 
                        step="0.001"
                        placeholder="e.g. 2.5" 
                        className="pl-10 h-10 transition-all border-muted focus:border-primary/50 bg-background"
                        value={confirmTerms.equity}
                        onChange={(e) => setConfirmTerms({...confirmTerms, equity: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setShowConfirmModal(null)} className="h-10">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="h-10 px-8 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 text-white border-none transition-all">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirm Details
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
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
          <p className="text-muted-foreground">Select a section from the sidebar</p>
        </CardContent>
      </Card>
    </div>
  );
}


