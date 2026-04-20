import mongoose from 'mongoose';

// ============================================
// PITCH MODEL — Mirrors existing Next.js Pitch schema
// ============================================
const PitchSchema = new mongoose.Schema(
  {
    startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    founderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pitchStatus: {
      type: String,
      enum: ['requested', 'sent', 'pending', 'viewed', 'interested', 'rejected', 'invested', 'expired'],
      default: 'requested',
    },
    title: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    message: { type: String, maxlength: 2000 },
    amountRequested: { type: Number },
    equityOffered: { type: Number, min: 0, max: 100 },
    pitchDocumentUrl: { type: String, maxlength: 2000 },
    pitchMessage: { type: String, maxlength: 2000 },
    pitchSentAt: { type: Date },
    confirmationTriggeredAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Pitch || mongoose.model('Pitch', PitchSchema);
