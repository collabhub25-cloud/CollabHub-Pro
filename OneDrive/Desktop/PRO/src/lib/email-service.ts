import { connectDB } from '@/lib/mongodb';
import { User, EmailPreferences } from '@/lib/models';
import {
  sendWelcomeEmail,
  sendApplicationNotificationEmail,
  sendInvestmentPromptEmail,
  sendInvestmentResultEmail,
  sendJobPostedEmail,
  sendAccountActivityEmail,
} from '@/lib/mailer';
import nodemailer from 'nodemailer';

// ============================================
// EMAIL SERVICE — Event-driven dispatcher
// Handles deduplication, rate limiting, preferences, retries
// ============================================

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const SMTP_USER = process.env.EMAIL_USER;
const SMTP_PASS = process.env.EMAIL_PASS;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@AlloySphere.com';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

const MAX_EMAILS_PER_HOUR = 10;
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff

// Simple in-memory dedup cache (per-process)
const recentEmails = new Map<string, number>();

// Clean up stale dedup entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentEmails) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEmails.delete(key);
    }
  }
}, 10 * 60 * 1000);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ============================================
// Branded HTML wrapper (shared with mailer.ts)
// ============================================
function wrapInBrandedTemplate(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 0; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2E8B57 0%, #0047AB 100%); padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">AlloySphere</h1>
        <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0 0;">Trust-Verified Startup Collaboration</p>
      </div>
      <!-- Body -->
      <div style="padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">${title}</h2>
        ${bodyHtml}
      </div>
      <!-- Footer -->
      <div style="padding: 20px 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} AlloySphere. All rights reserved.</p>
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0 0 0;">You received this email because you have an AlloySphere account.</p>
      </div>
    </div>`;
}

// ============================================
// HELPERS
// ============================================

/** Check if user has opted into a specific email category */
async function shouldSendEmail(userId: string, category: string): Promise<boolean> {
  try {
    await connectDB();
    let prefs = await EmailPreferences.findOne({ userId }).lean() as any;

    // Create default preferences if none exist
    if (!prefs) {
      prefs = await EmailPreferences.create({ userId });
    }

    if (!prefs.emailNotifications) return false;

    const prefKey = category as keyof typeof prefs.preferences;
    if (prefs.preferences && prefs.preferences[prefKey] === false) return false;

    // Rate limiting: max N emails per hour
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (prefs.hourWindowStart && prefs.hourWindowStart > hourAgo) {
      if (prefs.emailsSentThisHour >= MAX_EMAILS_PER_HOUR) {
        console.warn(`[EMAIL-SERVICE] Rate limit hit for user ${userId}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[EMAIL-SERVICE] Error checking email preferences:', error);
    return true; // Default to sending on error
  }
}

/** Record that an email was sent (for rate limiting) */
async function recordEmailSent(userId: string): Promise<void> {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    await EmailPreferences.findOneAndUpdate(
      { userId },
      [
        {
          $set: {
            lastEmailSent: now,
            hourWindowStart: {
              $cond: {
                if: { $or: [{ $eq: ['$hourWindowStart', null] }, { $lt: ['$hourWindowStart', hourAgo] }] },
                then: now,
                else: '$hourWindowStart',
              },
            },
            emailsSentThisHour: {
              $cond: {
                if: { $or: [{ $eq: ['$hourWindowStart', null] }, { $lt: ['$hourWindowStart', hourAgo] }] },
                then: 1,
                else: { $add: ['$emailsSentThisHour', 1] },
              },
            },
          },
        },
      ],
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[EMAIL-SERVICE] Error recording email sent:', error);
  }
}

/** Deduplication check */
function isDuplicate(userId: string, type: string, entityId?: string): boolean {
  const key = `${userId}:${type}:${entityId || 'none'}`;
  const lastSent = recentEmails.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return true;
  }
  recentEmails.set(key, Date.now());
  return false;
}

/** Send with retry logic */
async function sendWithRetry(
  sendFn: () => Promise<string | undefined>,
  retries = MAX_RETRIES
): Promise<string | undefined> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await sendFn();
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('[EMAIL-SERVICE] All retry attempts failed:', error);
        throw error;
      }
      const delay = RETRY_DELAYS[attempt] || 15000;
      console.warn(`[EMAIL-SERVICE] Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ============================================
// EMAIL TRIGGER FUNCTIONS
// ============================================

type NotificationCategory = 'jobs' | 'messages' | 'pitches' | 'investments' | 'alliances' | 'applications' | 'milestones' | 'account';

/**
 * Main dispatcher: triggers email for a notification event.
 * Non-blocking, fire-and-forget with error logging.
 */
export async function triggerNotificationEmail(
  userId: string,
  type: string,
  data: Record<string, any>
): Promise<void> {
  // Map notification types to email categories
  const categoryMap: Record<string, NotificationCategory> = {
    application_received: 'applications',
    application_status: 'applications',
    milestone_created: 'milestones',
    milestone_completed: 'milestones',
    message_received: 'messages',
    pitch_requested: 'pitches',
    pitch_sent: 'pitches',
    investment_entry_prompt: 'investments',
    investment_matched: 'investments',
    investment_mismatched: 'investments',
    alliance_request: 'alliances',
    alliance_accepted: 'alliances',
    alliance_rejected: 'alliances',
    funding_update: 'investments',
    job_posted: 'jobs',
    account_activity: 'account',
  };

  const category = categoryMap[type];
  if (!category) {
    console.log(`[EMAIL-SERVICE] No email category for type: ${type}`);
    return;
  }

  try {
    // Check preferences
    const canSend = await shouldSendEmail(userId, category);
    if (!canSend) {
      console.log(`[EMAIL-SERVICE] Email suppressed for user ${userId}, category ${category}`);
      return;
    }

    // Dedup check
    if (isDuplicate(userId, type, data.entityId)) {
      console.log(`[EMAIL-SERVICE] Duplicate suppressed: ${userId}:${type}`);
      return;
    }

    // Get user email
    await connectDB();
    const user = await User.findById(userId).select('email name').lean() as any;
    if (!user?.email) {
      console.warn(`[EMAIL-SERVICE] No email found for user ${userId}`);
      return;
    }

    // Dispatch to appropriate email sender
    await sendWithRetry(async () => {
      switch (type) {
        case 'application_received':
          return sendApplicationNotificationEmail(
            user.email, user.name, data.applicantName, data.startupName, 'received'
          );
        case 'application_status':
          return sendApplicationNotificationEmail(
            user.email, user.name, data.applicantName, data.startupName, data.status
          );
        case 'investment_entry_prompt':
          return sendInvestmentPromptEmail(
            user.email, user.name, data.startupName, data.partnerName, data.role
          );
        case 'investment_matched':
          return sendInvestmentResultEmail(
            user.email, user.name, data.startupName, true, data.amount, data.equity
          );
        case 'investment_mismatched':
          return sendInvestmentResultEmail(
            user.email, user.name, data.startupName, false
          );
        case 'message_received':
          return sendMessageNotificationEmail(
            user.email, user.name, data.senderName
          );
        case 'pitch_requested':
          return sendPitchRequestEmail(
            user.email, user.name, data.investorName, data.startupName
          );
        case 'pitch_sent':
          return sendPitchSentEmail(
            user.email, user.name, data.founderName, data.startupName
          );
        case 'alliance_request':
          return sendAllianceRequestEmail(
            user.email, user.name, data.fromName
          );
        case 'alliance_accepted':
          return sendAllianceAcceptedEmail(
            user.email, user.name, data.partnerName
          );
        case 'milestone_completed':
          return sendMilestoneEmail(
            user.email, user.name, data.milestoneName, data.startupName
          );
        default:
          return sendGenericNotificationEmail(
            user.email, user.name, data.title || 'Notification', data.message || '', data.actionUrl
          );
      }
    });

    await recordEmailSent(userId);
    console.log(`[EMAIL-SERVICE] Email sent: ${type} → ${user.email}`);
  } catch (error) {
    console.error(`[EMAIL-SERVICE] Failed to send email for ${type}:`, error);
    // Non-critical: don't throw
  }
}

// ============================================
// NEW EMAIL TEMPLATE FUNCTIONS
// ============================================

async function sendMessageNotificationEmail(email: string, name: string, senderName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Message notification email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `New message from ${senderName}`,
    text: `You have a new message from ${senderName} on AlloySphere.`,
    html: wrapInBrandedTemplate('New Message', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${senderName}</strong> sent you a message on AlloySphere.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Message</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendPitchRequestEmail(email: string, name: string, investorName: string, startupName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Pitch request email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `Pitch request from ${investorName} for ${startupName}`,
    text: `${investorName} has requested a pitch deck for ${startupName}.`,
    html: wrapInBrandedTemplate('Pitch Deck Requested', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${investorName}</strong> has requested a pitch deck for <strong>${startupName}</strong>.
      </p>
      <div style="background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.08)); padding: 16px; border-radius: 10px; margin: 20px 0; border: 1px solid rgba(46,139,87,0.15);">
        <p style="color: #1a1a1a; font-size: 14px; margin: 0;">Review this request and send your pitch deck from your dashboard.</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard/founder" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendPitchSentEmail(email: string, name: string, founderName: string, startupName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Pitch sent email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `Pitch deck received from ${founderName}`,
    text: `${founderName} has sent you a pitch deck for ${startupName}.`,
    html: wrapInBrandedTemplate('Pitch Deck Received', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${founderName}</strong> has shared the pitch deck for <strong>${startupName}</strong> with you.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard/investor" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Pitch Deck</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendAllianceRequestEmail(email: string, name: string, fromName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Alliance request email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `Alliance request from ${fromName}`,
    text: `${fromName} wants to form an alliance with you on AlloySphere.`,
    html: wrapInBrandedTemplate('Alliance Request', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${fromName}</strong> has sent you an alliance request on AlloySphere.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Request</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendAllianceAcceptedEmail(email: string, name: string, partnerName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Alliance accepted email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `${partnerName} accepted your alliance request`,
    text: `${partnerName} has accepted your alliance request on AlloySphere.`,
    html: wrapInBrandedTemplate('Alliance Accepted! 🤝', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        Great news! <strong>${partnerName}</strong> has accepted your alliance request.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Alliance</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendMilestoneEmail(email: string, name: string, milestoneName: string, startupName: string) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Milestone email for ${email}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: `Milestone completed — ${startupName}`,
    text: `Milestone "${milestoneName}" has been completed for ${startupName}.`,
    html: wrapInBrandedTemplate('Milestone Completed! 🎯', `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">
        The milestone <strong>"${milestoneName}"</strong> for <strong>${startupName}</strong> has been marked as completed.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${BASE_URL}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Details</a>
      </div>
    `),
  });
  return info.messageId;
}

async function sendGenericNotificationEmail(
  email: string, name: string, title: string = 'Notification',
  message: string = '', actionUrl?: string
) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(`[MAILER] DEV MODE - Generic notification email for ${email}: ${title}`);
    return;
  }

  const ctaHtml = actionUrl
    ? `<div style="text-align: center; margin: 24px 0;">
        <a href="${actionUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View on Dashboard</a>
      </div>`
    : '';

  const info = await transporter.sendMail({
    from: `"AlloySphere" <${FROM_EMAIL}>`,
    to: email,
    subject: title,
    text: message,
    html: wrapInBrandedTemplate(title, `
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name},</p>
      <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
      ${ctaHtml}
    `),
  });
  return info.messageId;
}
