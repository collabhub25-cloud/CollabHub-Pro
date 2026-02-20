import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    verifyRefreshToken,
    generateAccessToken,
    generateRefreshToken,
    extractRefreshTokenFromCookies,
    setAuthCookies,
    clearAuthCookies,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const refreshTokenValue = extractRefreshTokenFromCookies(request);

        if (!refreshTokenValue) {
            const response = NextResponse.json(
                { error: 'No refresh token' },
                { status: 401 }
            );
            return clearAuthCookies(response);
        }

        const payload = verifyRefreshToken(refreshTokenValue);
        if (!payload) {
            const response = NextResponse.json(
                { error: 'Invalid or expired refresh token' },
                { status: 401 }
            );
            return clearAuthCookies(response);
        }

        await connectDB();

        // Verify user still exists and is active
        const user = await User.findById(payload.userId).lean();
        if (!user) {
            const response = NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
            return clearAuthCookies(response);
        }

        // Issue new token pair (rotation)
        const tokenPayload = {
            userId: payload.userId,
            email: user.email,
            role: user.role,
        };

        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        const response = NextResponse.json({
            success: true,
            message: 'Token refreshed',
        });

        return setAuthCookies(response, newAccessToken, newRefreshToken);
    } catch (error) {
        console.error('Refresh token error:', error);
        const response = NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
        return clearAuthCookies(response);
    }
}
