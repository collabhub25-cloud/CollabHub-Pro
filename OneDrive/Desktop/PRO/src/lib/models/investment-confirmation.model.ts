import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// INVESTMENT CONFIRMATION SCHEMA
// Dual-entry system for verified investment terms
// ============================================

export type InvestmentConfirmationStatus =
  | 'pending'           // Created but timer hasn't fired yet
  | 'awaiting_entries'  // Timer fired, both parties prompted
  | 'founder_submitted' // Only founder has submitted
  | 'investor_submitted'// Only investor has submitted
  | 'matched'           // Both submitted and values match
  | 'mismatched'        // Both submitted but values differ
  | 'expired';          // Deadline passed without both entries

export interface IInvestmentConfirmation extends Document {
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  pitchId: mongoose.Types.ObjectId;

  // Founder's independently submitted terms
  founderAmount?: number;
  founderEquity?: number;
  founderSubmittedAt?: Date;

  // Investor's independently submitted terms
  investorAmount?: number;
  investorEquity?: number;
  investorSubmittedAt?: Date;

  // Status tracking
  status: InvestmentConfirmationStatus;
  promptSentAt?: Date;    // When the 2-hour timer fired
  expiresAt?: Date;       // Deadline for both entries (48hr after prompt)
  matchedAt?: Date;       // When match was confirmed
  investmentId?: mongoose.Types.ObjectId; // Reference to created Investment

  // Mismatch details
  mismatchDetails?: {
    amountDiff?: number;
    equityDiff?: number;
  };

  retryCount: number;     // Number of re-entry attempts
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentConfirmationSchema = new Schema<IInvestmentConfirmation>(
  {
    startupId: {
      type: Schema.Types.ObjectId,
      ref: 'Startup',
      required: true,
      index: true,
    },
    investorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pitchId: {
      type: Schema.Types.ObjectId,
      ref: 'Pitch',
      required: true,
      index: true,
    },

    // Founder entry
    founderAmount: { type: Number, min: 0 },
    founderEquity: { type: Number, min: 0, max: 100 },
    founderSubmittedAt: { type: Date },

    // Investor entry
    investorAmount: { type: Number, min: 0 },
    investorEquity: { type: Number, min: 0, max: 100 },
    investorSubmittedAt: { type: Date },

    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'awaiting_entries',
        'founder_submitted',
        'investor_submitted',
        'matched',
        'mismatched',
        'expired',
      ],
      default: 'pending',
    },
    promptSentAt: { type: Date },
    expiresAt: { type: Date },
    matchedAt: { type: Date },
    investmentId: { type: Schema.Types.ObjectId, ref: 'Investment' },

    mismatchDetails: {
      amountDiff: { type: Number },
      equityDiff: { type: Number },
    },

    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate confirmations per deal
InvestmentConfirmationSchema.index(
  { startupId: 1, investorId: 1, pitchId: 1 },
  { unique: true }
);
InvestmentConfirmationSchema.index({ status: 1 });
InvestmentConfirmationSchema.index({ promptSentAt: 1 });

export const InvestmentConfirmation =
  mongoose.models.InvestmentConfirmation ||
  mongoose.model<IInvestmentConfirmation>('InvestmentConfirmation', InvestmentConfirmationSchema);
