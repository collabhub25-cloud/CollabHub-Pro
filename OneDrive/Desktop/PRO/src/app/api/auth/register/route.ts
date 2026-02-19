import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { hashPassword, generateAccessToken, sanitizeUser } from '@/lib/auth';
import { RegisterSchema, validateInput } from '@/lib/validation/schemas';
import { checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'register');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.register);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.register.message);
    }

    await connectDB();

    const body = await request.json();
    
    // Zod validation
    const validation = validateInput(RegisterSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { name, email, password, role } = validation.data;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // SECURITY: Create user with only allowed fields (no mass assignment)
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role,
      verificationLevel: 0,
      trustScore: 50,
      kycStatus: 'pending',
      isEmailVerified: false,
      skills: [],
    });

    // Generate token
    const token = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    console.log(`✅ New user registered: ${user.email} (${user.role})`);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
