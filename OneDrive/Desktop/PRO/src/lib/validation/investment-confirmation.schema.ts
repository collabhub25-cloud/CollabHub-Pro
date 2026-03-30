import { z } from 'zod';

// ============================================
// INVESTMENT CONFIRMATION VALIDATION SCHEMAS
// Ensures secure, independent submission of terms
// ============================================

/**
 * Founder's investment entry — submitted independently
 */
export const FounderInvestmentEntrySchema = z.object({
  confirmationId: z
    .string()
    .min(1, 'Confirmation ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid confirmation ID format'),
  founderAmount: z
    .number({ message: 'Investment amount is required' })
    .positive('Amount must be greater than 0')
    .max(1_000_000_000, 'Amount exceeds maximum'),
  founderEquity: z
    .number({ message: 'Equity percentage is required' })
    .min(0.001, 'Equity must be greater than 0')
    .max(100, 'Equity cannot exceed 100%'),
});

/**
 * Investor's investment entry — submitted independently
 */
export const InvestorInvestmentEntrySchema = z.object({
  confirmationId: z
    .string()
    .min(1, 'Confirmation ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid confirmation ID format'),
  investorAmount: z
    .number({ message: 'Investment amount is required' })
    .positive('Amount must be greater than 0')
    .max(1_000_000_000, 'Amount exceeds maximum'),
  investorEquity: z
    .number({ message: 'Equity percentage is required' })
    .min(0.001, 'Equity must be greater than 0')
    .max(100, 'Equity cannot exceed 100%'),
});

/**
 * Pitch request schema (investor requesting a pitch)
 */
export const PitchRequestSchema = z.object({
  startupId: z
    .string()
    .min(1, 'Startup ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid startup ID format'),
  message: z
    .string()
    .max(2000, 'Message must be under 2000 characters')
    .optional(),
});

/**
 * Send pitch schema (founder sending pitch to investor)
 */
export const SendPitchSchema = z.object({
  pitchId: z
    .string()
    .min(1, 'Pitch ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid pitch ID format'),
  pitchDocumentUrl: z
    .string()
    .url('Must be a valid URL')
    .max(2000, 'URL too long')
    .optional(),
  message: z
    .string()
    .max(2000, 'Message must be under 2000 characters')
    .optional(),
});

/**
 * Retry/re-entry schema
 */
export const RetryConfirmationSchema = z.object({
  confirmationId: z
    .string()
    .min(1, 'Confirmation ID is required')
    .regex(/^[a-fA-F0-9]{24}$/, 'Invalid confirmation ID format'),
});

export type FounderInvestmentEntry = z.infer<typeof FounderInvestmentEntrySchema>;
export type InvestorInvestmentEntry = z.infer<typeof InvestorInvestmentEntrySchema>;
export type PitchRequest = z.infer<typeof PitchRequestSchema>;
export type SendPitch = z.infer<typeof SendPitchSchema>;
