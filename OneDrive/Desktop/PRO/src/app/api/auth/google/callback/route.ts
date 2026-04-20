import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Subscription } from '@/lib/models';
import { generateAccessToken, generateRefreshToken, setAuthCookies, sanitizeUser } from '@/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const GOOGLE_REDIRECT_URI = `${BASE_URL}/api/auth/google/callback`;

/**
 * GET /api/auth/google/callback?code=...&state=...
 * Handles Google OAuth redirect callback.
 * Exchanges authorization code for tokens, fetches user info,
 * creates/finds user, sets auth cookies, and redirects to dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    // Handle user cancellation
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${BASE_URL}/login?error=google_cancelled`);
    }

    if (!code) {
      return NextResponse.redirect(`${BASE_URL}/login?error=missing_code`);
    }

    // Decode state
    let role = 'founder';
    let mode = 'login';
    if (stateParam) {
      try {
        const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
        role = decoded.role || 'founder';
        mode = decoded.mode || 'login';
      } catch {
        // Use defaults
      }
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return NextResponse.redirect(`${BASE_URL}/login?error=server_config`);
    }

    // Step 1: Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${BASE_URL}/login?error=token_exchange_failed`);
    }

    // Step 2: Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.redirect(`${BASE_URL}/login?error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json();
    const { sub: googleId, email, name, picture: avatar, email_verified: emailVerified } = googleUser;

    if (!email) {
      return NextResponse.redirect(`${BASE_URL}/login?error=no_email`);
    }

    // Step 3: Find or create user in DB
    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase() });

    // If signup mode and user exists with different role (skip for admins — they can always log in)
    if (user && role && user.role !== role && user.role !== 'admin' && mode === 'signup') {
      return NextResponse.redirect(
        `${BASE_URL}/login?error=role_mismatch&existing_role=${user.role}`
      );
    }

    if (!user) {
      // Create new user
      const assignedRole = role || 'founder';
      user = await User.create({
        email: email.toLowerCase(),
        name: name || 'Google User',
        authProvider: 'google',
        googleId,
        avatar,
        role: assignedRole,
        isEmailVerified: emailVerified || false,
      });
    } else {
      // Existing user: link Google account if needed
      const updates: any = { lastActive: new Date() };
      
      if (!user.googleId) {
        updates.googleId = googleId;
        updates.authProvider = 'google';
        if (avatar && !user.avatar) updates.avatar = avatar;
        if (emailVerified) updates.isEmailVerified = true;
      }
      
      await User.updateOne({ _id: user._id }, { $set: updates });
    }

    // Step 4: Generate JWT tokens
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Step 5: Set cookies and redirect to dashboard
    const sub = await Subscription.findOne({ userId: user._id });
    const userPlan = sub ? sub.plan : 'free';

    // Admin users go to /admin, all others go to /dashboard/{role}
    const redirectPath = user.role === 'admin' ? '/admin' : `/dashboard/${user.role}`;
    const response = NextResponse.redirect(`${BASE_URL}${redirectPath}`);

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error) {
    console.error('Google callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/login?error=internal`);
  }
}
