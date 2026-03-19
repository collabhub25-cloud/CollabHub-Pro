import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`;

/**
 * GET /api/auth/google?role=founder
 * Redirects user to Google's OAuth 2.0 consent screen.
 */
export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get('role') || 'founder';
  const mode = request.nextUrl.searchParams.get('mode') || 'login'; // 'login' or 'signup'

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Google authentication is not configured.' },
      { status: 500 }
    );
  }

  // Encode state with role info so we can use it in callback
  const state = Buffer.from(JSON.stringify({ role, mode })).toString('base64url');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
