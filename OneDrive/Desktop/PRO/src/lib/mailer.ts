import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const SMTP_USER = process.env.EMAIL_USER;
const SMTP_PASS = process.env.EMAIL_PASS;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@AlloySphere.com';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// ============================================
// Branded HTML wrapper
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
// Verification Email
// ============================================
export async function sendVerificationEmail(email: string, otp: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Verification OTP for ${email}: ${otp}`);
          }

        }
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Verify your AlloySphere account',
            text: `Your verification code is: ${otp}`,
            html: wrapInBrandedTemplate('Verify Your Email', `
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">To verify your email address and activate your account, please use the following one-time password:</p>
                <div style="background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.08)); padding: 20px; border-radius: 10px; text-align: center; margin: 24px 0; border: 1px solid rgba(46,139,87,0.15);">
                  <h1 style="color: #2E8B57; letter-spacing: 6px; margin: 0; font-size: 36px; font-weight: 700;">${otp}</h1>
                </div>
                <p style="color: #71717a; font-size: 13px; margin: 0;">This code will expire in 10 minutes.</p>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending verification email:', error);
          }

        }
        throw error;
    }
}

// ============================================
// Password Reset Email
// ============================================
export async function sendPasswordResetEmail(email: string, otp: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Password Reset OTP for ${email}: ${otp}`);
          }

        }
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Reset your AlloySphere password',
            text: `Your password reset code is: ${otp}`,
            html: wrapInBrandedTemplate('Reset Your Password', `
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">We received a request to reset your AlloySphere password. Use the code below to proceed:</p>
                <div style="background: #fef2f2; padding: 20px; border-radius: 10px; text-align: center; margin: 24px 0; border: 1px solid #fecaca;">
                  <h1 style="color: #dc2626; letter-spacing: 6px; margin: 0; font-size: 36px; font-weight: 700;">${otp}</h1>
                </div>
                <p style="color: #71717a; font-size: 13px; margin: 0;">This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending password reset email:', error);
          }

        }
        throw error;
    }
}

// ============================================
// Welcome Email (sent on registration)
// ============================================
export async function sendWelcomeEmail(email: string, name: string, role: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[MAILER] DEV MODE - Welcome email for ${email} (${role})`);
        }
        return;
    }

    const roleMessages: Record<string, string> = {
        founder: 'Start building your startup profile, invite team members, and connect with verified talent and investors.',
        investor: 'Explore deal flow, review verified startups, and connect with founders building the future.',
        talent: 'Discover exciting startup opportunities, showcase your skills, and join teams building something great.',
    };

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: `Welcome to AlloySphere, ${name}!`,
            text: `Welcome to AlloySphere! Your ${role} account has been created.`,
            html: wrapInBrandedTemplate(`Welcome, ${name}!`, `
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 16px 0;">Your <strong>${role}</strong> account has been created successfully.</p>
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 24px 0;">${roleMessages[role] || 'Explore the platform and start collaborating.'}</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/${role}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
                </div>
                <p style="color: #71717a; font-size: 13px; margin: 0;">Next step: Complete your profile and verify your email to unlock full features.</p>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending welcome email:', error);
          }

        }
        // Non-critical, don't throw
    }
}

// ============================================
// Subscription Upgrade Email
// ============================================
export async function sendSubscriptionEmail(email: string, name: string, planName: string, expiresAt: Date) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Subscription email for ${email}: upgraded to ${planName}`);
          }

        }
        return;
    }

    const formattedDate = expiresAt.toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: `AlloySphere ${planName} Plan Activated`,
            text: `Your AlloySphere subscription has been upgraded to ${planName}. Active until ${formattedDate}.`,
            html: wrapInBrandedTemplate('Subscription Confirmed', `
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${name}, your subscription has been upgraded.</p>
                <div style="background: linear-gradient(135deg, rgba(46,139,87,0.06), rgba(0,71,171,0.06)); padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid rgba(46,139,87,0.12);">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Plan</td>
                      <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${planName}</td>
                    </tr>
                    <tr>
                      <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Status</td>
                      <td style="color: #2E8B57; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">Active</td>
                    </tr>
                    <tr>
                      <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Renews on</td>
                      <td style="color: #1a1a1a; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${formattedDate}</td>
                    </tr>
                  </table>
                </div>
                <p style="color: #71717a; font-size: 13px; margin: 0;">Thank you for upgrading. You now have access to all ${planName} features.</p>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending subscription email:', error);
          }

        }
    }
}

// ============================================
// Application Notification Email
// ============================================
export async function sendApplicationNotificationEmail(
    email: string, 
    recipientName: string, 
    applicantName: string, 
    startupName: string, 
    type: 'received' | 'accepted' | 'rejected'
) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Application ${type} email for ${email}`);
          }

        }
        return;
    }

    const subjects: Record<string, string> = {
        received: `New application for ${startupName}`,
        accepted: `Your application to ${startupName} was accepted`,
        rejected: `Update on your application to ${startupName}`,
    };

    const messages: Record<string, string> = {
        received: `<strong>${applicantName}</strong> has applied to join <strong>${startupName}</strong>. Review their profile and respond to their application.`,
        accepted: `Congratulations! Your application to <strong>${startupName}</strong> has been accepted by ${recipientName}. Check your dashboard for next steps.`,
        rejected: `Your application to <strong>${startupName}</strong> has been reviewed. Unfortunately, the team has decided to move forward with other candidates.`,
    };

    const statusColors: Record<string, string> = {
        received: '#0047AB',
        accepted: '#2E8B57',
        rejected: '#dc2626',
    };

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: subjects[type],
            text: `Application ${type} for ${startupName}`,
            html: wrapInBrandedTemplate('Application Update', `
                <div style="border-left: 4px solid ${statusColors[type]}; padding-left: 16px; margin: 0 0 20px 0;">
                  <p style="color: #4a4a4a; line-height: 1.6; margin: 0;">${messages[type]}</p>
                </div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View on Dashboard</a>
                </div>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending application notification email:', error);
          }

        }
    }
}



// ============================================
// Investment Prompt Email (2-hour timer trigger)
// ============================================
export async function sendInvestmentPromptEmail(
    email: string,
    recipientName: string,
    startupName: string,
    partnerName: string,
    role: 'founder' | 'investor'
) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Investment prompt email for ${email}`);
          }

        }
        return;
    }

    const roleMessage = role === 'founder'
        ? `It's time to confirm the investment details agreed upon with <strong>${partnerName}</strong> for <strong>${startupName}</strong>.`
        : `It's time to confirm your investment details for <strong>${startupName}</strong> as discussed with the founder.`;

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: `Enter Investment Details — ${startupName}`,
            text: `Time to enter investment details for ${startupName}`,
            html: wrapInBrandedTemplate('Enter Investment Details', `
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Hi ${recipientName},</p>
                <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">${roleMessage}</p>
                <div style="background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.08)); padding: 20px; border-radius: 10px; margin: 24px 0; border: 1px solid rgba(46,139,87,0.15);">
                  <p style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">What you need to enter:</p>
                  <ul style="color: #4a4a4a; font-size: 13px; margin: 0; padding-left: 20px;">
                    <li>Investment Amount ($)</li>
                    <li>Equity Percentage (%)</li>
                  </ul>
                </div>
                <p style="color: #71717a; font-size: 13px; margin: 0 0 20px 0;"><strong>Important:</strong> Both parties must enter details independently. The system will verify both entries match before confirming the investment.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/${role}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Enter Details Now</a>
                </div>
                <p style="color: #71717a; font-size: 12px; margin: 0;">You have 48 hours to submit your entry.</p>
            `),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending investment prompt email:', error);
          }

        }
    }
}

// ============================================
// Investment Match/Mismatch Email
// ============================================
export async function sendInvestmentResultEmail(
    email: string,
    recipientName: string,
    startupName: string,
    matched: boolean,
    amount?: number,
    equity?: number
) {
    if (!SMTP_USER || !SMTP_PASS) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[MAILER] DEV MODE - Investment ${matched ? 'match' : 'mismatch'} email for ${email}`);
          }

        }
        return;
    }

    const subject = matched
        ? `Investment Confirmed — ${startupName}`
        : `Investment Discrepancy — ${startupName}`;

    const body = matched
        ? `
            <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">Great news! The investment details for <strong>${startupName}</strong> have been verified and confirmed.</p>
            <div style="background: linear-gradient(135deg, rgba(46,139,87,0.08), rgba(0,71,171,0.08)); padding: 20px; border-radius: 10px; margin: 24px 0; border: 1px solid rgba(46,139,87,0.15);">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Amount</td>
                  <td style="color: #2E8B57; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">₹${amount?.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Equity</td>
                  <td style="color: #2E8B57; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${equity}%</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 13px; padding: 6px 0;">Status</td>
                  <td style="color: #2E8B57; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">✅ Confirmed</td>
                </tr>
              </table>
            </div>
        `
        : `
            <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 20px 0;">The investment details submitted for <strong>${startupName}</strong> don't match between both parties.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 24px 0; border: 1px solid #fecaca;">
              <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">⚠️ Discrepancy Detected</p>
              <p style="color: #4a4a4a; font-size: 13px; margin: 0;">Please coordinate with the other party and re-enter your investment details from your dashboard.</p>
            </div>
        `;

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject,
            text: `Investment ${matched ? 'confirmed' : 'discrepancy'} for ${startupName}`,
            html: wrapInBrandedTemplate(
                matched ? 'Investment Confirmed! 🎉' : 'Investment Discrepancy',
                `<p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 16px 0;">Hi ${recipientName},</p>${body}
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #2E8B57, #0047AB); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View on Dashboard</a>
                </div>`
            ),
        });
        return info.messageId;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          if (process.env.NODE_ENV === 'development') {
            console.error('[MAILER] Error sending investment result email:', error);
          }

        }
    }
}
