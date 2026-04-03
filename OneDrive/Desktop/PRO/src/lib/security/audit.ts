/**
 * Security Audit Logging Module
 * Comprehensive audit trail for security-sensitive operations
 */

import { createLogger } from '@/lib/logger';

const auditLogger = createLogger('security-audit');

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'EMAIL_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'SESSION_REFRESH'
  | 'SESSION_INVALIDATED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CSRF_VIOLATION'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ADMIN_ACTION'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'INVESTMENT_MADE'
  | 'SUBSCRIPTION_CHANGED';

export interface AuditEntry {
  action: AuditAction;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ip: string;
  userAgent: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  reason?: string;
}

/**
 * Log security audit event
 */
export function securityAudit(entry: AuditEntry): void {
  const logData = {
    ...entry,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Log level based on action severity
  const severeActions: AuditAction[] = [
    'LOGIN_FAILED',
    'ACCOUNT_LOCKED',
    'PERMISSION_DENIED',
    'RATE_LIMIT_EXCEEDED',
    'CSRF_VIOLATION',
    'SUSPICIOUS_ACTIVITY',
    'PAYMENT_FAILED',
  ];

  const criticalActions: AuditAction[] = [
    'ADMIN_ACTION',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET_COMPLETE',
    'SUBSCRIPTION_CHANGED',
  ];

  if (!entry.success && severeActions.includes(entry.action)) {
    auditLogger.warn(`AUDIT: ${entry.action}`, logData);
  } else if (criticalActions.includes(entry.action)) {
    auditLogger.info(`AUDIT: ${entry.action}`, logData);
  } else {
    auditLogger.info(`AUDIT: ${entry.action}`, logData);
  }

  // In production, you might also want to:
  // - Send to external SIEM (Security Information and Event Management)
  // - Store in a separate audit collection in MongoDB
  // - Send alerts for critical events
}

/**
 * Extract client info from request for audit logging
 */
export function getClientInfo(request: Request): { ip: string; userAgent: string } {
  const headers = request.headers;
  return {
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown',
    userAgent: headers.get('user-agent') || 'unknown',
  };
}

/**
 * Detect suspicious patterns in requests
 */
export interface SuspiciousActivityResult {
  suspicious: boolean;
  reasons: string[];
  riskScore: number;
}

export function detectSuspiciousActivity(
  ip: string,
  userAgent: string,
  loginAttempts?: number
): SuspiciousActivityResult {
  const reasons: string[] = [];
  let riskScore = 0;

  // Check for common bot user agents
  const botPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /scrapy/i,
    /httpclient/i,
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('Bot-like user agent detected');
    riskScore += 20;
  }

  // Check for missing or suspicious user agent
  if (!userAgent || userAgent === 'unknown' || userAgent.length < 10) {
    reasons.push('Missing or invalid user agent');
    riskScore += 15;
  }

  // Check for excessive login attempts
  if (loginAttempts && loginAttempts > 3) {
    reasons.push(`Excessive login attempts: ${loginAttempts}`);
    riskScore += loginAttempts * 10;
  }

  // Check for TOR exit nodes (simplified - in production use a proper list)
  if (ip.startsWith('185.220.') || ip.startsWith('185.129.')) {
    reasons.push('Possible TOR exit node');
    riskScore += 25;
  }

  return {
    suspicious: riskScore >= 30,
    reasons,
    riskScore,
  };
}
