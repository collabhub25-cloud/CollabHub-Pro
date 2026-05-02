/**
 * CloudWatch Logger — AlloySphere AWS Integration
 *
 * Structured logging utility for email delivery tracking.
 * Logs email events with structured metadata for CloudWatch.
 * Falls back to console logging when CloudWatch SDK is not available.
 *
 * In production, these structured logs are automatically captured by:
 * - AWS Lambda → CloudWatch Logs (automatic)
 * - AWS ECS/Fargate → CloudWatch Logs (via awslogs driver)
 * - EC2 → CloudWatch Agent
 */

export enum EmailLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum EmailEvent {
  QUEUED = 'EMAIL_QUEUED',
  SENT = 'EMAIL_SENT',
  DELIVERED = 'EMAIL_DELIVERED',
  BOUNCED = 'EMAIL_BOUNCED',
  COMPLAINT = 'EMAIL_COMPLAINT',
  FAILED = 'EMAIL_FAILED',
  RETRY = 'EMAIL_RETRY',
  DLQ = 'EMAIL_DLQ',
  RATE_LIMITED = 'EMAIL_RATE_LIMITED',
  DEDUPLICATED = 'EMAIL_DEDUPLICATED',
}

interface EmailLogEntry {
  timestamp: string;
  level: EmailLogLevel;
  event: EmailEvent;
  messageId?: string;
  recipient?: string;
  templateType?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
}

/**
 * Logs a structured email event for CloudWatch ingestion.
 * Uses JSON structured logging format compatible with CloudWatch Logs Insights.
 */
export function logEmailEvent(
  event: EmailEvent,
  level: EmailLogLevel = EmailLogLevel.INFO,
  details: Partial<Omit<EmailLogEntry, 'timestamp' | 'level' | 'event'>> = {}
): void {
  const entry: EmailLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  // Structured JSON logging — CloudWatch Logs Insights can parse this directly
  const logLine = JSON.stringify({
    ...entry,
    service: 'alloysphere-email',
    environment: process.env.NODE_ENV || 'development',
  });

  switch (level) {
    case EmailLogLevel.ERROR:
      console.error(logLine);
      break;
    case EmailLogLevel.WARN:
      console.warn(logLine);
      break;
    case EmailLogLevel.DEBUG:
      if (process.env.NODE_ENV !== 'production') {
        console.debug(logLine);
      }
      break;
    default:
      console.log(logLine);
  }
}

/**
 * Creates a CloudWatch metric data point for email delivery tracking.
 * These are designed to be used with CloudWatch custom metrics.
 */
export function createMetricData(event: EmailEvent): {
  metricName: string;
  dimensions: { Name: string; Value: string }[];
  value: number;
  unit: string;
} {
  const metricMap: Record<string, string> = {
    [EmailEvent.SENT]: 'EmailsSent',
    [EmailEvent.DELIVERED]: 'EmailsDelivered',
    [EmailEvent.BOUNCED]: 'EmailsBounced',
    [EmailEvent.COMPLAINT]: 'EmailComplaints',
    [EmailEvent.FAILED]: 'EmailsFailed',
    [EmailEvent.RETRY]: 'EmailRetries',
    [EmailEvent.DLQ]: 'EmailsDLQ',
  };

  return {
    metricName: metricMap[event] || 'EmailEvents',
    dimensions: [
      { Name: 'Service', Value: 'AlloySphere' },
      { Name: 'EventType', Value: event },
    ],
    value: 1,
    unit: 'Count',
  };
}

/**
 * Utility to measure and log email sending duration.
 */
export function createTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    logCompletion: (event: EmailEvent, details: Partial<EmailLogEntry> = {}) => {
      logEmailEvent(event, EmailLogLevel.INFO, {
        ...details,
        durationMs: Date.now() - start,
      });
    },
  };
}
