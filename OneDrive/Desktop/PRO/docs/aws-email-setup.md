# AWS Email System — Setup Guide

## Architecture Overview

```
┌──────────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Next.js API     │────▶│  Amazon SQS │────▶│ Email        │────▶│ Amazon SES │
│  Routes          │     │  Queue      │     │ Consumer     │     │            │
└──────────────────┘     └─────────────┘     └──────────────┘     └────────────┘
        │                       │                    │                    │
        │                  On Failure           CloudWatch           Delivery
        │                       ▼               Logging              Events
        │                ┌─────────────┐           │                    │
        │                │  Dead Letter│           ▼                    ▼
        │                │  Queue      │    ┌────────────┐      ┌────────────┐
        │                └─────────────┘    │ CloudWatch │      │ SNS Topic  │
        │                                   │ Logs       │      │ (Bounces)  │
        ▼                                   └────────────┘      └────────────┘
   ┌──────────────┐
   │ Direct SES   │  ← High-priority emails bypass queue
   │ (Fallback)   │
   └──────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate IAM permissions
2. **Verified SES domain** (alloysphere.online)
3. **Node.js 18+**

## Step 1: Install Dependencies

```bash
npm install @aws-sdk/client-ses @aws-sdk/client-sqs
```

## Step 2: AWS IAM Policy

Create an IAM user/role with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SESPermissions",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota",
        "ses:GetSendStatistics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SQSPermissions",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:ap-south-1:ACCOUNT_ID:alloysphere-email-queue",
        "arn:aws:sqs:ap-south-1:ACCOUNT_ID:alloysphere-email-dlq"
      ]
    },
    {
      "Sid": "CloudWatchPermissions",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 3: Create SQS Queues

### Main Queue
```bash
aws sqs create-queue \
  --queue-name alloysphere-email-queue \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "86400",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:ap-south-1:ACCOUNT_ID:alloysphere-email-dlq\",\"maxReceiveCount\":\"3\"}"
  }'
```

### Dead Letter Queue
```bash
aws sqs create-queue \
  --queue-name alloysphere-email-dlq \
  --attributes '{
    "MessageRetentionPeriod": "1209600"
  }'
```

## Step 4: Verify SES Domain

```bash
# Verify domain
aws ses verify-domain-identity --domain alloysphere.online

# Add DKIM records
aws ses verify-domain-dkim --domain alloysphere.online
```

## Step 5: Environment Variables

Add to your `.env.local`:

```env
# AWS Credentials
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Amazon SES
AWS_SES_FROM_ADDRESS=noreply@alloysphere.online
AWS_SES_FROM_NAME=AlloySphere
AWS_SES_CONFIGURATION_SET=alloysphere-tracking

# Amazon SQS (optional — enables async queue processing)
AWS_SQS_EMAIL_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/alloysphere-email-queue
AWS_SQS_DLQ_URL=https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/alloysphere-email-dlq
```

## Step 6: Deploy Lambda Consumer (Optional)

For production, deploy the email consumer as a Lambda function:

```bash
# Package the consumer
cd src/lib/aws
zip -r email-consumer.zip email-consumer.ts ses-client.ts config.ts cloudwatch-logger.ts

# Create Lambda function
aws lambda create-function \
  --function-name alloysphere-email-consumer \
  --runtime nodejs18.x \
  --handler email-consumer.lambdaHandler \
  --role arn:aws:iam::ACCOUNT_ID:role/alloysphere-lambda-role \
  --timeout 60 \
  --memory-size 256

# Add SQS trigger
aws lambda create-event-source-mapping \
  --function-name alloysphere-email-consumer \
  --event-source-arn arn:aws:sqs:ap-south-1:ACCOUNT_ID:alloysphere-email-queue \
  --batch-size 10 \
  --function-response-types ReportBatchItemFailures
```

## Usage

### Basic Email Sending

```typescript
import { dispatchEmail } from '@/lib/aws';

// Queue-based (non-blocking)
await dispatchEmail({
  to: 'user@example.com',
  subject: 'Welcome to AlloySphere',
  html: '<h1>Welcome!</h1>',
  templateType: 'welcome',
  priority: 'normal',
});

// High-priority (synchronous via SES)
await dispatchEmail({
  to: 'admin@alloysphere.online',
  subject: 'Security Alert',
  html: '<h1>Security Event</h1>',
  templateType: 'security_alert',
  priority: 'high',
  forceSynchronous: true,
});
```

### Batch Sending

```typescript
import { dispatchEmailBatch } from '@/lib/aws';

const results = await dispatchEmailBatch([
  { to: 'user1@example.com', subject: 'Update', html: '...', templateType: 'update' },
  { to: 'user2@example.com', subject: 'Update', html: '...', templateType: 'update' },
]);
```

## Monitoring

### CloudWatch Log Insights Query

```
fields @timestamp, event, recipient, templateType, durationMs, error
| filter service = 'alloysphere-email'
| sort @timestamp desc
| limit 100
```

### Alert on Failures

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name alloysphere-email-failures \
  --metric-name EmailsFailed \
  --namespace AlloySphere \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-south-1:ACCOUNT_ID:ops-alerts
```

## Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| AWS fully configured | Queue → Lambda → SES |
| SQS not configured | Direct SES sending |
| AWS not configured | Returns error, caller uses legacy SMTP |
| SQS send fails | Automatic fallback to direct SES |
| SES send fails | 3x retry with exponential backoff |
| All retries fail | Message goes to Dead Letter Queue |
