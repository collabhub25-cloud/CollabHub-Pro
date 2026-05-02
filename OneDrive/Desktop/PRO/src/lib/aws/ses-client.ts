/**
 * AWS SES Client — AlloySphere Email System
 *
 * Direct Amazon SES email sender with retry logic.
 * Replaces nodemailer's SMTP transport with AWS SDK v3.
 *
 * Features:
 * - Exponential backoff retry (3 attempts)
 * - Structured CloudWatch logging
 * - HTML + plain text email support
 * - Bounce/complaint handling via SES configuration sets
 */

import { SESClient, SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';
import { awsConfig, validateAwsConfig } from './config';
import { logEmailEvent, EmailEvent, EmailLogLevel, createTimer } from './cloudwatch-logger';

let sesClient: SESClient | null = null;

/**
 * Gets or creates the SES client singleton.
 */
function getClient(): SESClient {
  if (!sesClient) {
    const missing = validateAwsConfig();
    if (missing.length > 0) {
      throw new Error(`AWS SES configuration missing: ${missing.join(', ')}`);
    }

    sesClient = new SESClient({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
  }
  return sesClient;
}

export interface SesEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Custom from address override */
  from?: string;
  /** Additional headers / tags for tracking */
  tags?: { Name: string; Value: string }[];
}

export interface SesEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an email via Amazon SES with automatic retry.
 *
 * @param options - Email parameters
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Result with messageId on success
 */
export async function sendEmailViaSes(
  options: SesEmailOptions,
  maxRetries = 3
): Promise<SesEmailResult> {
  const timer = createTimer();
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const fromAddress = options.from
    || `${awsConfig.ses.fromName} <${awsConfig.ses.fromAddress}>`;

  const params: SendEmailCommandInput = {
    Source: fromAddress,
    Destination: {
      ToAddresses: recipients,
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: options.subject,
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: options.html,
        },
        ...(options.text && {
          Text: {
            Charset: 'UTF-8',
            Data: options.text,
          },
        }),
      },
    },
    ...(options.replyTo && {
      ReplyToAddresses: [options.replyTo],
    }),
    ...(awsConfig.ses.configurationSet && {
      ConfigurationSetName: awsConfig.ses.configurationSet,
    }),
    ...(options.tags && {
      Tags: options.tags,
    }),
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getClient();
      const command = new SendEmailCommand(params);
      const result = await client.send(command);

      timer.logCompletion(EmailEvent.SENT, {
        messageId: result.MessageId,
        recipient: recipients.join(', '),
        metadata: { attempt, subject: options.subject },
      });

      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logEmailEvent(EmailEvent.RETRY, EmailLogLevel.WARN, {
        recipient: recipients.join(', '),
        error: lastError.message,
        metadata: {
          attempt,
          maxRetries,
          subject: options.subject,
        },
      });

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      }
    }
  }

  // All retries exhausted
  logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
    recipient: recipients.join(', '),
    error: lastError?.message || 'Unknown error',
    metadata: { subject: options.subject, attempts: maxRetries },
  });

  return {
    success: false,
    error: lastError?.message || 'Failed to send email after retries',
  };
}

/**
 * Sends a templated email via SES.
 * This is a convenience wrapper that builds HTML from a template type.
 */
export async function sendTemplatedEmail(
  to: string,
  templateType: string,
  templateData: Record<string, unknown>,
  subject: string,
  html: string
): Promise<SesEmailResult> {
  return sendEmailViaSes({
    to,
    subject,
    html,
    tags: [
      { Name: 'TemplateType', Value: templateType },
      { Name: 'Platform', Value: 'AlloySphere' },
    ],
  });
}
