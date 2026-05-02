/**
 * AWS SQS Client — AlloySphere Email Queue
 *
 * Message queue producer/consumer for asynchronous email processing.
 * Decouples email sending from API responses for non-blocking delivery.
 *
 * Architecture:
 * API Route → SQS Queue → Email Processor → SES
 *                ↓ (on failure)
 *           Dead Letter Queue → CloudWatch Alert
 */

import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { awsConfig, isSqsConfigured } from './config';
import { logEmailEvent, EmailEvent, EmailLogLevel } from './cloudwatch-logger';

let sqsClient: SQSClient | null = null;

function getClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
  }
  return sqsClient;
}

export interface EmailQueueMessage {
  /** Unique ID for deduplication */
  deduplicationId: string;
  /** Email recipient */
  to: string;
  /** Email subject */
  subject: string;
  /** HTML body */
  html: string;
  /** Plain text fallback */
  text?: string;
  /** Template type for tracking */
  templateType: string;
  /** Template data for rendering */
  templateData?: Record<string, unknown>;
  /** Priority: 'high' messages bypass queue in fallback mode */
  priority?: 'high' | 'normal' | 'low';
  /** Timestamp when queued */
  queuedAt: string;
}

/**
 * Enqueues an email message to SQS for async processing.
 * Returns the SQS message ID on success.
 */
export async function enqueueEmail(message: EmailQueueMessage): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!isSqsConfigured()) {
    logEmailEvent(EmailEvent.QUEUED, EmailLogLevel.WARN, {
      recipient: message.to,
      metadata: { reason: 'SQS not configured, skipping queue' },
    });
    return { success: false, error: 'SQS queue not configured' };
  }

  try {
    const client = getClient();
    const command = new SendMessageCommand({
      QueueUrl: awsConfig.sqs.emailQueueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        templateType: {
          DataType: 'String',
          StringValue: message.templateType,
        },
        priority: {
          DataType: 'String',
          StringValue: message.priority || 'normal',
        },
      },
      // Use deduplication ID for FIFO queues (if configured)
      ...(awsConfig.sqs.emailQueueUrl.endsWith('.fifo') && {
        MessageDeduplicationId: message.deduplicationId,
        MessageGroupId: 'email-notifications',
      }),
    });

    const result = await client.send(command);

    logEmailEvent(EmailEvent.QUEUED, EmailLogLevel.INFO, {
      messageId: result.MessageId,
      recipient: message.to,
      templateType: message.templateType,
      metadata: { priority: message.priority },
    });

    return { success: true, messageId: result.MessageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
      recipient: message.to,
      templateType: message.templateType,
      error: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Receives messages from the SQS queue for processing.
 * Used by the Lambda consumer or a background worker.
 *
 * @param maxMessages - Max messages to receive (1-10)
 * @param waitTimeSeconds - Long polling wait time
 */
export async function receiveEmails(
  maxMessages = 10,
  waitTimeSeconds = 20
): Promise<EmailQueueMessage[]> {
  if (!isSqsConfigured()) return [];

  try {
    const client = getClient();
    const command = new ReceiveMessageCommand({
      QueueUrl: awsConfig.sqs.emailQueueUrl,
      MaxNumberOfMessages: Math.min(maxMessages, 10),
      WaitTimeSeconds: waitTimeSeconds,
      MessageAttributeNames: ['All'],
    });

    const result = await client.send(command);
    const messages: EmailQueueMessage[] = [];

    for (const msg of result.Messages || []) {
      try {
        const parsed = JSON.parse(msg.Body || '{}') as EmailQueueMessage;
        // Attach receipt handle for deletion
        (parsed as unknown as { _receiptHandle: string })._receiptHandle = msg.ReceiptHandle || '';
        (parsed as unknown as { _messageId: string })._messageId = msg.MessageId || '';
        messages.push(parsed);
      } catch {
        logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
          messageId: msg.MessageId,
          error: 'Failed to parse SQS message body',
        });
      }
    }

    return messages;
  } catch (error) {
    logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
      error: error instanceof Error ? error.message : String(error),
      metadata: { operation: 'receiveMessages' },
    });
    return [];
  }
}

/**
 * Deletes a processed message from the queue.
 * Must be called after successful email delivery.
 */
export async function deleteProcessedMessage(message: EmailQueueMessage): Promise<void> {
  if (!isSqsConfigured()) return;

  const receiptHandle = (message as unknown as { _receiptHandle: string })._receiptHandle;
  if (!receiptHandle) return;

  try {
    const client = getClient();
    const command = new DeleteMessageCommand({
      QueueUrl: awsConfig.sqs.emailQueueUrl,
      ReceiptHandle: receiptHandle,
    });
    await client.send(command);
  } catch (error) {
    logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
      error: error instanceof Error ? error.message : String(error),
      metadata: { operation: 'deleteMessage' },
    });
  }
}
