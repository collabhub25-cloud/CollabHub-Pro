import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'verify-email');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.verifyEmail);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.verifyEmail.message);
        }

        await connectDB();
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        if (user.isEmailVerified) {
            return NextResponse.json({ success: true, message: 'Email is already verified' });
        }

        if (!user.verificationOtpHash || !user.verificationOtpExpires) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        if (user.verificationOtpAttempts !== undefined && user.verificationOtpAttempts >= 5) {
            return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
        }

        if (new Date() > user.verificationOtpExpires) {
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        const otpHash = crypto.createHash('sha256').update(otp.toString()).digest('hex');

        // Constant-time comparison
        const storedHashBuffer = Buffer.from(user.verificationOtpHash, 'hex');
        const inputHashBuffer = Buffer.from(otpHash, 'hex');

        if (storedHashBuffer.length !== inputHashBuffer.length || !crypto.timingSafeEqual(storedHashBuffer, inputHashBuffer)) {
            user.verificationOtpAttempts = (user.verificationOtpAttempts || 0) + 1;
            await user.save();
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Success
        user.isEmailVerified = true;
        user.verificationOtpHash = undefined;
        user.verificationOtpExpires = undefined;
        user.verificationOtpAttempts = 0;
        await user.save();

        return NextResponse.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
