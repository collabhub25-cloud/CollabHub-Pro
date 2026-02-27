import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { hashPassword, clearAuthCookies } from '@/lib/auth';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'reset-password');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.resetPassword);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.resetPassword.message);
        }

        await connectDB();
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpires) {
            return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
        }

        if (user.resetPasswordOtpAttempts !== undefined && user.resetPasswordOtpAttempts >= 5) {
            return NextResponse.json({ error: 'Too many failed attempts. Please request a new reset code.' }, { status: 400 });
        }

        if (new Date() > user.resetPasswordOtpExpires) {
            return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 });
        }

        const otpHash = crypto.createHash('sha256').update(otp.toString()).digest('hex');

        const storedHashBuffer = Buffer.from(user.resetPasswordOtpHash, 'hex');
        const inputHashBuffer = Buffer.from(otpHash, 'hex');

        if (storedHashBuffer.length !== inputHashBuffer.length || !crypto.timingSafeEqual(storedHashBuffer, inputHashBuffer)) {
            user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
            await user.save();
            return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 });
        }

        // Success
        user.passwordHash = await hashPassword(newPassword);
        user.resetPasswordOtpHash = undefined;
        user.resetPasswordOtpExpires = undefined;
        user.resetPasswordOtpAttempts = 0;

        // Changing password logs the user out
        await user.save();

        const response = NextResponse.json({ success: true, message: 'Password has been reset successfully' });
        return clearAuthCookies(response);
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
