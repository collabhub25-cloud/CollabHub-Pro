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

export async function sendVerificationEmail(email: string, otp: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn(`[MAILER] DEV MODE - Verification OTP for ${email}: ${otp}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Verify your AlloySphere account',
            text: `Your verification code is: ${otp}`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Welcome to AlloySphere!</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">To verify your email address and activate your account, please use the following one-time password (OTP):</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
            <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #71717a; font-size: 14px;">This code will expire in 10 minutes.</p>
        </div>
      `,
        });
        return info.messageId;
    } catch (error) {
        console.error('[MAILER] Error sending verification email:', error);
        throw error;
    }
}

export async function sendPasswordResetEmail(email: string, otp: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn(`[MAILER] DEV MODE - Password Reset OTP for ${email}: ${otp}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Reset your AlloySphere password',
            text: `Your password reset code is: ${otp}`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Reset Your Password</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">We received a request to reset your AlloySphere password. Use the code below to proceed:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
            <h1 style="color: #dc2626; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #71717a; font-size: 14px;">This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
        });
        return info.messageId;
    } catch (error) {
        console.error('[MAILER] Error sending password reset email:', error);
        throw error;
    }
}

export async function sendWelcomeEmail(email: string, name: string, role: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn(`[MAILER] DEV MODE - Welcome email for ${email} (${role})`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Welcome to AlloySphere! 🚀',
            text: `Hi ${name},\n\nWelcome to AlloySphere! We're thrilled to have you join as a ${role}.\nGet started by completing your profile and exploring the platform.\n\nThe AlloySphere Team`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Welcome to AlloySphere, ${name}! 🚀</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">We're thrilled to have you join our community as a <strong>${role}</strong>.</p>
          <p style="color: #4a4a4a; line-height: 1.5;">AlloySphere is built to connect founders, talent, and investors seamlessly. To get the most out of the platform, we recommend:</p>
          <ul style="color: #4a4a4a; line-height: 1.5;">
            <li>Completing your profile</li>
            <li>Starting your KYC verification to build trust</li>
            <li>Exploring the dashboard to see what's new</li>
          </ul>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://alloysphere.vercel.app/dashboard/${role}" style="background-color: #2E8B57; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
          </div>
          <p style="color: #71717a; font-size: 14px;">Happy collaborating!<br/>The AlloySphere Team</p>
        </div>
      `,
        });
        return info.messageId;
    } catch (error) {
        console.error('[MAILER] Error sending welcome email:', error);
        throw error;
    }
}

export async function sendSubscriptionUpgradeEmail(email: string, name: string, planName: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn(`[MAILER] DEV MODE - Subscription Upgrade email for ${email} (${planName})`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere" <${FROM_EMAIL}>`,
            to: email,
            subject: `Your AlloySphere ${planName} Subscription is Active! ✨`,
            text: `Hi ${name},\n\nGreat news! Your account has been upgraded to the ${planName} plan.\nYou now have access to premium features.\n\nThe AlloySphere Team`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Subscription Upgraded! ✨</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">Hi ${name},</p>
          <p style="color: #4a4a4a; line-height: 1.5;">Thank you for upgrading! Your account is now active on the <strong>${planName}</strong> plan.</p>
          <p style="color: #4a4a4a; line-height: 1.5;">You have unlocked new capabilities, higher limits, and priority features to help you scale your startup faster.</p>
          <p style="color: #71717a; font-size: 14px; margin-top: 30px;">Thank you for building with us.<br/>The AlloySphere Team</p>
        </div>
      `,
        });
        return info.messageId;
    } catch (error) {
        console.error('[MAILER] Error sending upgrade email:', error);
        throw error;
    }
}

export async function sendPaymentReceiptEmail(email: string, name: string, amount: number, itemDesc: string, transactionId: string) {
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn(`[MAILER] DEV MODE - Payment Receipt for ${email} (₹${amount})`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"AlloySphere Billing" <${FROM_EMAIL}>`,
            to: email,
            subject: `Payment Receipt: ${itemDesc}`,
            text: `Hi ${name},\n\nWe have received your payment of ₹${amount} for ${itemDesc}.\nTransaction ID: ${transactionId}\n\nThank you for your business.`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Payment Receipt</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">Hi ${name},</p>
          <p style="color: #4a4a4a; line-height: 1.5;">We have successfully processed your payment.</p>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; color: #475569;"><strong>Description:</strong> ${itemDesc}</p>
            <p style="margin: 0 0 8px 0; color: #475569;"><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
            <p style="margin: 0 0 0 0; color: #475569;"><strong>Transaction ID:</strong> ${transactionId}</p>
          </div>
          <p style="color: #71717a; font-size: 14px;">If you have any questions about this payment, please contact support.</p>
        </div>
      `,
        });
        return info.messageId;
    } catch (error) {
        console.error('[MAILER] Error sending receipt email:', error);
        throw error;
    }
}
