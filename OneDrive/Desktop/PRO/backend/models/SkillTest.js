import mongoose from 'mongoose';

// ============================================
// SKILL TEST MODEL — Referenced by User.skillTestScores.testId
// Minimal schema to satisfy AdminJS reference resolution
// ============================================
const SkillTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    skill: { type: String, required: true, trim: true },
    description: { type: String, maxlength: 1000 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    durationMinutes: { type: Number },
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.SkillTest || mongoose.model('SkillTest', SkillTestSchema);
