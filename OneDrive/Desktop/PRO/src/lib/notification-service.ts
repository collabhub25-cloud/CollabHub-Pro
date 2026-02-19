// Notification Service - communicates with the WebSocket notification service

const NOTIFICATION_SERVICE_URL = 'http://localhost:3003';

export type NotificationType = 
  | 'application_received'
  | 'application_status'
  | 'agreement_signed'
  | 'milestone_created'
  | 'milestone_completed'
  | 'payment_success'
  | 'funding_update'
  | 'trust_score_change'
  | 'verification_update'
  | 'subscription_update';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// Check if notification service is available
export async function isNotificationServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Create a single notification
export async function createNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    // Store in database via internal API
    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/internal/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to create notification via service, falling back to direct DB:', error);
    return false;
  }
}

// Create batch notifications
export async function createBatchNotifications(notifications: NotificationPayload[]): Promise<boolean> {
  try {
    const response = await fetch(`${NOTIFICATION_SERVICE_URL}/internal/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
      signal: AbortSignal.timeout(10000),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to create batch notifications:', error);
    return false;
  }
}

// Notification templates
export const NotificationTemplates = {
  applicationReceived: (startupName: string, talentName: string) => ({
    title: 'New Application Received',
    message: `${talentName} has applied to ${startupName}`,
    type: 'application_received' as NotificationType,
  }),
  
  applicationStatusChanged: (status: string, startupName: string) => ({
    title: 'Application Update',
    message: `Your application to ${startupName} has been ${status}`,
    type: 'application_status' as NotificationType,
  }),
  
  agreementSigned: (agreementType: string, partyName: string) => ({
    title: 'Agreement Signed',
    message: `${partyName} has signed the ${agreementType} agreement`,
    type: 'agreement_signed' as NotificationType,
  }),
  
  milestoneCreated: (milestoneTitle: string, startupName: string) => ({
    title: 'New Milestone',
    message: `New milestone "${milestoneTitle}" created for ${startupName}`,
    type: 'milestone_created' as NotificationType,
  }),
  
  milestoneCompleted: (milestoneTitle: string) => ({
    title: 'Milestone Completed',
    message: `Milestone "${milestoneTitle}" has been marked as completed`,
    type: 'milestone_completed' as NotificationType,
  }),
  
  paymentSuccess: (amount: number, milestoneTitle?: string) => ({
    title: 'Payment Successful',
    message: `Payment of $${amount} received${milestoneTitle ? ` for "${milestoneTitle}"` : ''}`,
    type: 'payment_success' as NotificationType,
  }),
  
  fundingUpdate: (roundName: string, raisedAmount: number, targetAmount: number) => ({
    title: 'Funding Update',
    message: `${roundName}: $${raisedAmount.toLocaleString()} raised of $${targetAmount.toLocaleString()} target`,
    type: 'funding_update' as NotificationType,
  }),
  
  trustScoreChanged: (newScore: number, change: number, reason: string) => ({
    title: 'Trust Score Updated',
    message: `Your trust score ${change >= 0 ? 'increased' : 'decreased'} to ${newScore}. Reason: ${reason}`,
    type: 'trust_score_change' as NotificationType,
  }),
  
  verificationUpdated: (level: number, status: string) => ({
    title: 'Verification Update',
    message: `Your Level ${level} verification has been ${status}`,
    type: 'verification_update' as NotificationType,
  }),
  
  subscriptionUpdated: (plan: string, status: string) => ({
    title: 'Subscription Update',
    message: `Your ${plan} subscription is now ${status}`,
    type: 'subscription_update' as NotificationType,
  }),
};
