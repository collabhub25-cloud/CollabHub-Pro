import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'forgot-password');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.forgotPassword);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.forgotPassword.message);
        }

        await connectDB();
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return 200 generic message (no enumeration)
        const successResponse = NextResponse.json({
            success: true,
            message: 'If an account exists, a password reset email has been sent.'
        });

        if (!user) {
            return successResponse;
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        user.resetPasswordOtpHash = otpHash;
        user.resetPasswordOtpExpires = otpExpires;
        user.resetPasswordOtpAttempts = 0;
        await user.save();

        await sendPasswordResetEmail(user.email, otp);

        return successResponse;
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
