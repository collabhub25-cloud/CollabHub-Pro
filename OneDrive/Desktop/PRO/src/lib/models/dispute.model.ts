import mongoose, { Schema, Document } from 'mongoose';

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
