import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { generateAccessToken, generateRefreshToken, setAuthCookies, sanitizeUser } from '@/lib/auth';

const GOOGLE_CLIENT_ID = "473460743491-ph80eufbukqtl7gi7daov9b54d9fjec.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const { credential, role } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Missing Google credential' }, { status: 400 });
    }

    let payload: any;
    let googleId: string;
    let email: string;
    let name: string | undefined;
    let avatar: string | undefined;
    let emailVerified: boolean = false;

    // Check if it's a JWT (ID Token) or an Access Token
    if (credential.includes('.')) {
      // Treat as ID Token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return NextResponse.json({ error: 'Invalid Google ID token' }, { status: 400 });
      }
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
      emailVerified = payload.email_verified;
    } else {
      // Treat as Access Token (typical for useGoogleLogin hook)
      const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Invalid Google access token' }, { status: 400 });
      }
      payload = await res.json();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
      emailVerified = payload.email_verified;
    }

    if (!email) {
      return NextResponse.json({ error: 'Could not retrieve email from Google' }, { status: 400 });
    }

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
