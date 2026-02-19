import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Configuration
const PORT = 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'collabhub-super-secret-jwt-key-2025-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://collabhubAdmin:murarijagansai@collabhub.18ydvxf.mongodb.net/collabhub?retryWrites=true&w=majority&appName=CollabHub';

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  actionUrl: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Alliance Schema
const allianceSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

allianceSchema.index({ requesterId: 1 });
allianceSchema.index({ receiverId: 1 });
allianceSchema.index({ status: 1 });

const Alliance = mongoose.models.Alliance || mongoose.model('Alliance', allianceSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversationId: { type: String, required: true, index: true },
  content: { type: String, required: true, maxlength: 5000 },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date },
  unreadCount: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

// User Schema for reference
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
  avatar: { type: String },
  trustScore: { type: Number, default: 50 },
  verificationLevel: { type: Number, default: 0 },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

// Online users map
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Helper to generate conversation ID
function generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected for notification service');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create HTTP server and Socket.IO
const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://21.0.9.232:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// JWT Authentication middleware
io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Invalid or expired token'));
  }
});

// Connection handler
io.on('connection', async (socket: AuthenticatedSocket) => {
  const userId = socket.userId!;
  console.log(`👤 User connected: ${socket.userEmail} (${socket.id})`);

  // Join user's personal room
  socket.join(`user:${userId}`);
  
  // Track online users
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);

  // Emit online status to others
  io.emit('user:online', { userId });

  // Send unread notification count on connect
  try {
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    socket.emit('notification:unread_count', { count: unreadCount });

    // Send recent notifications
    const recentNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    socket.emit('notifications:recent', recentNotifications);

    // Send unread message count
    const unreadMessages = await Message.countDocuments({ receiverId: userId, read: false });
    socket.emit('message:unread_count', { count: unreadMessages });
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }

  // Handle mark as read
  socket.on('notification:mark_read', async (data: { notificationIds: string[] }) => {
    try {
      await Notification.updateMany(
        { _id: { $in: data.notificationIds }, userId },
        { read: true }
      );
      
      const unreadCount = await Notification.countDocuments({ userId, read: false });
      socket.emit('notification:unread_count', { count: unreadCount });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  });

  // Handle mark all as read
  socket.on('notification:mark_all_read', async () => {
    try {
      await Notification.updateMany({ userId, read: false }, { read: true });
      socket.emit('notification:unread_count', { count: 0 });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  });

  // ==========================================
  // MESSAGE HANDLERS
  // ==========================================

  // Handle send message
  socket.on('message:send', async (data: { receiverId: string; content: string }) => {
    try {
      const { receiverId, content } = data;
      
      if (!receiverId || !content || content.trim().length === 0) {
        socket.emit('message:error', { error: 'Receiver ID and content are required' });
        return;
      }

      if (receiverId === userId) {
        socket.emit('message:error', { error: 'Cannot send message to yourself' });
        return;
      }

      // Verify receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        socket.emit('message:error', { error: 'Receiver not found' });
        return;
      }

      const conversationId = generateConversationId(userId, receiverId);

      // Create message
      const message = await Message.create({
        senderId: userId,
        receiverId,
        conversationId,
        content: content.trim(),
      });

      // Update or create conversation
      await Conversation.findOneAndUpdate(
        { _id: conversationId },
        {
          $set: {
            lastMessage: content.trim().substring(0, 100),
            lastMessageAt: new Date(),
          },
          $setOnInsert: {
            participants: [userId, receiverId],
          },
          $inc: { [`unreadCount.${receiverId}`]: 1 },
        },
        { upsert: true, new: true }
      );

      // Get sender details
      const sender = await User.findById(userId).select('name avatar').lean();

      // Emit to sender
      socket.emit('message:sent', {
        _id: message._id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        isMine: true,
      });

      // Emit to receiver if online
      io.to(`user:${receiverId}`).emit('message:new', {
        _id: message._id,
        senderId: message.senderId,
        sender: sender,
        receiverId: message.receiverId,
        content: message.content,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        isMine: false,
      });

      // Update unread count for receiver
      const receiverUnreadCount = await Message.countDocuments({ receiverId, read: false });
      io.to(`user:${receiverId}`).emit('message:unread_count', { count: receiverUnreadCount });

      // Create notification for receiver
      const notification = await Notification.create({
        userId: receiverId,
        type: 'message_received',
        title: 'New Message',
        message: `New message from ${sender?.name || 'Unknown'}`,
        metadata: { senderId: userId, messageId: message._id },
      });
      
      io.to(`user:${receiverId}`).emit('notification:new', notification);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message:error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('message:typing', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('message:typing', { userId });
  });

  // Handle mark messages as read
  socket.on('message:mark_read', async (data: { conversationId: string }) => {
    try {
      await Message.updateMany(
        { conversationId: data.conversationId, receiverId: userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      await Conversation.findByIdAndUpdate(data.conversationId, {
        $set: { [`unreadCount.${userId}`]: 0 },
      });

      const unreadCount = await Message.countDocuments({ receiverId: userId, read: false });
      socket.emit('message:unread_count', { count: unreadCount });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // ==========================================
  // ALLIANCE HANDLERS
  // ==========================================

  // Handle send alliance request
  socket.on('alliance:request', async (data: { receiverId: string }) => {
    try {
      const { receiverId } = data;
      
      if (!receiverId) {
        socket.emit('alliance:error', { error: 'Receiver ID is required' });
        return;
      }

      if (receiverId === userId) {
        socket.emit('alliance:error', { error: 'Cannot send alliance request to yourself' });
        return;
      }

      // Check if receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        socket.emit('alliance:error', { error: 'User not found' });
        return;
      }

      // Check for existing alliance
      const existing = await Alliance.findOne({
        $or: [
          { requesterId: userId, receiverId },
          { requesterId: receiverId, receiverId: userId },
        ],
      });

      if (existing) {
        if (existing.status === 'accepted') {
          socket.emit('alliance:error', { error: 'Already connected with this user' });
          return;
        }
        if (existing.status === 'pending') {
          if (existing.requesterId.toString() === userId) {
            socket.emit('alliance:error', { error: 'Request already sent' });
            return;
          } else {
            socket.emit('alliance:error', { error: 'This user has already sent you a request' });
            return;
          }
        }
        // If rejected, delete old one and create new
        if (existing.status === 'rejected') {
          await Alliance.findByIdAndDelete(existing._id);
        }
      }

      // Create alliance request
      const alliance = await Alliance.create({
        requesterId: userId,
        receiverId,
        status: 'pending',
      });

      // Get requester info
      const requester = await User.findById(userId).select('name avatar role').lean();

      // Emit to sender
      socket.emit('alliance:sent', {
        _id: alliance._id,
        receiverId,
        status: alliance.status,
        createdAt: alliance.createdAt,
      });

      // Emit to receiver
      io.to(`user:${receiverId}`).emit('alliance:request_received', {
        _id: alliance._id,
        requesterId: userId,
        requester: requester,
        status: alliance.status,
        createdAt: alliance.createdAt,
      });

      // Create notification for receiver
      const notification = await Notification.create({
        userId: receiverId,
        type: 'alliance_request',
        title: 'New Alliance Request',
        message: `${requester?.name || 'Someone'} wants to form an alliance with you`,
        actionUrl: '/alliances',
        metadata: { allianceId: alliance._id, requesterId: userId },
      });
      
      io.to(`user:${receiverId}`).emit('notification:new', notification);

      // Update unread count for receiver
      const unreadCount = await Notification.countDocuments({ userId: receiverId, read: false });
      io.to(`user:${receiverId}`).emit('notification:unread_count', { count: unreadCount });

    } catch (error) {
      console.error('Error sending alliance request:', error);
      socket.emit('alliance:error', { error: 'Failed to send alliance request' });
    }
  });

  // Handle accept alliance
  socket.on('alliance:accept', async (data: { allianceId: string }) => {
    try {
      const { allianceId } = data;
      
      const alliance = await Alliance.findById(allianceId);
      if (!alliance) {
        socket.emit('alliance:error', { error: 'Alliance not found' });
        return;
      }

      if (alliance.receiverId.toString() !== userId) {
        socket.emit('alliance:error', { error: 'Not authorized' });
        return;
      }

      if (alliance.status !== 'pending') {
        socket.emit('alliance:error', { error: `Alliance already ${alliance.status}` });
        return;
      }

      // Update alliance
      alliance.status = 'accepted';
      await alliance.save();

      // Update trust scores
      await User.findByIdAndUpdate(alliance.requesterId, { $inc: { trustScore: 2 } });
      await User.findByIdAndUpdate(alliance.receiverId, { $inc: { trustScore: 2 } });

      // Get both users' info
      const accepter = await User.findById(userId).select('name avatar').lean();
      const requester = await User.findById(alliance.requesterId).select('name avatar').lean();

      // Emit to accepter
      socket.emit('alliance:accepted', {
        _id: alliance._id,
        partner: requester,
        status: alliance.status,
      });

      // Emit to requester
      io.to(`user:${alliance.requesterId}`).emit('alliance:accepted', {
        _id: alliance._id,
        partner: accepter,
        status: alliance.status,
      });

      // Notify requester
      const notification = await Notification.create({
        userId: alliance.requesterId.toString(),
        type: 'alliance_accepted',
        title: 'Alliance Accepted!',
        message: `${accepter?.name || 'Someone'} accepted your alliance request`,
        actionUrl: '/alliances',
        metadata: { allianceId: alliance._id },
      });
      
      io.to(`user:${alliance.requesterId}`).emit('notification:new', notification);

    } catch (error) {
      console.error('Error accepting alliance:', error);
      socket.emit('alliance:error', { error: 'Failed to accept alliance' });
    }
  });

  // Handle reject alliance
  socket.on('alliance:reject', async (data: { allianceId: string }) => {
    try {
      const { allianceId } = data;
      
      const alliance = await Alliance.findById(allianceId);
      if (!alliance) {
        socket.emit('alliance:error', { error: 'Alliance not found' });
        return;
      }

      if (alliance.receiverId.toString() !== userId) {
        socket.emit('alliance:error', { error: 'Not authorized' });
        return;
      }

      if (alliance.status !== 'pending') {
        socket.emit('alliance:error', { error: `Alliance already ${alliance.status}` });
        return;
      }

      // Update alliance
      alliance.status = 'rejected';
      await alliance.save();

      // Emit to rejecter
      socket.emit('alliance:rejected', {
        _id: alliance._id,
        status: alliance.status,
      });

      // Get rejecter's name
      const rejecter = await User.findById(userId).select('name').lean();

      // Notify requester (optional)
      const notification = await Notification.create({
        userId: alliance.requesterId.toString(),
        type: 'alliance_rejected',
        title: 'Alliance Request Update',
        message: `${rejecter?.name || 'Someone'} declined your alliance request`,
        actionUrl: '/alliances',
        metadata: { allianceId: alliance._id },
      });
      
      io.to(`user:${alliance.requesterId}`).emit('notification:new', notification);

    } catch (error) {
      console.error('Error rejecting alliance:', error);
      socket.emit('alliance:error', { error: 'Failed to reject alliance' });
    }
  });

  // Handle remove alliance
  socket.on('alliance:remove', async (data: { allianceId: string }) => {
    try {
      const { allianceId } = data;
      
      const alliance = await Alliance.findById(allianceId);
      if (!alliance) {
        socket.emit('alliance:error', { error: 'Alliance not found' });
        return;
      }

      if (alliance.requesterId.toString() !== userId && alliance.receiverId.toString() !== userId) {
        socket.emit('alliance:error', { error: 'Not authorized' });
        return;
      }

      await Alliance.findByIdAndDelete(allianceId);

      // Emit to remover
      socket.emit('alliance:removed', {
        _id: allianceId,
      });

      // Notify the other party
      const otherId = alliance.requesterId.toString() === userId 
        ? alliance.receiverId.toString() 
        : alliance.requesterId.toString();

      const remover = await User.findById(userId).select('name').lean();

      io.to(`user:${otherId}`).emit('alliance:removed_by_partner', {
        allianceId,
        partnerName: remover?.name,
      });

    } catch (error) {
      console.error('Error removing alliance:', error);
      socket.emit('alliance:error', { error: 'Failed to remove alliance' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`👤 User disconnected: ${socket.userEmail} (${socket.id})`);
    
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit('user:offline', { userId });
      }
    }
  });
});

// API endpoint for creating notifications (called by main app)
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const notification = await Notification.create(data);
    
    // Emit to user's room
    io.to(`user:${data.userId}`).emit('notification:new', notification);
    
    // Update unread count
    const unreadCount = await Notification.countDocuments({ userId: data.userId, read: false });
    io.to(`user:${data.userId}`).emit('notification:unread_count', { count: unreadCount });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get online users
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

// Start server
async function start() {
  await connectDB();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Notification service running on port ${PORT}`);
    console.log(`📡 WebSocket ready for connections`);
  });
}

start().catch(console.error);

export { io };
