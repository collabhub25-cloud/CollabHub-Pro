import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// USER SCHEMA
// ============================================
export type UserRole = 'founder' | 'talent' | 'investor' | 'admin';
export type VerificationLevel = 0 | 1 | 2 | 3;
export type KYCStatus = 'pending' | 'verified' | 'rejected';

export interface IUser extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  avatar?: string;
  verificationLevel: VerificationLevel;
  trustScore: number;
  kycStatus: KYCStatus;
  bio?: string;
  skills?: string[];
  experience?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  location?: string;
  isEmailVerified: boolean;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    avatar: { type: String },
    verificationLevel: { type: Number, enum: [0, 1, 2, 3], default: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    bio: { type: String, maxlength: 1000 },
    skills: [{ type: String }],
    experience: { type: String },
    githubUrl: { type: String },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },
    location: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    lastActive: { type: Date },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ trustScore: -1 });

// ============================================
// STARTUP SCHEMA
// ============================================
export type StartupStage = 'idea' | 'validation' | 'mvp' | 'growth' | 'scaling';
export type FundingStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'ipo';

export interface IStartup extends Document {
  _id: string;
  founderId: mongoose.Types.ObjectId;
  name: string;
  vision: string;
  description: string;
  stage: StartupStage;
  industry: string;
  team: mongoose.Types.ObjectId[];
  rolesNeeded: IRoleNeeded[];
  fundingStage: FundingStage;
  fundingAmount?: number;
  revenue?: number;
  trustScore: number;
  logo?: string;
  website?: string;
  pitchDeck?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleNeeded {
  title: string;
  description: string;
  skills: string[];
  compensationType: 'equity' | 'cash' | 'mixed';
  equityPercent?: number;
  cashAmount?: number;
  status: 'open' | 'filled' | 'closed';
}

const RoleNeededSchema = new Schema<IRoleNeeded>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  skills: [{ type: String }],
  compensationType: { type: String, enum: ['equity', 'cash', 'mixed'], required: true },
  equityPercent: { type: Number, min: 0, max: 100 },
  cashAmount: { type: Number },
  status: { type: String, enum: ['open', 'filled', 'closed'], default: 'open' },
});

const StartupSchema = new Schema<IStartup>(
  {
    founderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    vision: { type: String, required: true, maxlength: 500 },
    description: { type: String, required: true, maxlength: 2000 },
    stage: { type: String, enum: ['idea', 'validation', 'mvp', 'growth', 'scaling'], required: true },
    industry: { type: String, required: true },
    team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    rolesNeeded: [RoleNeededSchema],
    fundingStage: { type: String, enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'], required: true },
    fundingAmount: { type: Number },
    revenue: { type: Number },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    logo: { type: String },
    website: { type: String },
    pitchDeck: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
StartupSchema.index({ founderId: 1 });
StartupSchema.index({ industry: 1 });
StartupSchema.index({ fundingStage: 1 });
StartupSchema.index({ trustScore: -1 });
StartupSchema.index({ stage: 1 });

// ============================================
// APPLICATION SCHEMA
// ============================================
export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'accepted' | 'rejected';

export interface IApplication extends Document {
  _id: string;
  startupId: mongoose.Types.ObjectId;
  talentId: mongoose.Types.ObjectId;
  roleId: string;
  status: ApplicationStatus;
  coverLetter: string;
  resumeUrl?: string;
  interviewNotes?: string;
  proposedEquity?: number;
  proposedCash?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    talentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'], default: 'pending' },
    coverLetter: { type: String, required: true, maxlength: 2000 },
    resumeUrl: { type: String },
    interviewNotes: { type: String },
    proposedEquity: { type: Number },
    proposedCash: { type: Number },
  },
  { timestamps: true }
);

// Indexes
ApplicationSchema.index({ startupId: 1 });
ApplicationSchema.index({ talentId: 1 });
ApplicationSchema.index({ status: 1 });

// ============================================
// AGREEMENT SCHEMA
// ============================================
export type AgreementType = 'NDA' | 'Work' | 'Equity' | 'SAFE';
export type AgreementStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated';

export interface IAgreement extends Document {
  _id: string;
  type: AgreementType;
  startupId: mongoose.Types.ObjectId;
  parties: mongoose.Types.ObjectId[];
  terms: {
    equityPercent?: number;
    vestingPeriod?: number;
    cliffPeriod?: number;
    deliverables?: string[];
    startDate?: Date;
    endDate?: Date;
    compensation?: number;
  };
  content: string;
  status: AgreementStatus;
  signedBy: {
    userId: mongoose.Types.ObjectId;
    signedAt: Date;
    signatureHash: string;
  }[];
  documentUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreement>(
  {
    type: { type: String, enum: ['NDA', 'Work', 'Equity', 'SAFE'], required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    parties: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    terms: {
      equityPercent: { type: Number, min: 0, max: 100 },
      vestingPeriod: { type: Number },
      cliffPeriod: { type: Number },
      deliverables: [{ type: String }],
      startDate: { type: Date },
      endDate: { type: Date },
      compensation: { type: Number },
    },
    content: { type: String, required: true },
    status: { type: String, enum: ['draft', 'pending_signature', 'signed', 'expired', 'terminated'], default: 'draft' },
    signedBy: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      signedAt: { type: Date },
      signatureHash: { type: String },
    }],
    documentUrl: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
AgreementSchema.index({ startupId: 1 });
AgreementSchema.index({ type: 1 });
AgreementSchema.index({ status: 1 });

// ============================================
// MILESTONE SCHEMA
// ============================================
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'disputed';
export type EscrowStatus = 'unfunded' | 'funded' | 'released' | 'refunded';

export interface IMilestone extends Document {
  _id: string;
  startupId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  agreementId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: MilestoneStatus;
  escrowStatus: EscrowStatus;
  escrowPaymentId?: string;
  completedAt?: Date;
  approvedAt?: Date;
  notes?: string;
  attachments?: string[];
  mediaUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agreementId: { type: Schema.Types.ObjectId, ref: 'Agreement' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'disputed'], default: 'pending' },
    escrowStatus: { type: String, enum: ['unfunded', 'funded', 'released', 'refunded'], default: 'unfunded' },
    escrowPaymentId: { type: String },
    completedAt: { type: Date },
    approvedAt: { type: Date },
    notes: { type: String },
    attachments: [{ type: String }],
    mediaUrls: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes
MilestoneSchema.index({ startupId: 1 });
MilestoneSchema.index({ assignedTo: 1 });
MilestoneSchema.index({ status: 1 });

// ============================================
// INVESTOR SCHEMA
// ============================================
export interface IInvestor extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  ticketSize: {
    min: number;
    max: number;
  };
  preferredIndustries: string[];
  stagePreference: FundingStage[];
  investmentThesis?: string;
  dealHistory: {
    startupId: mongoose.Types.ObjectId;
    amount: number;
    date: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    ticketSize: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    preferredIndustries: [{ type: String }],
    stagePreference: [{ type: String, enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'] }],
    investmentThesis: { type: String, maxlength: 2000 },
    dealHistory: [{
      startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
      amount: { type: Number },
      date: { type: Date },
    }],
  },
  { timestamps: true }
);

// Indexes
InvestorSchema.index({ userId: 1 });

// ============================================
// FUNDING ROUND SCHEMA
// ============================================
export type RoundStatus = 'open' | 'closing' | 'closed' | 'cancelled';

export interface IFundingRound extends Document {
  _id: string;
  startupId: mongoose.Types.ObjectId;
  roundName: string;
  targetAmount: number;
  raisedAmount: number;
  equityOffered: number;
  valuation: number;
  minInvestment: number;
  status: RoundStatus;
  investors: {
    investorId: mongoose.Types.ObjectId;
    amount: number;
    equityAllocated: number;
    investedAt: Date;
  }[];
  termSheetUrl?: string;
  closesAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FundingRoundSchema = new Schema<IFundingRound>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    roundName: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    raisedAmount: { type: Number, default: 0 },
    equityOffered: { type: Number, required: true, min: 0, max: 100 },
    valuation: { type: Number, required: true },
    minInvestment: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closing', 'closed', 'cancelled'], default: 'open' },
    investors: [{
      investorId: { type: Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number },
      equityAllocated: { type: Number },
      investedAt: { type: Date },
    }],
    termSheetUrl: { type: String },
    closesAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
FundingRoundSchema.index({ startupId: 1 });
FundingRoundSchema.index({ status: 1 });

// ============================================
// TRUST SCORE LOG SCHEMA
// ============================================
export interface ITrustScoreLog extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  scoreChange: number;
  reason: string;
  category: 'milestone' | 'agreement' | 'dispute' | 'funding' | 'response_time' | 'alliance' | 'other';
  createdAt: Date;
}

const TrustScoreLogSchema = new Schema<ITrustScoreLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    scoreChange: { type: Number, required: true },
    reason: { type: String, required: true },
    category: { type: String, enum: ['milestone', 'agreement', 'dispute', 'funding', 'response_time', 'alliance', 'other'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ============================================
// DISPUTE SCHEMA
// ============================================
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

export interface IDispute extends Document {
  _id: string;
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

// ============================================
// PAYMENT SCHEMA
// ============================================
export type PaymentType = 'milestone' | 'investment' | 'subscription' | 'commission';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  _id: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  fromUserId: mongoose.Types.ObjectId;
  toUserId?: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  milestoneId?: mongoose.Types.ObjectId;
  stripePaymentId?: string;
  stripeTransferId?: string;
  platformFee: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    type: { type: String, enum: ['milestone', 'investment', 'subscription', 'commission'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone' },
    stripePaymentId: { type: String },
    stripeTransferId: { type: String },
    platformFee: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ============================================
// SKILL TEST SCHEMA
// ============================================
export interface ISkillTest extends Document {
  _id: string;
  name: string;
  category: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  passingScore: number;
  duration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const SkillTestSchema = new Schema<ISkillTest>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    questions: [{
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true },
    }],
    passingScore: { type: Number, required: true, default: 70 },
    duration: { type: Number, required: true, default: 30 },
  },
  { timestamps: true }
);

// ============================================
// USER TEST RESULT SCHEMA
// ============================================
export interface IUserTestResult extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  score: number;
  passed: boolean;
  answers: number[];
  completedAt: Date;
}

const UserTestResultSchema = new Schema<IUserTestResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: Schema.Types.ObjectId, ref: 'SkillTest', required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    answers: [{ type: Number }],
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

// ============================================
// NOTIFICATION SCHEMA
// ============================================
export type NotificationType = 
  | 'application_received'
  | 'application_status'
  | 'agreement_signed'
  | 'milestone_created'
  | 'milestone_completed'
  | 'payment_success'
  | 'funding_update'
  | 'trust_score_change'
  | 'verification_update'
  | 'subscription_update'
  | 'alliance_request'
  | 'alliance_accepted'
  | 'alliance_rejected'
  | 'message_received';

export interface INotification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

// ============================================
// VERIFICATION SCHEMA (Role-Based)
// ============================================
export type VerificationLevelType = 0 | 1 | 2 | 3 | 4;
export type VerificationStatus = 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type VerificationType = 'profile' | 'skill_test' | 'resume' | 'kyc' | 'nda';

// Role-based verification level definitions
export const VERIFICATION_LEVELS = {
  talent: [
    { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
    { level: 1, type: 'skill_test' as const, name: 'Skill Test', description: 'Pass a skill assessment test' },
    { level: 2, type: 'resume' as const, name: 'Resume Upload', description: 'Upload your resume (PDF/DOCX, max 5MB)' },
    { level: 3, type: 'kyc' as const, name: 'KYC Verification', description: 'Upload ID proof for identity verification' },
    { level: 4, type: 'nda' as const, name: 'NDA Signed', description: 'Sign the Non-Disclosure Agreement' },
  ],
  founder: [
    { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
    { level: 1, type: 'kyc' as const, name: 'KYC Verification', description: 'Upload ID proof for identity verification' },
    { level: 2, type: 'nda' as const, name: 'NDA Signed', description: 'Sign the Non-Disclosure Agreement' },
  ],
  investor: [
    { level: 0, type: 'profile' as const, name: 'Profile Completion', description: 'Complete your profile information' },
    { level: 1, type: 'kyc' as const, name: 'KYC Verification', description: 'Upload ID proof for identity verification' },
    { level: 2, type: 'nda' as const, name: 'NDA Signed', description: 'Sign the Non-Disclosure Agreement' },
  ],
  admin: [], // Admins don't need verification
};

export interface IVerification extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  type: VerificationType;
  level: VerificationLevelType;
  status: VerificationStatus;
  documents?: {
    type: string;
    url: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt: Date;
  }[];
  testScore?: number;
  testPassed?: boolean;
  resumeUrl?: string;
  resumeFileName?: string;
  ndaSignedAt?: Date;
  ndaSignatureHash?: string;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    type: { type: String, enum: ['profile', 'skill_test', 'resume', 'kyc', 'nda'], required: true },
    level: { type: Number, enum: [0, 1, 2, 3, 4], required: true },
    status: { type: String, enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected'], default: 'pending' },
    documents: [{
      type: { type: String },
      url: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      uploadedAt: { type: Date },
    }],
    testScore: { type: Number },
    testPassed: { type: Boolean },
    resumeUrl: { type: String },
    resumeFileName: { type: String },
    ndaSignedAt: { type: Date },
    ndaSignatureHash: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

VerificationSchema.index({ userId: 1, type: 1 });
VerificationSchema.index({ userId: 1, role: 1 });
VerificationSchema.index({ status: 1 });

// ============================================
// SUBSCRIPTION SCHEMA
// ============================================

// NEW MONETIZATION MODEL: Only founders have subscription plans
// Legacy plans (free, pro, scale, premium) are mapped to founder plans
export type PlanType = 'free_founder' | 'pro_founder' | 'scale_founder' | 'enterprise_founder' | 'free' | 'pro' | 'scale' | 'premium';
export type FounderPlanType = 'free_founder' | 'pro_founder' | 'scale_founder' | 'enterprise_founder';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';

export interface ISubscription extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  plan: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  features: {
    maxProjects: number;
    maxTeamMembers: number;
    profileBoost: boolean;
    advancedAnalytics: boolean;
    earlyDealAccess: boolean;
    prioritySupport: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// All plan types supported (new founder plans + legacy for backward compatibility)
const ALL_PLANS = ['free_founder', 'pro_founder', 'scale_founder', 'enterprise_founder', 'free', 'pro', 'scale', 'premium'];

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['founder', 'talent', 'investor', 'admin'], required: true },
    plan: { type: String, enum: ALL_PLANS, default: 'free_founder' },
    status: { type: String, enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'], default: 'active' },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripePriceId: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    features: {
      maxProjects: { type: Number, default: 1 },
      maxTeamMembers: { type: Number, default: 5 },
      profileBoost: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      earlyDealAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ status: 1 });

// ============================================
// MESSAGE SCHEMA
// ============================================
export interface IMessage extends Document {
  _id: string;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId: string;
  content: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ createdAt: -1 });

// ============================================
// CONVERSATION SCHEMA
// ============================================
export interface IConversation extends Document {
  _id: string;
  participants: mongoose.Types.ObjectId[];
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    unreadCount: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

// ============================================
// EXPORT MODELS
// ============================================
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Startup = mongoose.models.Startup || mongoose.model<IStartup>('Startup', StartupSchema);
export const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
export const Agreement = mongoose.models.Agreement || mongoose.model<IAgreement>('Agreement', AgreementSchema);
export const Milestone = mongoose.models.Milestone || mongoose.model<IMilestone>('Milestone', MilestoneSchema);
export const Investor = mongoose.models.Investor || mongoose.model<IInvestor>('Investor', InvestorSchema);
export const FundingRound = mongoose.models.FundingRound || mongoose.model<IFundingRound>('FundingRound', FundingRoundSchema);
export const TrustScoreLog = mongoose.models.TrustScoreLog || mongoose.model<ITrustScoreLog>('TrustScoreLog', TrustScoreLogSchema);
export const Dispute = mongoose.models.Dispute || mongoose.model<IDispute>('Dispute', DisputeSchema);
export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
export const SkillTest = mongoose.models.SkillTest || mongoose.model<ISkillTest>('SkillTest', SkillTestSchema);
export const UserTestResult = mongoose.models.UserTestResult || mongoose.model<IUserTestResult>('UserTestResult', UserTestResultSchema);
export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
// Force re-registration of Verification model to pick up new enum values
delete mongoose.models.Verification;
export const Verification = mongoose.model<IVerification>('Verification', VerificationSchema);
export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
// ============================================
// ALLIANCE SCHEMA
// ============================================
export type AllianceStatus = 'pending' | 'accepted' | 'rejected';

export interface IAlliance extends Document {
  _id: string;
  requesterId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: AllianceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AllianceSchema = new Schema<IAlliance>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// Indexes
AllianceSchema.index({ requesterId: 1 });
AllianceSchema.index({ receiverId: 1 });
AllianceSchema.index({ status: 1 });
// Compound index for unique pending/accepted connections
AllianceSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true });

// ============================================
// EXPORT MODELS
// ============================================
delete mongoose.models.Message;
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
delete mongoose.models.Conversation;
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
delete mongoose.models.Alliance;
export const Alliance = mongoose.model<IAlliance>('Alliance', AllianceSchema);

// ============================================
// FAVORITE SCHEMA
// ============================================
export interface IFavorite extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FavoriteSchema.index({ userId: 1, startupId: 1 }, { unique: true });

// ============================================
// ACCESS REQUEST SCHEMA
// ============================================
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IAccessRequest extends Document {
  _id: string;
  investorId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  founderId: mongoose.Types.ObjectId;
  status: AccessRequestStatus;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
  {
    investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    founderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    message: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

AccessRequestSchema.index({ investorId: 1, startupId: 1 }, { unique: true });
AccessRequestSchema.index({ founderId: 1, status: 1 });

// ============================================
// INVESTMENT SCHEMA
// ============================================
export type InvestmentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface IInvestment extends Document {
  _id: string;
  investorId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  fundingRoundId: mongoose.Types.ObjectId;
  amount: number;
  equityPercent: number;
  status: InvestmentStatus;
  stripePaymentId?: string;
  stripeCheckoutSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    fundingRoundId: { type: Schema.Types.ObjectId, ref: 'FundingRound', required: true },
    amount: { type: Number, required: true },
    equityPercent: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
    stripePaymentId: { type: String },
    stripeCheckoutSessionId: { type: String },
  },
  { timestamps: true }
);

InvestmentSchema.index({ investorId: 1 });
InvestmentSchema.index({ startupId: 1 });
InvestmentSchema.index({ fundingRoundId: 1 });
InvestmentSchema.index({ status: 1 });

// ============================================
// EXPORT ADDITIONAL MODELS
// ============================================
delete mongoose.models.Favorite;
export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
delete mongoose.models.AccessRequest;
export const AccessRequest = mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);
delete mongoose.models.Investment;
export const Investment = mongoose.model<IInvestment>('Investment', InvestmentSchema);

// ============================================
// WEBHOOK EVENT SCHEMA (for deduplication)
// ============================================
export interface IWebhookEvent extends Document {
  _id: string;
  eventId: string;
  eventType: string;
  processedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WebhookEventSchema.index({ eventId: 1 }, { unique: true });
WebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 86400 * 7 }); // TTL: 7 days

export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

// ============================================
// ADDITIONAL INDEXES FOR SECURITY & PERFORMANCE
// ============================================

// TrustScoreLog indexes
TrustScoreLogSchema.index({ userId: 1, createdAt: -1 });

// Dispute indexes  
DisputeSchema.index({ userId: 1, status: 1 });
DisputeSchema.index({ raisedBy: 1, status: 1 });

// Payment indexes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ fromUserId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

// SkillTest indexes
SkillTestSchema.index({ category: 1, createdAt: -1 });

// UserTestResult indexes
UserTestResultSchema.index({ userId: 1, testId: 1 });
UserTestResultSchema.index({ userId: 1, passed: 1 });
