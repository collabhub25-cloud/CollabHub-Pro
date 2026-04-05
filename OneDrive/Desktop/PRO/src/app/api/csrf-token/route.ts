/**
 * CSRF Token Endpoint
 * Provides CSRF token for client-side JavaScript to include in requests
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// GET /api/csrf-token - Get or generate CSRF token
export async function GET(request: NextRequest) {
  let token = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  // Generate new token if none exists
  if (!token) {
    token = generateCsrfToken();
  }

  const response = NextResponse.json({
    csrfToken: token,
    expiresIn: CSRF_TOKEN_MAX_AGE,
  });

  // Always set/refresh the cookie
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_TOKEN_MAX_AGE,
  });

  return response;
}
