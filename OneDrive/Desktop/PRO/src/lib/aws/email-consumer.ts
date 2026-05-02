/**
 * SQS Email Consumer — Lambda Handler
 *
 * This module processes email messages from the SQS queue.
 * It can be deployed as:
 * 1. An AWS Lambda function triggered by SQS
 * 2. A background worker in the Next.js API route
 *
 * Processing flow:
 * SQS Message → Parse → Send via SES → Delete from Queue
 *                 ↓ (on failure)
 *            Retry (up to 3x) → Dead Letter Queue
 */

import { sendEmailViaSes } from './ses-client';
import { receiveEmails, deleteProcessedMessage, type EmailQueueMessage } from './sqs-client';
import { logEmailEvent, EmailEvent, EmailLogLevel, createTimer } from './cloudwatch-logger';

/**
 * Lambda handler for SQS-triggered email processing.
 * Compatible with AWS Lambda SQS event source mapping.
 */
export async function lambdaHandler(event: {
  Records: Array<{
    messageId: string;
    body: string;
    receiptHandle: string;
    messageAttributes?: Record<string, { stringValue?: string }>;
  }>;
}): Promise<{
  batchItemFailures: Array<{ itemIdentifier: string }>;
}> {
  const failures: Array<{ itemIdentifier: string }> = [];

  for (const record of event.Records) {
    const timer = createTimer();

    try {
      const message: EmailQueueMessage = JSON.parse(record.body);

      const result = await sendEmailViaSes({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [
          { Name: 'TemplateType', Value: message.templateType },
          { Name: 'QueuedAt', Value: message.queuedAt },
        ],
      });

      if (result.success) {
        timer.logCompletion(EmailEvent.DELIVERED, {
          messageId: result.messageId,
          recipient: message.to,
          templateType: message.templateType,
        });
      } else {
        // Report as failure for SQS retry
        failures.push({ itemIdentifier: record.messageId });

        logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
          messageId: record.messageId,
          recipient: message.to,
          templateType: message.templateType,
          error: result.error,
        });
      }
    } catch (error) {
      failures.push({ itemIdentifier: record.messageId });

      logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Return failed items for SQS to retry
  // After maxReceiveCount failures, they go to the Dead Letter Queue
  return { batchItemFailures: failures };
}

/**
 * Background worker for polling-based email processing.
 * Use this when Lambda is not available (e.g., local development).
 *
 * @param maxIterations - Max polling iterations (0 = infinite)
 * @param pollIntervalMs - Delay between polls
 */
export async function processEmailQueue(
  maxIterations = 0,
  pollIntervalMs = 5000
): Promise<void> {
  let iterations = 0;

  while (maxIterations === 0 || iterations < maxIterations) {
    iterations++;

    try {
      const messages = await receiveEmails(10, 20);

      if (messages.length === 0) {
        // No messages, wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      logEmailEvent(EmailEvent.QUEUED, EmailLogLevel.DEBUG, {
        metadata: { batchSize: messages.length, iteration: iterations },
      });

      for (const message of messages) {
        const timer = createTimer();

        try {
          const result = await sendEmailViaSes({
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
            tags: [
              { Name: 'TemplateType', Value: message.templateType },
            ],
          });

          if (result.success) {
            await deleteProcessedMessage(message);
            timer.logCompletion(EmailEvent.DELIVERED, {
              messageId: result.messageId,
              recipient: message.to,
              templateType: message.templateType,
            });
          } else {
            // Leave in queue for retry by SQS visibility timeout
            logEmailEvent(EmailEvent.RETRY, EmailLogLevel.WARN, {
              recipient: message.to,
              error: result.error,
            });
          }
        } catch (error) {
          logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
            recipient: message.to,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logEmailEvent(EmailEvent.FAILED, EmailLogLevel.ERROR, {
        error: error instanceof Error ? error.message : String(error),
        metadata: { operation: 'processEmailQueue', iteration: iterations },
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs * 2));
    }
  }
}
