import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const SMTP_USER = process.env.EMAIL_USER;
const SMTP_PASS = process.env.EMAIL_PASS;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@collabhub.com';

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
            from: `"CollabHub" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Verify your CollabHub account',
            text: `Your verification code is: ${otp}`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Welcome to CollabHub!</h2>
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
            from: `"CollabHub" <${FROM_EMAIL}>`,
            to: email,
            subject: 'Reset your CollabHub password',
            text: `Your password reset code is: ${otp}`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #1a1a1a;">Reset Your Password</h2>
          <p style="color: #4a4a4a; line-height: 1.5;">We received a request to reset your CollabHub password. Use the code below to proceed:</p>
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
