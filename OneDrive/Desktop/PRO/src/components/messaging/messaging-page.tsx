'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  MessageSquare, Send, Loader2, Search, User, 
  ChevronRight, ArrowLeft, Check, CheckCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore, useUIStore } from '@/store';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Conversation {
  _id: string;
  otherUser: {
    _id: string;
    name: string;
    avatar?: string;
    role: string;
    trustScore: number;
    verificationLevel: number;
  } | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read?: boolean;
  isMine: boolean;
}

export function MessagingPage() {
  const { user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Conversation['otherUser']>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {

    try {
      const response = await fetch('/api/messages/conversations', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        
        // Calculate total unread
        const total = data.conversations.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0);
        setUnreadTotal(total);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (userId: string) => {

    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/conversation/${userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setOtherUser(data.otherUser);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initialize WebSocket
  useEffect(() => {

    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Connected to messaging service');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from messaging service');
      setConnected(false);
    });

    // Listen for new messages
    socketInstance.on('message:new', (message: Message) => {
      if (selectedConversation?._id.includes(message.senderId)) {
        setMessages(prev => [...prev, { ...message, isMine: false }]);
      }
      fetchConversations();
    });

    // Listen for sent message confirmation
    socketInstance.on('message:sent', (message: Message) => {
      setMessages(prev => {
        // Check if already exists
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      fetchConversations();
    });

    // Listen for errors
    socketInstance.on('message:error', (data: { error: string }) => {
      toast.error(data.error);
      setSending(false);
    });

    // Listen for typing
    socketInstance.on('message:typing', (data: { userId: string }) => {
      if (selectedConversation?._id.includes(data.userId)) {
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      }
    });

    // Listen for unread count updates
    socketInstance.on('message:unread_count', (data: { count: number }) => {
      setUnreadTotal(data.count);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [selectedConversation?._id, fetchConversations]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for conversation to open from localStorage
  useEffect(() => {
    const openConversationId = safeLocalStorage.getItem(STORAGE_KEYS.OPEN_CONVERSATION);
    if (openConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === openConversationId);
      if (conv) {
        handleSelectConversation(conv);
      }
      safeLocalStorage.removeItem(STORAGE_KEYS.OPEN_CONVERSATION);
    }
  }, [conversations]);

  // Listen for navigateToMessages event and handle MESSAGE_USER
  useEffect(() => {
    const handleNavigateToMessages = () => {
      const messageUserId = safeLocalStorage.getItem(STORAGE_KEYS.MESSAGE_USER);
      if (messageUserId) {
        // Check if we already have a conversation with this user
        const existingConv = conversations.find(c => c.otherUser?._id === messageUserId);
        if (existingConv) {
          handleSelectConversation(existingConv);
        } else {
          // Create a temporary conversation object for new conversation
          // and fetch messages (which will create the conversation if needed)
          const newConv: Conversation = {
            _id: `new_${messageUserId}`,
            otherUser: {
              _id: messageUserId,
              name: 'Loading...',
              role: 'talent',
              trustScore: 0,
              verificationLevel: 0,
            },
            lastMessage: '',
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
          };
          setSelectedConversation(newConv);
          fetchMessages(messageUserId);
        }
        safeLocalStorage.removeItem(STORAGE_KEYS.MESSAGE_USER);
      }
    };

    // Listen for the custom event
    window.addEventListener('navigateToMessages', handleNavigateToMessages);

    // Also check on mount and when conversations change
    handleNavigateToMessages();

    return () => {
      window.removeEventListener('navigateToMessages', handleNavigateToMessages);
    };
  }, [conversations, fetchMessages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    if (conv.otherUser) {
      fetchMessages(conv.otherUser._id);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMessages([]);
    setOtherUser(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation?.otherUser || !socket) return;

    setSending(true);
    
    // Emit via WebSocket
    socket.emit('message:send', {
      receiverId: selectedConversation.otherUser._id,
      content: messageInput.trim(),
    });

    setMessageInput('');
    setSending(false);
  };

  const handleTyping = () => {
    if (socket && selectedConversation?.otherUser) {
      socket.emit('message:typing', { receiverId: selectedConversation.otherUser._id });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getVerificationBadge = (level: number) => {
    const colors = ['bg-gray-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'];
    return colors[level] || colors[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px]">
      <Card className="h-full">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className={`border-r ${selectedConversation ? 'hidden md:block md:w-80' : 'w-full'}`}>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Messages</CardTitle>
                {unreadTotal > 0 && (
                  <Badge variant="destructive">{unreadTotal}</Badge>
                )}
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-8" />
              </div>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-120px)]">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visit a user's profile to start messaging
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?._id === conv._id ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.otherUser?.avatar} />
                      <AvatarFallback>
                        {getInitials(conv.otherUser?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.otherUser?.name || 'Unknown User'}</p>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Window */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={handleBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherUser?.avatar} />
                  <AvatarFallback>
                    {getInitials(otherUser?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{otherUser?.name || 'Loading...'}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {otherUser?.role}
                    </Badge>
                    {otherUser && (
                      <Badge className={`text-xs ${getVerificationBadge(otherUser.verificationLevel)} text-white`}>
                        Lv.{otherUser.verificationLevel}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  if (otherUser) {
                    setActiveTab('profile');
                    safeLocalStorage.setItem(STORAGE_KEYS.VIEW_PROFILE, otherUser._id);
                  }
                }}>
                  <User className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-lg ${
                            message.isMine
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${
                            message.isMine ? 'justify-end' : 'justify-start'
                          }`}>
                            <span className="text-xs opacity-70">
                              {formatTime(message.createdAt)}
                            </span>
                            {message.isMine && (
                              message.read ? (
                                <CheckCheck className="h-3 w-3 opacity-70" />
                              ) : (
                                <Check className="h-3 w-3 opacity-70" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {typing && (
                      <div className="flex justify-start">
                        <div className="bg-muted px-4 py-2 rounded-lg">
                          <p className="text-sm text-muted-foreground">typing...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      handleTyping();
                    }}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={!messageInput.trim() || sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
