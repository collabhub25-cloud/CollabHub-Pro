/**
 * Email Queue Dispatcher — AlloySphere AWS Integration
 *
 * High-level email dispatch service that routes emails through the
 * appropriate channel based on configuration:
 *
 * 1. SQS Queue (preferred) → Lambda consumer → SES
 * 2. Direct SES (fallback for high-priority or when SQS is unavailable)
 * 3. Legacy SMTP (fallback when AWS is not configured)
 *
 * This module replaces the direct email sending in the existing
 * email-service.ts with queue-based async processing.
 */

import { sendEmailViaSes, type SesEmailResult } from './ses-client';
import { enqueueEmail, type EmailQueueMessage } from './sqs-client';
import { logEmailEvent, EmailEvent, EmailLogLevel, createTimer } from './cloudwatch-logger';
import { validateAwsConfig, isSqsConfigured } from './config';

export type EmailPriority = 'high' | 'normal' | 'low';

export interface EmailDispatchOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType: string;
  templateData?: Record<string, unknown>;
  priority?: EmailPriority;
  /** Force synchronous sending (bypasses queue) */
  forceSynchronous?: boolean;
  /** Deduplication key to prevent duplicate sends */
  deduplicationKey?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  channel: 'sqs' | 'ses-direct' | 'smtp-fallback';
  error?: string;
}

// In-memory deduplication cache (per-process, resets on restart)
const deduplicationCache = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Dispatches an email through the optimal channel.
 *
 * Routing logic:
 * 1. If SQS is configured and priority is not 'high': enqueue to SQS
 * 2. If SQS is unavailable or priority is 'high': send directly via SES
 * 3. If AWS is not configured: fall back to legacy SMTP
 */
export async function dispatchEmail(
  options: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  const timer = createTimer();

  // Deduplication check
  if (options.deduplicationKey) {
    const lastSent = deduplicationCache.get(options.deduplicationKey);
    if (lastSent && Date.now() - lastSent < DEDUP_TTL_MS) {
      logEmailEvent(EmailEvent.DEDUPLICATED, EmailLogLevel.INFO, {
        recipient: options.to,
        templateType: options.templateType,
        metadata: { deduplicationKey: options.deduplicationKey },
      });
      return {
        success: true,
        channel: 'sqs',
        messageId: 'deduplicated',
      };
    }
  }

  // Check if AWS is configured
  const missingConfig = validateAwsConfig();
  if (missingConfig.length > 0) {
    // Fall back to legacy SMTP
    logEmailEvent(EmailEvent.FAILED, EmailLogLevel.WARN, {
      recipient: options.to,
      metadata: {
        reason: 'AWS not configured, falling back to SMTP',
        missingConfig,
      },
    });
    return {
      success: false,
      channel: 'smtp-fallback',
      error: `AWS config missing: ${missingConfig.join(', ')}. Use legacy SMTP.`,
    };
  }

  // Route: SQS queue for async processing
  if (
    isSqsConfigured() &&
    !options.forceSynchronous &&
    options.priority !== 'high'
  ) {
    const queueMessage: EmailQueueMessage = {
      deduplicationId: options.deduplicationKey || `${options.to}-${options.templateType}-${Date.now()}`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      templateType: options.templateType,
      templateData: options.templateData,
      priority: options.priority || 'normal',
      queuedAt: new Date().toISOString(),
    };

    const queueResult = await enqueueEmail(queueMessage);

    if (queueResult.success) {
      // Mark deduplication
      if (options.deduplicationKey) {
        deduplicationCache.set(options.deduplicationKey, Date.now());
        cleanupDeduplicationCache();
      }

      timer.logCompletion(EmailEvent.QUEUED, {
        recipient: options.to,
        templateType: options.templateType,
        messageId: queueResult.messageId,
      });

      return {
        success: true,
        messageId: queueResult.messageId,
        channel: 'sqs',
      };
    }

    // SQS failed — fall through to direct SES
    logEmailEvent(EmailEvent.FAILED, EmailLogLevel.WARN, {
      recipient: options.to,
      error: queueResult.error,
      metadata: { fallback: 'ses-direct' },
    });
  }

  // Route: Direct SES (high priority or SQS unavailable)
  const sesResult: SesEmailResult = await sendEmailViaSes({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    tags: [
      { Name: 'TemplateType', Value: options.templateType },
      { Name: 'Priority', Value: options.priority || 'normal' },
    ],
  });

  if (sesResult.success && options.deduplicationKey) {
    deduplicationCache.set(options.deduplicationKey, Date.now());
    cleanupDeduplicationCache();
  }

  return {
    success: sesResult.success,
    messageId: sesResult.messageId,
    channel: 'ses-direct',
    error: sesResult.error,
  };
}

/**
 * Periodic cleanup of expired deduplication entries.
 */
function cleanupDeduplicationCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > DEDUP_TTL_MS) {
      deduplicationCache.delete(key);
    }
  }
}

/**
 * Batch dispatch for sending multiple emails efficiently.
 * Queues all emails to SQS for bulk processing.
 */
export async function dispatchEmailBatch(
  emails: EmailDispatchOptions[]
): Promise<EmailDispatchResult[]> {
  const results = await Promise.allSettled(
    emails.map(email => dispatchEmail(email))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      success: false,
      channel: 'ses-direct' as const,
      error: result.reason?.message || 'Batch dispatch failed',
    };
  });
}
