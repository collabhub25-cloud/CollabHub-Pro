'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { 
  Users, UserPlus, Clock, Check, X, MessageSquare, Loader2, UserCheck,
  Building2, Briefcase, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Alliance {
  _id: string;
  requesterId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    trustScore: number;
    verificationLevel: number;
  };
  receiverId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    trustScore: number;
    verificationLevel: number;
  };
  status: string;
  type: 'accepted' | 'received' | 'sent';
  createdAt: string;
  updatedAt: string;
}

interface AllianceCounts {
  accepted: number;
  received: number;
  sent: number;
}

const roleIcons: Record<string, React.ReactNode> = {
  founder: <Building2 className="h-3 w-3" />,
  talent: <Briefcase className="h-3 w-3" />,
  investor: <TrendingUp className="h-3 w-3" />,
  admin: <Users className="h-3 w-3" />,
};

export function AlliancePage() {
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('accepted');
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [counts, setCounts] = useState<AllianceCounts>({ accepted: 0, received: 0, sent: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlliances = useCallback(async (type: string) => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/alliances?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const data = await res.json();
        setAlliances(data.alliances || []);
        setCounts(data.counts || { accepted: 0, received: 0, sent: 0 });
      } else if (res.status === 401) {
        // Token expired or invalid - show re-login prompt
        console.error('Authentication expired for alliances');
        toast.error('Session expired. Please log in again.');
      } else {
        console.error('Failed to fetch alliances:', res.status);
        toast.error('Failed to load alliances');
      }
    } catch (error) {
      console.error('Error fetching alliances:', error);
      toast.error('Failed to load alliances');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // Fetch on mount
  useEffect(() => {
    fetchAlliances(activeTab);
  }, [fetchAlliances, activeTab]);

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchAlliances(tab);
  };

  const acceptRequest = async (allianceId: string) => {
    if (!token) return;
    setActionLoading(allianceId);
    try {
      const res = await fetch('/api/alliances/accept', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allianceId }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success('Alliance accepted! Trust score +2');
        fetchAlliances(activeTab);
      } else {
        toast.error(data.error || 'Failed to accept');
      }
    } catch (error) {
      toast.error('Failed to accept alliance');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRequest = async (allianceId: string) => {
    if (!token) return;
    setActionLoading(allianceId);
    try {
      const res = await fetch('/api/alliances/reject', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allianceId }),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success('Request declined');
        fetchAlliances(activeTab);
      } else {
        toast.error(data.error || 'Failed to decline');
      }
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const removeAlliance = async (allianceId: string) => {
    if (!confirm('Remove this alliance?') || !token) return;
    
    setActionLoading(allianceId);
    try {
      const res = await fetch(`/api/alliances?id=${allianceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success('Alliance removed');
        fetchAlliances(activeTab);
      } else {
        toast.error(data.error || 'Failed to remove');
      }
    } catch (error) {
      toast.error('Failed to remove alliance');
    } finally {
      setActionLoading(null);
    }
  };

  const startMessage = (partnerId: string) => {
    // Navigate to messages with this user
    safeLocalStorage.setItem(STORAGE_KEYS.MESSAGE_USER, partnerId);
    window.dispatchEvent(new CustomEvent('navigateToMessages'));
  };

  const getPartner = (alliance: Alliance) => {
    if (!user || !user._id) return alliance.receiverId;
    return alliance.requesterId._id.toString() === user._id.toString() ? alliance.receiverId : alliance.requesterId;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getVerificationBadge = (level: number) => {
    const badges = ['Unverified', 'Basic', 'Verified', 'Trusted', 'Expert'];
    const colors = ['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
    return { label: badges[level] || 'Unverified', color: colors[level] || colors[0] };
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alliances</h1>
          <p className="text-muted-foreground">
            Connect professionally with talents, founders, and investors
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Alliances</p>
                <p className="text-2xl font-bold">{counts.accepted}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="accepted" className="gap-2">
            <UserCheck className="h-4 w-4" />
            My Alliances
            {counts.accepted > 0 && (
              <Badge variant="secondary" className="ml-1">{counts.accepted}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Received
            {counts.received > 0 && (
              <Badge variant="secondary" className="ml-1">{counts.received}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Clock className="h-4 w-4" />
            Sent
            {counts.sent > 0 && (
              <Badge variant="secondary" className="ml-1">{counts.sent}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : alliances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No alliances yet</p>
                <p className="text-muted-foreground text-sm">
                  {activeTab === 'accepted' && 'Start connecting with other users'}
                  {activeTab === 'received' && 'No pending requests'}
                  {activeTab === 'sent' && 'No requests sent'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="grid gap-4">
                {alliances.map((alliance) => {
                  const partner = getPartner(alliance);
                  const verificationBadge = getVerificationBadge(partner.verificationLevel);
                  
                  return (
                    <Card key={alliance._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={partner.avatar} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(partner.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{partner.name}</p>
                                <Badge variant="outline" className="gap-1 text-xs">
                                  {roleIcons[partner.role]}
                                  {partner.role}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${verificationBadge.color} text-white`}
                                >
                                  {verificationBadge.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Trust: {partner.trustScore}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {alliance.type === 'accepted' && `Alliance since ${formatDate(alliance.updatedAt)}`}
                                {alliance.type === 'received' && `Requested ${formatDate(alliance.createdAt)}`}
                                {alliance.type === 'sent' && `Sent ${formatDate(alliance.createdAt)}`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {alliance.type === 'accepted' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => startMessage(partner._id)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Message
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => removeAlliance(alliance._id)}
                                  disabled={actionLoading === alliance._id}
                                >
                                  {actionLoading === alliance._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            
                            {alliance.type === 'received' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => acceptRequest(alliance._id)}
                                  disabled={actionLoading === alliance._id}
                                >
                                  {actionLoading === alliance._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-destructive border-destructive"
                                  onClick={() => rejectRequest(alliance._id)}
                                  disabled={actionLoading === alliance._id}
                                >
                                  <X className="h-4 w-4" />
                                  Decline
                                </Button>
                              </>
                            )}
                            
                            {alliance.type === 'sent' && (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending Response
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
