import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// SKILL TEST MODELS
// Structured assessments for talent evaluation
// ============================================

// --- Question Schema (embedded in SkillTest) ---
export interface ISkillTestQuestion {
  question: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  explanation?: string;
}

const SkillTestQuestionSchema = new Schema<ISkillTestQuestion>({
  question: { type: String, required: true, maxlength: 1000 },
  options: {
    type: [String],
    required: true,
    validate: [(val: string[]) => val.length >= 2 && val.length <= 6, 'Must have 2-6 options'],
  },
  correctOptionIndex: { type: Number, required: true, min: 0 },
  points: { type: Number, default: 1, min: 1 },
  explanation: { type: String, maxlength: 500 },
}, { _id: true });

// --- SkillTest Schema ---
export type TestDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ISkillTest extends Document {
  title: string;
  skill: string;
  description: string;
  difficulty: TestDifficulty;
  durationMinutes: number;
  questions: ISkillTestQuestion[];
  totalPoints: number;
  passingScore: number;
  isActive: boolean;
  attemptCount: number;
  averageScore: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SkillTestSchema = new Schema<ISkillTest>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    skill: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, maxlength: 1000 },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 180 },
    questions: {
      type: [SkillTestQuestionSchema],
      required: true,
      validate: [(val: ISkillTestQuestion[]) => val.length >= 1, 'Must have at least 1 question'],
    },
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 60 }, // percentage
    isActive: { type: Boolean, default: true },
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Calculate totalPoints before validation
SkillTestSchema.pre('validate', function() {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  }
});

SkillTestSchema.index({ skill: 1, difficulty: 1 });
SkillTestSchema.index({ isActive: 1 });

export const SkillTest =
  mongoose.models.SkillTest || mongoose.model<ISkillTest>('SkillTest', SkillTestSchema);

// --- UserTestAttempt Schema ---
export type AttemptStatus = 'in_progress' | 'completed' | 'timed_out';

export interface IUserAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect?: boolean;
  pointsEarned?: number;
}

const UserAnswerSchema = new Schema<IUserAnswer>({
  questionId: { type: String, required: true },
  selectedOptionIndex: { type: Number, required: true, min: 0 },
  isCorrect: { type: Boolean },
  pointsEarned: { type: Number, default: 0 },
}, { _id: false });

export interface IUserTestAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  answers: IUserAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
  percentile: number;
  passed: boolean;
  status: AttemptStatus;
  startedAt: Date;
  completedAt?: Date;
  timeSpentSeconds: number;
  createdAt: Date;
}

const UserTestAttemptSchema = new Schema<IUserTestAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: Schema.Types.ObjectId, ref: 'SkillTest', required: true },
    answers: [UserAnswerSchema],
    score: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    percentile: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    status: { type: String, enum: ['in_progress', 'completed', 'timed_out'], default: 'in_progress' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UserTestAttemptSchema.index({ userId: 1, testId: 1 });
UserTestAttemptSchema.index({ testId: 1, percentage: -1 }); // for percentile calc
UserTestAttemptSchema.index({ userId: 1, status: 1 });

export const UserTestAttempt =
  mongoose.models.UserTestAttempt || mongoose.model<IUserTestAttempt>('UserTestAttempt', UserTestAttemptSchema);
