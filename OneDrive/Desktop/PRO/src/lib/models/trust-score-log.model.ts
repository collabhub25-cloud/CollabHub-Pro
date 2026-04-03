import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustScoreLog extends Document {
  userId: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  scoreChange: number;
  reason: string;
  category: 'milestone' | 'dispute' | 'funding' | 'response_time' | 'alliance' | 'other';
  createdAt: Date;
}

const TrustScoreLogSchema = new Schema<ITrustScoreLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    scoreChange: { type: Number, required: true },
    reason: { type: String, required: true },
    category: { type: String, enum: ['milestone', 'dispute', 'funding', 'response_time', 'alliance', 'other'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TrustScoreLog = mongoose.models.TrustScoreLog || mongoose.model<ITrustScoreLog>('TrustScoreLog', TrustScoreLogSchema);
