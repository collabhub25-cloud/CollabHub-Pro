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
        { error: 'Validation failed', details: validation.errors },
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

    // Set cookies — no token in response body
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: sanitizeUser(result.user),
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
