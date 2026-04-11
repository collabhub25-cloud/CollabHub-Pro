import mongoose, { Schema, Document } from 'mongoose';
import type { PaymentPurpose } from '@/lib/payments/constants';

export type PaymentType = 'milestone' | 'investment' | 'subscription' | 'commission' | 'one_time';
export type PaymentRecordStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  type: PaymentType;
  purpose: PaymentPurpose;
  amount: number; // in paise
  currency: string;
  status: PaymentRecordStatus;
  fromUserId: mongoose.Types.ObjectId;
  toUserId?: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  milestoneId?: mongoose.Types.ObjectId;
  platformFee: number;

  // Razorpay integration fields
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpaySubscriptionId?: string;

  // Idempotency & deduplication
  idempotencyKey: string;

  metadata?: Record<string, unknown>;
  failureReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    type: {
      type: String,
      enum: ['milestone', 'investment', 'subscription', 'commission', 'one_time'],
      required: true,
    },
    purpose: {
      type: String,
      enum: ['founder_profile', 'boost_subscription', 'ai_report', 'mentor_session', 'fundraising_commission'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone' },
    platformFee: { type: Number, default: 0 },

    // Razorpay fields
    razorpayOrderId: { type: String, sparse: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpaySignature: { type: String },
    razorpaySubscriptionId: { type: String },

    // Idempotency
    idempotencyKey: { type: String, required: true },

    metadata: { type: Schema.Types.Mixed },
    failureReason: { type: String },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for fast lookups
PaymentSchema.index({ razorpayOrderId: 1 }, { sparse: true });
PaymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
PaymentSchema.index({ idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ fromUserId: 1, purpose: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
