/**
 * AWS Configuration — AlloySphere Email System
 *
 * Centralized AWS configuration management.
 * All AWS service configurations are sourced from environment variables.
 */

export const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  ses: {
    fromAddress: process.env.AWS_SES_FROM_ADDRESS || 'noreply@alloysphere.online',
    fromName: process.env.AWS_SES_FROM_NAME || 'AlloySphere',
    configurationSet: process.env.AWS_SES_CONFIGURATION_SET || undefined,
  },
  sqs: {
    emailQueueUrl: process.env.AWS_SQS_EMAIL_QUEUE_URL || '',
    deadLetterQueueUrl: process.env.AWS_SQS_DLQ_URL || '',
  },
} as const;

/**
 * Validates that required AWS configuration is present.
 * Returns an array of missing config keys.
 */
export function validateAwsConfig(): string[] {
  const missing: string[] = [];

  if (!awsConfig.credentials.accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!awsConfig.credentials.secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!awsConfig.ses.fromAddress) missing.push('AWS_SES_FROM_ADDRESS');

  return missing;
}

/**
 * Checks if AWS SQS queue is configured for async processing.
 */
export function isSqsConfigured(): boolean {
  return !!awsConfig.sqs.emailQueueUrl;
}
