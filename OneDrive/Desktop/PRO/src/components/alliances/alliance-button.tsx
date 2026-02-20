'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus, UserCheck, Clock, X, Check, Loader2, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-client';

interface AllianceButtonProps {
  targetUserId: string;
  onStatusChange?: (status: string) => void;
  showMutualCount?: boolean;
  compact?: boolean;
}

interface AllianceStatus {
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self';
  alliance?: {
    _id: string;
    requesterId: string;
    receiverId: string;
    status: string;
  };
}

export function AllianceButton({
  targetUserId,
  onStatusChange,
  showMutualCount = false,
  compact = false
}: AllianceButtonProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<AllianceStatus | null>(null);
  const [mutualCount, setMutualCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    // Compare as strings to handle both string and ObjectId types
    const currentUserId = user?._id?.toString();
    const targetId = targetUserId?.toString();

    if (!user || !currentUserId || currentUserId === targetId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch alliance status
      const statusRes = await fetch(
        `/api/alliances/status?userId=${targetId}`, {
        credentials: 'include'
      }
      );

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      } else {
        console.error('Failed to fetch alliance status:', statusRes.status);
      }

      // Fetch mutual count if needed
      if (showMutualCount) {
        const mutualRes = await fetch(
          `/api/alliances/mutual?userId=${targetId}`, {
          credentials: 'include',
        }
        );

        if (mutualRes.ok) {
          const mutualData = await mutualRes.json();
          setMutualCount(mutualData.count);
        }
      }
    } catch (error) {
      console.error('Error fetching alliance status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId, showMutualCount]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendRequest = async () => {
    if (!user) {
      toast.error('Please log in to send alliance requests');
      return;
    }

    setActionLoading(true);
    try {
      console.log('Sending alliance request to:', targetUserId);
      const res = await fetch('/api/alliances', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: targetUserId }),
      });

      const data = await res.json();
      console.log('Alliance request response:', res.status, data);

      if (res.ok) {
        toast.success('Alliance request sent!');
        setStatus({ status: 'pending_sent', alliance: data.alliance });
        onStatusChange?.('pending_sent');
      } else {
        toast.error(data.error || 'Failed to send request');
        console.error('Alliance request failed:', data);
      }
    } catch (error) {
      console.error('Error sending alliance request:', error);
      toast.error('Failed to send alliance request');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async () => {
    if (!status?.alliance) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/alliances/accept', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allianceId: status.alliance._id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Alliance accepted! Your trust score increased by 2.');
        setStatus({ status: 'accepted', alliance: data.alliance });
        onStatusChange?.('accepted');
      } else {
        toast.error(data.error || 'Failed to accept request');
      }
    } catch (error) {
      toast.error('Failed to accept alliance');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectRequest = async () => {
    if (!status?.alliance) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/alliances/reject', {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allianceId: status.alliance._id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Alliance request declined');
        setStatus({ status: 'none' });
        onStatusChange?.('none');
      } else {
        toast.error(data.error || 'Failed to reject request');
      }
    } catch (error) {
      toast.error('Failed to reject alliance');
    } finally {
      setActionLoading(false);
    }
  };

  const removeAlliance = async () => {
    if (!status?.alliance) return;

    if (!confirm('Are you sure you want to remove this alliance?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/alliances?id=${status.alliance._id}`, {
        credentials: 'include',
        method: 'DELETE',
      }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success('Alliance removed');
        setStatus({ status: 'none' });
        onStatusChange?.('none');
      } else {
        toast.error(data.error || 'Failed to remove alliance');
      }
    } catch (error) {
      toast.error('Failed to remove alliance');
    } finally {
      setActionLoading(false);
    }
  };

  // Don't show for self (compare as strings)
  const currentUserId = user?._id?.toString();
  const targetId = targetUserId?.toString();
  if (!user || currentUserId === targetId) {
    return null;
  }

  if (loading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {!compact && 'Loading...'}
      </Button>
    );
  }

  // Render based on status
  switch (status?.status) {
    case 'accepted':
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-green-600 border-green-300"
            disabled
          >
            <UserCheck className="h-4 w-4" />
            {!compact && 'Alliance Active'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={removeAlliance}
            disabled={actionLoading}
          >
            <X className="h-4 w-4" />
          </Button>
          {showMutualCount && mutualCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {mutualCount} mutual
            </Badge>
          )}
        </div>
      );

    case 'pending_sent':
      return (
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled className="gap-2">
            <Clock className="h-4 w-4" />
            {!compact && 'Request Sent'}
          </Button>
          {showMutualCount && mutualCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {mutualCount} mutual
            </Badge>
          )}
        </div>
      );

    case 'pending_received':
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={acceptRequest}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {!compact && 'Accept'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-destructive border-destructive"
            onClick={rejectRequest}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {!compact && 'Decline'}
          </Button>
          {showMutualCount && mutualCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {mutualCount} mutual
            </Badge>
          )}
        </div>
      );

    case 'none':
    default:
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={sendRequest}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {!compact && 'Send Alliance Request'}
          </Button>
          {showMutualCount && mutualCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {mutualCount} mutual
            </Badge>
          )}
        </div>
      );
  }
}
