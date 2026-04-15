'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/client-utils';
import { formatCurrencyShort } from '@/components/dashboard/shared-components';

interface PitchDetailsModalProps {
  pitch: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: 'viewed' | 'interested' | 'rejected') => void;
}

export function PitchDetailsModal({ pitch, isOpen, onClose, onUpdateStatus }: PitchDetailsModalProps) {
  if (!pitch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-start justify-between mt-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={pitch.startupId?.logo} />
                <AvatarFallback className="text-xl bg-primary/10">
                  {getInitials(pitch.startupId?.name || 'S')}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{pitch.title || 'Startup Pitch'}</DialogTitle>
                <DialogDescription className="text-base font-medium mt-1">
                  {pitch.startupId?.name} • <span className="capitalize">{pitch.startupId?.stage}</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
              <div className="bg-muted/30 p-4 rounded-xl text-sm leading-relaxed border border-border/50">
                {pitch.description || pitch.message || 'No description provided.'}
              </div>
            </div>

            {pitch.pitchDocumentUrl && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pitch Deck</h3>
                <div className="rounded-xl border border-border overflow-hidden h-96 bg-muted/20 relative flex items-center justify-center">
                   {pitch.pitchDocumentUrl.endsWith('.pdf') ? (
                     <iframe src={pitch.pitchDocumentUrl} className="w-full h-full border-0" title="Pitch Deck" />
                   ) : (
                     <div className="flex flex-col items-center gap-3">
                       <ExternalLink className="h-8 w-8 text-muted-foreground" />
                       <a href={pitch.pitchDocumentUrl} target="_blank" rel="noopener noreferrer">
                         <Button variant="outline">Open Pitch Deck</Button>
                       </a>
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h3 className="text-sm font-semibold mb-4 text-primary">Investment Ask</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">{formatCurrencyShort(pitch.amountRequested)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Equity</span>
                  <span className="font-bold">{pitch.equityOffered}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valuation</span>
                  <span className="font-medium text-sm">
                    {pitch.amountRequested && pitch.equityOffered 
                      ? formatCurrencyShort((pitch.amountRequested / pitch.equityOffered) * 100)
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Founder</h3>
              {pitch.founderId ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar>
                    <AvatarImage src={pitch.founderId.avatar} />
                    <AvatarFallback>{getInitials(pitch.founderId.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{pitch.founderId.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-1 text-primary border-primary/30">Founder</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Founder info unavailable.</p>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t">
               {['pending', 'viewed'].includes(pitch.pitchStatus) && (
                 <>
                   <Button 
                     className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                     onClick={() => {
                        onUpdateStatus(pitch._id, 'interested');
                        onClose();
                     }}
                   >
                     <CheckCircle2 className="h-4 w-4" /> I'm Interested
                   </Button>
                   <Button 
                     variant="outline" 
                     className="w-full gap-2 hover:bg-destructive hover:text-white"
                     onClick={() => {
                        onUpdateStatus(pitch._id, 'rejected');
                        onClose();
                     }}
                   >
                     <X className="h-4 w-4" /> Reject Pitch
                   </Button>
                 </>
               )}
               {pitch.pitchStatus === 'interested' && (
                  <Button className="w-full bg-primary/20 text-primary hover:bg-primary/30 cursor-default">
                    Already marked Interested
                  </Button>
               )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
