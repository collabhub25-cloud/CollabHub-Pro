import { z } from 'zod';

/**
 * User Registration Schema
 */
export const RegisterSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['founder', 'talent', 'investor'], {
    errorMap: () => ({ message: 'Invalid role selected' }),
  }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * User Login Schema
 */
export const LoginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * User Profile Update Schema
 */
export const ProfileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim()
    .optional(),
  bio: z.string()
    .max(1000, 'Bio must be at most 1000 characters')
    .optional(),
  skills: z.array(z.string().max(50))
    .max(20, 'Maximum 20 skills allowed')
    .optional(),
  experience: z.string()
    .max(2000, 'Experience must be at most 2000 characters')
    .optional(),
  githubUrl: z.string()
    .url('Invalid GitHub URL')
    .max(200, 'URL must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  linkedinUrl: z.string()
    .url('Invalid LinkedIn URL')
    .max(200, 'URL must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  portfolioUrl: z.string()
    .url('Invalid portfolio URL')
    .max(200, 'URL must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  location: z.string()
    .max(100, 'Location must be at most 100 characters')
    .optional(),
  avatar: z.string()
    .url('Invalid avatar URL')
    .max(500, 'Avatar URL must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

/**
 * Startup Creation Schema
 */
export const CreateStartupSchema = z.object({
  name: z.string()
    .min(2, 'Startup name must be at least 2 characters')
    .max(100, 'Startup name must be at most 100 characters')
    .trim(),
  vision: z.string()
    .min(10, 'Vision must be at least 10 characters')
    .max(500, 'Vision must be at most 500 characters'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  stage: z.enum(['idea', 'validation', 'mvp', 'growth', 'scaling'], {
    errorMap: () => ({ message: 'Invalid startup stage' }),
  }),
  industry: z.string()
    .min(1, 'Industry is required')
    .max(50, 'Industry must be at most 50 characters'),
  fundingStage: z.enum(['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'], {
    errorMap: () => ({ message: 'Invalid funding stage' }),
  }),
  fundingAmount: z.number()
    .min(0, 'Funding amount must be non-negative')
    .max(100000000000, 'Funding amount exceeds maximum')
    .optional(),
  revenue: z.number()
    .min(0, 'Revenue must be non-negative')
    .optional(),
  website: z.string()
    .url('Invalid website URL')
    .max(200, 'Website URL must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  rolesNeeded: z.array(z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500),
    skills: z.array(z.string().max(50)).max(20),
    compensationType: z.enum(['equity', 'cash', 'mixed']),
    equityPercent: z.number().min(0).max(100).optional(),
    cashAmount: z.number().min(0).optional(),
  })).max(10, 'Maximum 10 roles allowed').optional(),
});

export type CreateStartupInput = z.infer<typeof CreateStartupSchema>;

/**
 * Startup Update Schema
 */
export const StartupUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  vision: z.string().min(10).max(500).optional(),
  description: z.string().min(50).max(2000).optional(),
  stage: z.enum(['idea', 'validation', 'mvp', 'growth', 'scaling']).optional(),
  industry: z.string().min(1).max(50).optional(),
  fundingStage: z.enum(['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo']).optional(),
  fundingAmount: z.number().min(0).max(100000000000).optional(),
  revenue: z.number().min(0).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export type StartupUpdateInput = z.infer<typeof StartupUpdateSchema>;

/**
 * Milestone Creation Schema
 */
export const CreateMilestoneSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
  assignedTo: z.string().min(1, 'Assignee is required'),
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be at most 2000 characters'),
  amount: z.number()
    .min(1, 'Amount must be at least 1')
    .max(10000000, 'Amount exceeds maximum'),
  dueDate: z.string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;

/**
 * Milestone Update Schema
 */
export const MilestoneUpdateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  amount: z.number().min(1).max(10000000).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'disputed']).optional(),
  notes: z.string().max(1000).optional(),
});

export type MilestoneUpdateInput = z.infer<typeof MilestoneUpdateSchema>;

/**
 * Alliance Request Schema
 */
export const AllianceRequestSchema = z.object({
  receiverId: z.string()
    .min(1, 'Receiver ID is required')
    .max(100, 'Invalid receiver ID'),
});

export type AllianceRequestInput = z.infer<typeof AllianceRequestSchema>;

/**
 * Alliance Action Schema (accept/reject)
 */
export const AllianceActionSchema = z.object({
  allianceId: z.string()
    .min(1, 'Alliance ID is required')
    .max(100, 'Invalid alliance ID'),
});

export type AllianceActionInput = z.infer<typeof AllianceActionSchema>;

/**
 * Message Schema
 */
export const SendMessageSchema = z.object({
  receiverId: z.string()
    .min(1, 'Receiver ID is required'),
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be at most 5000 characters'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

/**
 * Search Query Schema
 */
export const SearchQuerySchema = z.object({
  query: z.string()
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
  industry: z.string().max(50).optional(),
  stage: z.string().max(50).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  minTicket: z.number().min(0).optional(),
  maxTicket: z.number().max(100000000000).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

/**
 * Subscription Checkout Schema
 * Only founders can checkout, and they use founder-specific plans
 */
export const CheckoutSchema = z.object({
  plan: z.enum(['pro', 'scale', 'premium', 'pro_founder', 'scale_founder', 'enterprise_founder'], {
    errorMap: () => ({ message: 'Invalid plan selected' }),
  }),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

/**
 * Application Schema
 */
export const CreateApplicationSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
  coverLetter: z.string()
    .min(50, 'Cover letter must be at least 50 characters')
    .max(2000, 'Cover letter must be at most 2000 characters'),
  proposedEquity: z.number().min(0).max(100).optional(),
  proposedCash: z.number().min(0).optional(),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;

/**
 * Notification ID Schema
 */
export const NotificationIdSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

/**
 * Funding Round Schema
 */
export const CreateFundingRoundSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
  roundName: z.string().min(1, 'Round name is required').max(100),
  targetAmount: z.number().min(1000, 'Minimum target is $1,000').max(100000000000, 'Amount exceeds maximum'),
  equityOffered: z.number().min(0.01, 'Minimum equity is 0.01%').max(100, 'Maximum equity is 100%'),
  valuation: z.number().min(10000, 'Minimum valuation is $10,000').max(1000000000000, 'Valuation exceeds maximum'),
  minInvestment: z.number().min(100, 'Minimum investment is $100').max(100000000, 'Investment exceeds maximum'),
  closesAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date').optional(),
});

export type CreateFundingRoundInput = z.infer<typeof CreateFundingRoundSchema>;

/**
 * Investment Schema
 */
export const CreateInvestmentSchema = z.object({
  roundId: z.string().min(1, 'Round ID is required'),
  amount: z.number().min(100, 'Minimum investment is $100').max(100000000, 'Investment exceeds maximum'),
});

export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>;

/**
 * Access Request Schema
 */
export const AccessRequestSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
  message: z.string().max(500, 'Message must be at most 500 characters').optional(),
});

export type AccessRequestInput = z.infer<typeof AccessRequestSchema>;

/**
 * Application Update Schema
 */
export const ApplicationUpdateSchema = z.object({
  id: z.string().min(1, 'Application ID is required'),
  status: z.enum(['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected']),
  interviewNotes: z.string().max(1000).optional(),
});

export type ApplicationUpdateInput = z.infer<typeof ApplicationUpdateSchema>;

/**
 * Favorite Schema
 */
export const FavoriteSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
});

export type FavoriteInput = z.infer<typeof FavoriteSchema>;

/**
 * Agreement Sign Schema
 */
export const AgreementSignSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export type AgreementSignInput = z.infer<typeof AgreementSignSchema>;

/**
 * Milestone ID Schema (for common ID validation)
 */
export const MilestoneIdSchema = z.object({
  milestoneId: z.string().min(1, 'Milestone ID is required'),
});

export type MilestoneIdInput = z.infer<typeof MilestoneIdSchema>;

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => 
    `${err.path.join('.')}: ${err.message}`
  );
  
  return { success: false, errors };
}
