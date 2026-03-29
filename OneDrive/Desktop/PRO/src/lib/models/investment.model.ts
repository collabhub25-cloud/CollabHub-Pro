import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestment extends Document {
  investorId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  amountInvested: number;
  equityPercentage: number;
  investmentDate: Date;
  valuationAtInvestment?: number;
  status: 'active' | 'exited' | 'written_off';
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startupId: {
      type: Schema.Types.ObjectId,
      ref: 'Startup',
      required: true,
      index: true,
    },
    amountInvested: {
      type: Number,
      required: true,
      min: 0,
    },
    equityPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    investmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    valuationAtInvestment: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'exited', 'written_off'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent redefining the model if it already exists
export const Investment = mongoose.models.Investment || mongoose.model<IInvestment>('Investment', InvestmentSchema);
