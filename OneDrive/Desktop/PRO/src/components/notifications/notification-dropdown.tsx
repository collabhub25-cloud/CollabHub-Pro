'use client';

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell, Check, CheckCheck, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useUIStore } from '@/store';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

const notificationIcons: Record<string, string> = {
  application_received: '📬',
  application_status: '📋',
  agreement_signed: '✍️',
  milestone_created: '📌',
  milestone_completed: '✅',
  payment_success: '💰',
  funding_update: '📈',
  trust_score_change: '⭐',
  verification_update: '🔐',
  subscription_update: '💳',
  alliance_request: '🤝',
  alliance_accepted: '✅',
  alliance_rejected: '❌',
  message_received: '💬',
};

export function NotificationDropdown() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Map actionUrl to tab names for SPA navigation
  const mapActionUrlToTab = (url?: string): string | null => {
    if (!url) return null;
    // Handle SPA navigation - map URL paths to tab IDs
    const tabMap: Record<string, string> = {
      '/alliances': 'alliances',
      '/messages': 'messages',
      '/profile': 'profile',
      '/subscription': 'subscription',
      '/verification': 'verification',
      '/startups': 'startups',
      '/applications': 'applications',
      '/milestones': 'milestones',
      '/agreements': 'agreements',
      '/funding': 'funding',
      '/dealflow': 'dealflow',
      '/portfolio': 'portfolio',
      '/investments': 'investments',
      '/search': 'search',
    };
    return tabMap[url] || null;
  };

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    
    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=20', {
          credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {

    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Connected to notification service');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from notification service');
      setConnected(false);
    });

    socketInstance.on('notification:new', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.success(notification.title, {
        description: notification.message,
      });
    });

    socketInstance.on('notification:unread_count', (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    socketInstance.on('notifications:recent', (notifs: Notification[]) => {
      setNotifications(notifs);
    });

    setSocket(socketInstance);

    // Fetch initial data
    fetchNotifications();

    return () => {
      socketInstance.disconnect();
    };
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
          credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        setNotifications(prev =>
          prev.map(n => (n._id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read', {
          credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          {connected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification._id);
                  }
                  if (notification.actionUrl) {
                    const tabId = mapActionUrlToTab(notification.actionUrl);
                    if (tabId) {
                      // Use SPA navigation
                      setActiveTab(tabId);
                      setIsOpen(false);
                    } else {
                      // External URL or unknown path
                      window.location.href = notification.actionUrl;
                    }
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {notificationIcons[notification.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(notification.createdAt)}
                      </span>
                      {notification.actionUrl && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
