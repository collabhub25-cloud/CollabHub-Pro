// Proxy file to ensure backward compatibility and easy exports
// Re-exports all individually extracted modular schemas

export * from './models/user.model';
export * from './models/startup.model';
export * from './models/application.model';

export * from './models/milestone.model';
export * from './models/funding.model';
export * from './models/message.model';
export * from './models/verification.model';
export * from './models/job.model';
export * from './models/misc.model';
export * from './models/team-member.model';
export * from './models/achievement.model';
export * from './models/investment.model';

export * from './models/pitch.model';
export * from './models/investment-confirmation.model';
export * from './models/journey-post.model';
export * from './models/email-preferences.model';
export * from './models/skill-test.model';
export * from './models/payment.model';
export * from './models/subscription.model';
export * from './models/mentor-session.model';
export * from './models/funding-deal.model';

import mongoose, { Schema, Document } from 'mongoose';
import { triggerNotificationEmail } from './email-service';
// ============================================
// TRUST SCORE LOG SCHEMA
// ============================================
export interface ITrustScoreLog extends Document {
  userId: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  scoreChange: number;
  reason: string;
  category: 'milestone' | 'dispute' | 'funding' | 'response_time' | 'alliance' | 'other';
  createdAt: Date;
}

const TrustScoreLogSchema = new Schema<ITrustScoreLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    scoreChange: { type: Number, required: true },
    reason: { type: String, required: true },
    category: { type: String, enum: ['milestone', 'dispute', 'funding', 'response_time', 'alliance', 'other'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TrustScoreLog = mongoose.models.TrustScoreLog || mongoose.model<ITrustScoreLog>('TrustScoreLog', TrustScoreLogSchema);

// ============================================
// DISPUTE SCHEMA
// ============================================
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

export interface IDispute extends Document {
  milestoneId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  againstUser: mongoose.Types.ObjectId;
  reason: string;
  evidence?: string[];
  status: DisputeStatus;
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    againstUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 2000 },
    evidence: [{ type: String }],
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'escalated'], default: 'open' },
    resolution: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Dispute = mongoose.models.Dispute || mongoose.model<IDispute>('Dispute', DisputeSchema);

// ============================================
// NOTIFICATION SCHEMA
// ============================================
export type NotificationType =
  | 'application_received'
  | 'application_status'

  | 'milestone_created'
  | 'milestone_completed'
  | 'payment_success'
  | 'payment_failed'
  | 'funding_update'
  | 'trust_score_change'
  | 'verification_update'
  | 'subscription_update'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'alliance_request'
  | 'alliance_accepted'
  | 'alliance_rejected'
  | 'message_received'
  | 'pitch_requested'
  | 'pitch_sent'
  | 'investment_entry_prompt'
  | 'investment_matched'
  | 'investment_mismatched'
  | 'mentor_session_booked'
  | 'mentor_session_reminder'
  | 'commission_invoice';

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

// Global post-save hook to trigger email notifications
NotificationSchema.post('save', function (doc) {
  // We use process.nextTick to ensure this doesn't block the save operation
  process.nextTick(() => {
    triggerNotificationEmail(doc.userId.toString(), doc.type, {
      ...doc.metadata,
      title: doc.title,
      message: doc.message,
      actionUrl: doc.actionUrl,
      entityId: doc._id.toString(),
    }).catch(err => console.error('[NOTIFICATIONS] Global Email trigger error:', err));
  });
});

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

// ALLIANCE EXPORTS (Placeholder to maintain types across the app)
export type AllianceStatus = 'pending' | 'accepted' | 'rejected';
