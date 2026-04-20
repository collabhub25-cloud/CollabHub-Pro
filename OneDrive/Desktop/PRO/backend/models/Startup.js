import mongoose from 'mongoose';

// ============================================
// STARTUP MODEL — Mirrors existing Next.js Startup schema
// ============================================
const RoleNeededSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String }],
  compensationType: { type: String, enum: ['equity', 'cash', 'mixed'], required: true },
  equityPercent: { type: Number, min: 0, max: 100 },
  cashAmount: { type: Number },
  status: { type: String, enum: ['open', 'filled', 'closed'], default: 'open' },
});

const StartupSchema = new mongoose.Schema(
  {
    founderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    vision: { type: String, required: true, maxlength: 500 },
    description: { type: String, required: true, maxlength: 2000 },
    stage: { type: String, enum: ['idea', 'validation', 'mvp', 'growth', 'scaling'], required: true },
    industry: { type: String, required: true },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    rolesNeeded: [RoleNeededSchema],
    fundingStage: { type: String, enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'], required: true },
    fundingAmount: { type: Number },
    revenue: { type: Number },
    skillsNeeded: [{ type: String }],
    pastProgress: { type: String },
    achievements: { type: String },
    logo: { type: String },
    website: { type: String },
    pitchDeck: { type: String },
    isActive: { type: Boolean, default: true },
    AlloySphereVerified: { type: Boolean, default: false },
    AlloySphereVerifiedAt: { type: Date },
    AlloySphereVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: { type: String, maxlength: 2000 },

    // Verification workflow
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    verificationRequestedAt: { type: Date },
    verifiedAt: { type: Date },

    isBoosted: { type: Boolean, default: false },
    boostExpiresAt: { type: Date },
    profilePaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

export default mongoose.models.Startup || mongoose.model('Startup', StartupSchema);
