import mongoose from 'mongoose';

// ============================================
// USER MODEL — Mirrors existing Next.js User schema
// ============================================
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, sparse: true, unique: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    avatar: { type: String },
    verificationLevel: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 0 },
    bio: { type: String, maxlength: 1000 },
    skills: [{ type: String }],
    interestedRoles: [{ type: String }],
    experience: { type: String },
    githubUrl: { type: String },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },
    location: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    verificationOtpHash: { type: String },
    verificationOtpExpires: { type: Date },
    verificationOtpAttempts: { type: Number, default: 0 },
    resetPasswordOtpHash: { type: String },
    resetPasswordOtpExpires: { type: Date },
    resetPasswordOtpAttempts: { type: Number, default: 0 },
    lastActive: { type: Date },
    skillTestScores: [{
      skill: { type: String },
      score: { type: Number },
      percentile: { type: Number },
      testId: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillTest' },
      completedAt: { type: Date },
    }],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
