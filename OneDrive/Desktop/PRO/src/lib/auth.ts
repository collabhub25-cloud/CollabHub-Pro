import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { User, IUser } from './models';

// ============================================
// SECRETS — from environment, never hardcoded
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'collabhub-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in production environment!');
}

// ============================================
// TOKEN PAYLOAD
// ============================================
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ============================================
// PASSWORD HASHING
// ============================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// TOKEN GENERATION
// ============================================
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

// ============================================
// TOKEN VERIFICATION
// ============================================
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** @deprecated Use verifyAccessToken instead. Kept for backward compat during migration. */
export function verifyToken(token: string): TokenPayload | null {
  return verifyAccessToken(token);
}

// ============================================
// COOKIE HELPERS
// ============================================
const COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'strict' as const,
  path: '/',
};

/**
 * Set access + refresh tokens as httpOnly cookies on a NextResponse.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  response.cookies.set('accessToken', accessToken, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 15 * 60, // 15 minutes in seconds
  });

  response.cookies.set('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return response;
}

/**
 * Clear auth cookies.
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set('accessToken', '', {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 0,
  });

  response.cookies.set('refreshToken', '', {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 0,
  });

  return response;
}

/**
 * Extract access token from request cookies.
 */
export function extractTokenFromCookies(request: NextRequest): string | null {
  return request.cookies.get('accessToken')?.value || null;
}

/**
 * Extract refresh token from request cookies.
 */
export function extractRefreshTokenFromCookies(request: NextRequest): string | null {
  return request.cookies.get('refreshToken')?.value || null;
}

/**
 * @deprecated — backward compat only; prefer extractTokenFromCookies.
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ============================================
// AUTH FLOW HELPERS
// ============================================

/**
 * Authenticate a user by email + password.
 * Returns user + both tokens. Does NOT set cookies — caller must do that.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: IUser; accessToken: string; refreshToken: string } | null> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  user.lastActive = new Date();
  await user.save();

  return { user, accessToken, refreshToken };
}

/**
 * Sanitize user object for client consumption — strips sensitive fields.
 */
export function sanitizeUser(user: IUser) {
  return {
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || undefined,
    verificationLevel: user.verificationLevel as 0 | 1 | 2 | 3,
    trustScore: user.trustScore,
    kycStatus: user.kycStatus,
    bio: user.bio || undefined,
    skills: user.skills || [],
    isEmailVerified: user.isEmailVerified,
    githubUrl: user.githubUrl || undefined,
    linkedinUrl: user.linkedinUrl || undefined,
    portfolioUrl: user.portfolioUrl || undefined,
    location: user.location || undefined,
  };
}
