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
export * from './models/agreement.model';
export * from './models/pitch.model';
export * from './models/investment-confirmation.model';
export * from './models/journey-post.model';
import mongoose, { Schema, Document } from 'mongoose';
// ============================================
// TRUST SCORE LOG SCHEMA
// ============================================
export interface ITrustScoreLog extends Document {
  userId: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  scoreChange: number;
  reason: string;
  category: 'milestone' | 'agreement' | 'dispute' | 'funding' | 'response_time' | 'alliance' | 'other';
  createdAt: Date;
}

const TrustScoreLogSchema = new Schema<ITrustScoreLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    scoreChange: { type: Number, required: true },
    reason: { type: String, required: true },
    category: { type: String, enum: ['milestone', 'agreement', 'dispute', 'funding', 'response_time', 'alliance', 'other'], required: true },
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
// PAYMENT SCHEMA
// ============================================
export type PaymentType = 'milestone' | 'investment' | 'subscription' | 'commission';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  fromUserId: mongoose.Types.ObjectId;
  toUserId?: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  milestoneId?: mongoose.Types.ObjectId;
  platformFee: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    type: { type: String, enum: ['milestone', 'investment', 'subscription', 'commission'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone' },
    platformFee: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

// ============================================
// SUBSCRIPTION SCHEMA
// ============================================
export type PlanType = 'free_founder' | 'pro_founder' | 'scale_founder' | 'enterprise_founder' | 'free' | 'pro' | 'scale' | 'premium';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  features: {
    maxProjects: number;
    maxTeamMembers: number;
    profileBoost: boolean;
    advancedAnalytics: boolean;
    earlyDealAccess: boolean;
    prioritySupport: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ALL_PLANS = ['free_founder', 'pro_founder', 'scale_founder', 'enterprise_founder', 'free', 'pro', 'scale', 'premium'];

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    plan: { type: String, enum: ALL_PLANS, default: 'free_founder' },
    status: { type: String, enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'], default: 'active' },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    features: {
      maxProjects: { type: Number, default: 1 },
      maxTeamMembers: { type: Number, default: 5 },
      profileBoost: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      earlyDealAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ status: 1 });

export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

// ============================================
// NOTIFICATION SCHEMA
// ============================================
export type NotificationType =
  | 'application_received'
  | 'application_status'
  | 'agreement_signed'
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
  | 'pitch_sent'
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

// ALLIANCE EXPORTS (Placeholder to maintain types across the app)
export type AllianceStatus = 'pending' | 'accepted' | 'rejected';
