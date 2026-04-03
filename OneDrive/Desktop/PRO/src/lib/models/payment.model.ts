import mongoose, { Schema, Document } from 'mongoose';

export type PaymentType = 'milestone' | 'investment' | 'subscription' | 'commission';
export type PaymentRecordStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
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
    currency: { type: String, default: 'INR' },
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
