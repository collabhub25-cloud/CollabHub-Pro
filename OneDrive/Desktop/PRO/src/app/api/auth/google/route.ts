import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { generateAccessToken, generateRefreshToken, setAuthCookies, sanitizeUser } from '@/lib/auth';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const { credential, role } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Missing Google credential' }, { status: 400 });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 400 });
    }

    const { email, name, sub: googleId, picture: avatar } = payload;
    const emailVerified = payload.email_verified;

    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase() });
    
    // Check if the user is trying to login with an existing wrong role
    if (user && role && user.role !== role && request.nextUrl.pathname.includes('signup')) {
       return NextResponse.json({ 
           error: 'Email is already registered with a different role.', 
           existingRole: user.role 
       }, { status: 400 });
    }

    if (!user) {
      // New user registration
      // If role is missing, default to 'founder' or reject based on requirements.
      const assignedRole = role || 'founder';

      user = await User.create({
        email: email.toLowerCase(),
        name: name || 'Google User',
        authProvider: 'google',
        googleId,
        avatar,
        role: assignedRole,
        isEmailVerified: emailVerified,
      });
    } else {
      // Existing user logging in via Google
      // Link Google account to existing local account if it wasn't already
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (avatar && !user.avatar) user.avatar = avatar;
        if (emailVerified) user.isEmailVerified = true;
      }
      user.lastActive = new Date();
      await user.save();
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Explicitly fetch subscription to ensure frontend has accurate plan
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const sub = await db.collection('subscriptions').findOne({ userId: user._id });
    const userPlan = sub ? sub.plan : 'free';

    const sanitizedUser = sanitizeUser(user);

    (sanitizedUser as any).plan = userPlan;

    const response = NextResponse.json({
      success: true,
      message: 'Google login successful',
      user: sanitizedUser,
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('Google Auth Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during Google auth' },
      { status: 500 }
    );
  }
}
