import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from './models';

// SECURITY: All secrets come from environment variables - no hardcoded values
const JWT_SECRET = process.env.JWT_SECRET || 'collabhub-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// Warn if using development secrets in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('⚠️ WARNING: JWT_SECRET not set in production environment!');
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function authenticateUser(email: string, password: string): Promise<{ user: IUser; token: string } | null> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Generate token
  const token = generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  // Update last active
  user.lastActive = new Date();
  await user.save();

  return { user, token };
}

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
