import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'application_received'
  | 'application_status'
  | 'milestone_created'
  | 'milestone_completed'
  | 'payment_success'
  | 'funding_update'
  | 'trust_score_change'
  | 'verification_update'
  | 'subscription_update'
  | 'alliance_request'
  | 'alliance_accepted'
  | 'alliance_rejected'
  | 'message_received'
  | 'pitch_requested'
  | 'pitch_received'
  | 'pitch_sent'
  | 'pitch_viewed'
  | 'pitch_interested'
  | 'pitch_rejected'
  | 'investment_entry_prompt'
  | 'investment_matched'
  | 'investment_mismatched';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
