import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'resend-otp');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.resendOtp);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.resendOtp.message);
        }

        await connectDB();
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Quietly return success to avoid email enumeration
        if (!user || user.isEmailVerified) {
            return NextResponse.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.verificationOtpHash = otpHash;
        user.verificationOtpExpires = otpExpires;
        user.verificationOtpAttempts = 0;
        await user.save();

        await sendVerificationEmail(user.email, otp);

        return NextResponse.json({ success: true, message: 'If an account exists, a verification email has been sent.' });
    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
