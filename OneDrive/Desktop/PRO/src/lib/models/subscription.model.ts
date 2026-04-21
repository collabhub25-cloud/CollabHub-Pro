import mongoose, { Schema, Document } from 'mongoose';

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
