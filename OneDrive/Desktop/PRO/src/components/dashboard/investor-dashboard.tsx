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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Target, Briefcase, Clock, FileText, Send, Edit, Save, X,
  Shield, Bell, Settings as SettingsIcon, Award, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { safeLocalStorage, STORAGE_KEYS } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';

interface FundingRound {
  _id: string;
  startupId: {
    _id: string;
    name: string;
    industry: string;
    stage: string;
    logo?: string;
    trustScore?: number;
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

interface AccessRequest {
  _id: string;
  startupId: {
    _id: string;
    name: string;
    industry: string;
    stage?: string;
    logo?: string;
    vision?: string;
  };
  status: string;
  message?: string;
  createdAt: string;
}

interface Startup {
  _id: string;
  name: string;
  industry: string;
  stage: string;
  trustScore: number;
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
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  
  // Modal states
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<FundingRound | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  
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
        setFundingRounds(data.rounds || []);
      }

      // Fetch user investments
      const investmentsRes = await fetch('/api/funding/invest', {
          credentials: 'include',
      });
      if (investmentsRes.ok) {
        const data = await investmentsRes.json();
        setInvestments(data.investments || []);
      }

      // Fetch access requests (investor's own requests)
      const accessRes = await fetch('/api/funding/request-access', {
          credentials: 'include',
      });
      if (accessRes.ok) {
        const data = await accessRes.json();
        setAccessRequests(data.requests || []);
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
        setStartups(data.startups || []);
      }
    } catch (error) {
      console.error('Error fetching investor data:', error);
      toast.error('Failed to load data');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate portfolio stats
  const portfolioStats = {
    totalInvested: investments.reduce((sum, inv) => sum + inv.amount, 0),
    totalEquity: investments.reduce((sum, inv) => sum + inv.equityPercent, 0),
    activeInvestments: investments.filter(i => i.status === 'completed').length,
    pendingInvestments: investments.filter(i => i.status === 'pending' || i.status === 'processing').length,
    pendingAccessRequests: accessRequests.filter(r => r.status === 'pending').length,
    approvedAccess: accessRequests.filter(r => r.status === 'approved').length,
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

  // Handle request access
  const handleRequestAccess = async () => {
    if (!selectedStartup) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/funding/request-access', {
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
        toast.success('Access request sent!');
        setShowAccessModal(false);
        setAccessMessage('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to send request');
      }
    } catch {
      toast.error('Failed to send request');
    }

    setSubmitting(false);
  };

  // Handle invest
  const handleInvest = async () => {
    if (!selectedRound || !investAmount) return;
    
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < selectedRound.minInvestment) {
      toast.error(`Minimum investment is $${selectedRound.minInvestment.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/funding/invest', {
          credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundId: selectedRound._id,
          amount,
        }),
      });

      const data = await res.json();

      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error || 'Failed to initiate investment');
      }
    } catch {
      toast.error('Failed to initiate investment');
    }

    setSubmitting(false);
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

  // Check if access already requested
  const getAccessStatus = (startupId: string) => {
    const request = accessRequests.find(req => req.startupId?._id === startupId);
    return request?.status || null;
  };

  // View startup profile
  const viewStartup = (startupId: string) => {
    safeLocalStorage.setItem(STORAGE_KEYS.VIEW_PROFILE, startupId);
    setGlobalTab('profile');
  };

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Investor Dashboard</h1>
            <p className="text-muted-foreground">Discover your next investment opportunity</p>
          </div>
          <Button variant="outline" onClick={() => setGlobalTab('search')}>
            <Search className="h-4 w-4 mr-2" />
            Discover Startups
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolioStats.totalInvested.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{portfolioStats.activeInvestments} investments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Equity</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolioStats.totalEquity.toFixed(4)}%</div>
              <p className="text-xs text-muted-foreground">Across all investments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Rounds</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fundingRounds.length}</div>
              <p className="text-xs text-muted-foreground">Available for investment</p>
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

        {/* Pending Access Requests Alert */}
        {portfolioStats.pendingAccessRequests > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Pending Access Requests</p>
                  <p className="text-sm text-muted-foreground">
                    {portfolioStats.pendingAccessRequests} request(s) awaiting founder approval
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setGlobalTab('dealflow')}>
                View Requests
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Top Deals */}
        <Card>
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
                  <div key={round._id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold">
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
                        <p className="font-semibold">${round.targetAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {((round.raisedAmount / round.targetAmount) * 100).toFixed(0)}% filled
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm">{round.startupId.trustScore || 50}</span>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invest Modal */}
        <Dialog open={showInvestModal} onOpenChange={setShowInvestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invest in {selectedRound?.startupId.name}</DialogTitle>
              <DialogDescription>
                {selectedRound?.roundName} - Min: ${selectedRound?.minInvestment.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <span className="ml-2 font-medium">${selectedRound?.targetAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Raised:</span>
                  <span className="ml-2 font-medium">${selectedRound?.raisedAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity:</span>
                  <span className="ml-2 font-medium">{selectedRound?.equityOffered}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valuation:</span>
                  <span className="ml-2 font-medium">${selectedRound?.valuation.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Investment Amount ($)</Label>
                <Input
                  type="number"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder={`Min: $${selectedRound?.minInvestment.toLocaleString()}`}
                />
                {investAmount && selectedRound && (
                  <p className="text-xs text-muted-foreground">
                    Estimated equity: {((parseFloat(investAmount) / selectedRound.valuation) * 100).toFixed(4)}%
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvestModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvest} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Proceed to Payment
                </Button>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deal Flow</h1>
            <p className="text-muted-foreground">Discover startups and request access to detailed information</p>
          </div>
        </div>

        {/* Access Requests Summary */}
        {accessRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Access Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{portfolioStats.pendingAccessRequests} Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{portfolioStats.approvedAccess} Approved</span>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {startups.map((startup) => {
              const accessStatus = getAccessStatus(startup._id);
              
              return (
                <Card key={startup._id} className="hover:border-primary/50 transition-colors">
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
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trust Score</span>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-primary" />
                          <span>{startup.trustScore}</span>
                        </div>
                      </div>
                      <Progress value={startup.trustScore} className="h-2" />
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
                          variant={accessStatus === 'approved' ? 'default' : 'outline'} 
                          size="sm"
                          onClick={() => {
                            if (!accessStatus || accessStatus === 'rejected') {
                              setSelectedStartup(startup);
                              setShowAccessModal(true);
                            }
                          }}
                          disabled={accessStatus === 'pending' || accessStatus === 'approved'}
                        >
                          {accessStatus === 'approved' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : accessStatus === 'pending' ? (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          ) : (
                            'Request Access'
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Access</DialogTitle>
              <DialogDescription>
                Request access to view detailed information about {selectedStartup?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={accessMessage}
                  onChange={(e) => setAccessMessage(e.target.value)}
                  placeholder="Introduce yourself and explain your interest..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAccessModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRequestAccess} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
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
              <div className="text-2xl font-bold text-green-600">${portfolioStats.totalInvested.toLocaleString()}</div>
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
                        <p className="font-medium">${inv.amount.toLocaleString()}</p>
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
                            ${round.raisedAmount.toLocaleString()} / ${round.targetAmount.toLocaleString()} raised
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
          
          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingInvestments.length === 0 ? (
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
                          <p className="text-sm text-muted-foreground">${inv.amount.toLocaleString()} for {inv.equityPercent.toFixed(4)}% equity</p>
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
                          <p className="text-sm text-muted-foreground">${inv.amount.toLocaleString()} for {inv.equityPercent.toFixed(4)}% equity</p>
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

        {/* Invest Modal */}
        <Dialog open={showInvestModal} onOpenChange={setShowInvestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invest in {selectedRound?.startupId.name}</DialogTitle>
              <DialogDescription>
                {selectedRound?.roundName} - Min: ${selectedRound?.minInvestment.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target:</span>
                  <span className="ml-2 font-medium">${selectedRound?.targetAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Raised:</span>
                  <span className="ml-2 font-medium">${selectedRound?.raisedAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity:</span>
                  <span className="ml-2 font-medium">{selectedRound?.equityOffered}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valuation:</span>
                  <span className="ml-2 font-medium">${selectedRound?.valuation.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Investment Amount ($)</Label>
                <Input
                  type="number"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder={`Min: $${selectedRound?.minInvestment.toLocaleString()}`}
                />
                {investAmount && selectedRound && (
                  <p className="text-xs text-muted-foreground">
                    Estimated equity: {((parseFloat(investAmount) / selectedRound.valuation) * 100).toFixed(4)}%
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvestModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvest} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Proceed to Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Agreements
  if (activeTab === 'agreements') {
    return <AgreementsSection />;
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

// Agreements Section Component
function AgreementsSection({}) {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  const fetchAgreements = useCallback(async () => {
    
    setLoading(true);
    
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
    
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAgreements();
  }, [fetchAgreements]);

  const handleSign = async (agreementId: string) => {
    setSigningId(agreementId);
    
    try {
      const res = await fetch('/api/agreements/sign', {
          credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agreementId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Agreement signed successfully!');
        fetchAgreements();
      } else {
        toast.error(data.error || 'Failed to sign agreement');
      }
    } catch {
      toast.error('Failed to sign agreement');
    }

    setSigningId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-500';
      case 'pending_signature': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agreements</h1>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : agreements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No agreements yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Agreements will appear here when you make an investment
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => {
            const isSigned = agreement.signedBy?.some(
              (s: any) => s.userId?._id === s.userId || s.userId
            );
            
            return (
              <Card key={agreement._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{agreement.type} Agreement</h3>
                        <p className="text-sm text-muted-foreground">
                          {agreement.startupId?.name || 'Startup'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={getStatusColor(agreement.status)}>
                          {agreement.status.replace('_', ' ')}
                        </Badge>
                        {agreement.signedBy?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Signed by {agreement.signedBy.length} party(ies)
                          </p>
                        )}
                      </div>
                      {agreement.status === 'pending_signature' && !isSigned && (
                        <Button
                          size="sm"
                          onClick={() => handleSign(agreement._id)}
                          disabled={signingId === agreement._id}
                        >
                          {signingId === agreement._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Sign'
                          )}
                        </Button>
                      )}
                      {isSigned && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
