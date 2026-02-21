import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { authenticateUser, sanitizeUser, setAuthCookies } from '@/lib/auth';
import { LoginSchema, validateInput } from '@/lib/validation/schemas';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - important for login to prevent brute force
    const rateLimitKey = getRateLimitKey(request, 'login');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.login);

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.login.message);
    }

    await connectDB();

    const body = await request.json();

    // Zod validation
    const validation = validateInput(LoginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors, fields: validation.fields },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Authenticate user
    const result = await authenticateUser(email, password);
    if (!result) {
      // Don't reveal whether email exists or not
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Explicitly fetch subscription to ensure frontend has accurate plan
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const sub = await db.collection('subscriptions').findOne({ userId: result.user._id });
    const userPlan = sub ? sub.plan : 'free';

    const sanitizedUser = sanitizeUser(result.user);
    (sanitizedUser as any).plan = userPlan;

    // Set cookies — no token in response body
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: sanitizedUser,
    });

    return setAuthCookies(response, result.accessToken, result.refreshToken);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
