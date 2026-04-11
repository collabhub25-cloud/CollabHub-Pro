import mongoose, { Schema, Document } from 'mongoose';

export type FundingDealStatus = 'pending' | 'invoiced' | 'paid' | 'waived' | 'overdue';

export interface IFundingDeal extends Document {
  fundingRoundId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;

  // Deal details
  dealAmount: number; // Total investment amount in paise
  commissionPercent: number;
  commissionAmount: number; // Calculated commission in paise

  // Razorpay payment tracking
  razorpayPaymentLinkId?: string;
  razorpayPaymentLinkUrl?: string;
  razorpayPaymentId?: string;
  status: FundingDealStatus;

  // Metadata
  invoicedAt?: Date;
  paidAt?: Date;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const FundingDealSchema = new Schema<IFundingDeal>(
  {
    fundingRoundId: { type: Schema.Types.ObjectId, ref: 'FundingRound', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    dealAmount: { type: Number, required: true },
    commissionPercent: { type: Number, required: true, default: 5 },
    commissionAmount: { type: Number, required: true },

    razorpayPaymentLinkId: { type: String },
    razorpayPaymentLinkUrl: { type: String },
    razorpayPaymentId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'invoiced', 'paid', 'waived', 'overdue'],
      default: 'pending',
    },

    invoicedAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

FundingDealSchema.index({ startupId: 1 });
FundingDealSchema.index({ investorId: 1 });
FundingDealSchema.index({ status: 1 });
FundingDealSchema.index({ fundingRoundId: 1 });

export const FundingDeal = mongoose.models.FundingDeal || mongoose.model<IFundingDeal>('FundingDeal', FundingDealSchema);
