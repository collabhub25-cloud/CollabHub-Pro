import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
  extractTokenFromCookies,
  verifyAccessToken,
  sanitizeUser,
} from '@/lib/auth';
import { validateInput, ProfileUpdateSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Read token from cookie (middleware will also enforce this, but defense-in-depth)
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Explicitly fetch subscription to assure frontend has accurate plan
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const sub = await db.collection('subscriptions').findOne({ userId: user._id });
    const userPlan = sub ? sub.plan : 'free';

    const sanitizedUser = sanitizeUser(user);
    (sanitizedUser as any).plan = userPlan;

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // SECURITY: Zod validation with whitelist (prevents mass assignment)
    const validation = validateInput(ProfileUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // SECURITY: Only allow specific fields to be updated (whitelist pattern)
    const allowedFields = ['name', 'bio', 'skills', 'githubUrl', 'linkedinUrl',
      'portfolioUrl', 'location', 'avatar'];
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (validation.data && field in validation.data && validation.data[field as keyof typeof validation.data] !== undefined) {
        const value = validation.data[field as keyof typeof validation.data];
        if (typeof value === 'string') {
          updateData[field] = value.trim();
        } else if (Array.isArray(value)) {
          updateData[field] = value;
        } else {
          updateData[field] = value;
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
