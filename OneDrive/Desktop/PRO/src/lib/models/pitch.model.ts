import mongoose, { Schema, Document } from 'mongoose';

export type PitchStatus = 'pending' | 'accepted' | 'rejected';

export interface IPitch extends Document {
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  pitchStatus: PitchStatus;
  message?: string;
  amountRequested?: number;
  equityOffered?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PitchSchema = new Schema<IPitch>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pitchStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    message: { type: String, maxlength: 2000 },
    amountRequested: { type: Number },
    equityOffered: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

PitchSchema.index({ startupId: 1, investorId: 1 });

export const Pitch = mongoose.models.Pitch || mongoose.model<IPitch>('Pitch', PitchSchema);
