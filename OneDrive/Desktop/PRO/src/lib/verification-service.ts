// Verification Service - Role-based verification logic
import { VERIFICATION_LEVELS, UserRole, VerificationType } from '@/lib/models';

export interface VerificationLevelInfo {
  level: number;
  type: VerificationType;
  name: string;
  description: string;
}

export interface RequiredLevelsResponse {
  role: UserRole;
  totalLevels: number;
  levels: VerificationLevelInfo[];
}

/**
 * Get required verification levels based on user role
 */
export function getRequiredLevels(role: UserRole): RequiredLevelsResponse {
  const levels = VERIFICATION_LEVELS[role] || [];
  
  return {
    role,
    totalLevels: levels.length,
    levels: levels.map(l => ({
      level: l.level,
      type: l.type,
      name: l.name,
      description: l.description,
    })),
  };
}

/**
 * Check if a verification type is allowed for a role
 */
export function isVerificationTypeAllowed(role: UserRole, type: VerificationType): boolean {
  const requiredLevels = getRequiredLevels(role);
  return requiredLevels.levels.some(l => l.type === type);
}

/**
 * Get the level number for a verification type for a specific role
 */
export function getLevelForType(role: UserRole, type: VerificationType): number | null {
  const requiredLevels = getRequiredLevels(role);
  const levelInfo = requiredLevels.levels.find(l => l.type === type);
  return levelInfo ? levelInfo.level : null;
}

/**
 * Check if skill test is allowed for role (only talent)
 */
export function canTakeSkillTest(role: UserRole): boolean {
  return role === 'talent';
}

/**
 * Check if resume upload is allowed for role (only talent)
 */
export function canUploadResume(role: UserRole): boolean {
  return role === 'talent';
}

/**
 * Calculate verification progress percentage
 */
export function calculateProgress(currentLevel: number, role: UserRole): number {
  const requiredLevels = getRequiredLevels(role);
  if (requiredLevels.totalLevels === 0) return 100;
  
  // currentLevel is 0-indexed, so add 1 for completed levels
  const completedLevels = currentLevel + 1;
  return Math.min(100, Math.round((completedLevels / requiredLevels.totalLevels) * 100));
}

/**
 * Check if all verification levels are completed
 */
export function isVerificationComplete(currentLevel: number, role: UserRole): boolean {
  const requiredLevels = getRequiredLevels(role);
  return currentLevel >= requiredLevels.totalLevels - 1;
}

/**
 * Validate file type for resume upload
 */
export function validateResumeFile(mimeType: string, fileName: string): { valid: boolean; error?: string } {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (!allowedMimeTypes.includes(mimeType) && !allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF and DOCX files are allowed.',
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size for resume upload (max 5MB)
 */
export function validateResumeFileSize(sizeInBytes: number): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (sizeInBytes > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit.',
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  let sanitized = fileName.split('/').pop() || fileName;
  sanitized = sanitized.split('\\').pop() || sanitized;
  
  // Remove special characters except dots and dashes
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 100 - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Generate unique file key for S3 storage
 */
export function generateFileKey(userId: string, type: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(fileName);
  return `verifications/${userId}/${type}/${timestamp}-${sanitized}`;
}
