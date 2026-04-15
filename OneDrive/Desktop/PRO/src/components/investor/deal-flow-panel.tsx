'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Eye, Building2, CheckCircle2, Clock, X, Heart } from 'lucide-react';
import { PitchDetailsModal } from './pitch-details-modal';
import { getInitials } from '@/lib/client-utils';
import { apiFetch } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrencyShort } from '@/components/dashboard/shared-components';

export function DealFlowPanel() {
  const [pitches, setPitches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPitch, setSelectedPitch] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPitches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/pitches/received');
      if (res.ok) {
        const data = await res.json();
        setPitches(data.pitches || []);
      }
    } catch (err) {
      toast.error('Failed to load deal flow');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPitches();
  }, [fetchPitches]);

  const updatePitchStatus = async (pitchId: string, status: 'viewed' | 'interested' | 'rejected') => {
    try {
      const res = await apiFetch(`/api/pitches/${pitchId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Pitch marked as ${status}`);
        setPitches(prev => prev.map(p => p._id === pitchId ? { ...p, pitchStatus: status } : p));
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleViewDetails = (pitch: any) => {
    setSelectedPitch(pitch);
    setIsModalOpen(true);
    if (pitch.pitchStatus === 'pending') {
      updatePitchStatus(pitch._id, 'viewed');
    }
  };

  const renderPitchCard = (pitch: any) => (
    <Card key={pitch._id} className="hover:border-primary/50 transition-all duration-200 hover:-translate-y-1 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={pitch.startupId?.logo} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(pitch.startupId?.name || 'S')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base truncate max-w-[150px]">{pitch.startupId?.name}</CardTitle>
              <CardDescription className="text-xs">
                 {pitch.founderId?.name || 'Founder'} • {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          <Badge variant={
            pitch.pitchStatus === 'pending' ? 'default' :
            pitch.pitchStatus === 'interested' ? 'outline' :
            pitch.pitchStatus === 'rejected' ? 'destructive' : 'secondary'
          }>
            {pitch.pitchStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm truncate">{pitch.title}</h4>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>Ask: <span className="font-medium text-foreground">{formatCurrencyShort(pitch.amountRequested)}</span></span>
              <span>Equity: <span className="font-medium text-foreground">{pitch.equityOffered}%</span></span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
               size="sm" 
               className="flex-1"
               onClick={() => handleViewDetails(pitch)}
            >
              <Eye className="h-4 w-4 mr-1" /> View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const pending = pitches.filter(p => p.pitchStatus === 'pending');
  const viewed = pitches.filter(p => p.pitchStatus === 'viewed');
  const interested = pitches.filter(p => p.pitchStatus === 'interested');
  const rejected = pitches.filter(p => p.pitchStatus === 'rejected');

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deal Flow Dashboard</h1>
          <p className="text-muted-foreground">Manage your incoming startup pitches</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({pitches.length})</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="viewed">Viewed ({viewed.length})</TabsTrigger>
          <TabsTrigger value="interested" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-600">
            Interested ({interested.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
            Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="m-0 focus-visible:outline-none">
                {pitches.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pitches.map(renderPitchCard)}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="pending" className="m-0 focus-visible:outline-none">
                {pending.length === 0 ? <EmptyState state="pending" /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pending.map(renderPitchCard)}</div>
                )}
              </TabsContent>
              <TabsContent value="viewed" className="m-0 focus-visible:outline-none">
                {viewed.length === 0 ? <EmptyState state="viewed" /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{viewed.map(renderPitchCard)}</div>
                )}
              </TabsContent>
              <TabsContent value="interested" className="m-0 focus-visible:outline-none">
                {interested.length === 0 ? <EmptyState state="interested" /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{interested.map(renderPitchCard)}</div>
                )}
              </TabsContent>
              <TabsContent value="rejected" className="m-0 focus-visible:outline-none">
                {rejected.length === 0 ? <EmptyState state="rejected" /> : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rejected.map(renderPitchCard)}</div>
                )}
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>

      <PitchDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pitch={selectedPitch}
        onUpdateStatus={updatePitchStatus}
      />
    </div>
  );
}

function EmptyState({ state = 'deal flow' }: { state?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted p-4 rounded-full mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="font-semibold text-lg">No pitches found</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          You don't have any {state === 'all' ? '' : state} startup pitches right now. 
          When founders send you pitch decks, they will appear here.
        </p>
      </CardContent>
    </Card>
  );
}
