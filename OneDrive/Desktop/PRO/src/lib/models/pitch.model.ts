import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// PITCH SCHEMA
// Lifecycle: requested → sent → invested/rejected/expired
// ============================================

export type PitchStatus = 'requested' | 'sent' | 'rejected' | 'invested' | 'expired';

export interface IPitch extends Document {
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  pitchStatus: PitchStatus;
  message?: string;
  amountRequested?: number;
  equityOffered?: number;

  // Pitch document (sent by founder)
  pitchDocumentUrl?: string;
  pitchMessage?: string;
  pitchSentAt?: Date;

  // Timer tracking
  confirmationTriggeredAt?: Date; // When 2-hour timer triggered

  createdAt: Date;
  updatedAt: Date;
}

const PitchSchema = new Schema<IPitch>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pitchStatus: {
      type: String,
      enum: ['requested', 'sent', 'rejected', 'invested', 'expired'],
      default: 'requested',
    },
    message: { type: String, maxlength: 2000 },
    amountRequested: { type: Number },
    equityOffered: { type: Number, min: 0, max: 100 },

    // Pitch document fields
    pitchDocumentUrl: { type: String, maxlength: 2000 },
    pitchMessage: { type: String, maxlength: 2000 },
    pitchSentAt: { type: Date },

    // Timer tracking
    confirmationTriggeredAt: { type: Date },
  },
  { timestamps: true }
);

PitchSchema.index({ startupId: 1, investorId: 1 });
PitchSchema.index({ pitchStatus: 1 });
PitchSchema.index({ pitchSentAt: 1 });

export const Pitch = mongoose.models.Pitch || mongoose.model<IPitch>('Pitch', PitchSchema);
