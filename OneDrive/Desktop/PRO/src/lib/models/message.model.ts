import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// MESSAGE SCHEMA
// ============================================
export interface IMessage extends Document {
    senderId: mongoose.Types.ObjectId;
    receiverId: mongoose.Types.ObjectId;
    conversationId: string;
    content: string;
    read: boolean;
    readAt?: Date;
    attachments?: {
        url: string;
        type: string;
        name: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        conversationId: { type: String, required: true, index: true },
        content: { type: String, required: true, maxlength: 5000 },
        read: { type: Boolean, default: false },
        readAt: { type: Date },
        attachments: [{
            url: { type: String },
            type: { type: String },
            name: { type: String }
        }],
    },
    { timestamps: true }
);

MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

// ============================================
// CONVERSATION SCHEMA
// ============================================
export interface IConversation extends Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCount: Record<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
        lastMessage: { type: String },
        lastMessageAt: { type: Date },
        unreadCount: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
