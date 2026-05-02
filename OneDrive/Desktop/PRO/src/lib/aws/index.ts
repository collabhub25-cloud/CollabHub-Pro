/**
 * AWS Email Module — Public API
 *
 * Re-exports the complete AWS email notification system.
 * Import from '@/lib/aws' for all email-related functionality.
 */

// Configuration
export { awsConfig, validateAwsConfig, isSqsConfigured } from './config';

// SES Client
export { sendEmailViaSes, sendTemplatedEmail } from './ses-client';
export type { SesEmailOptions, SesEmailResult } from './ses-client';

// SQS Queue
export { enqueueEmail, receiveEmails, deleteProcessedMessage } from './sqs-client';
export type { EmailQueueMessage } from './sqs-client';

// Email Dispatcher (high-level API)
export { dispatchEmail, dispatchEmailBatch } from './email-queue';
export type { EmailDispatchOptions, EmailDispatchResult, EmailPriority } from './email-queue';

// Queue Consumer (Lambda / Worker)
export { lambdaHandler, processEmailQueue } from './email-consumer';

// CloudWatch Logging
export { logEmailEvent, EmailEvent, EmailLogLevel, createTimer, createMetricData } from './cloudwatch-logger';

// Bedrock AI (Claude)
export {
  invokeBedrockModel,
  BEDROCK_MODEL_ID,
  DEFAULT_SYSTEM_PROMPT,
} from './bedrock-client';
export type { BedrockInvokeOptions, BedrockResponse } from './bedrock-client';
