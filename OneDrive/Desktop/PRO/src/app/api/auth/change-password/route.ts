import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    extractTokenFromCookies,
    verifyAccessToken,
    verifyPassword,
    hashPassword,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const token = extractTokenFromCookies(request);
        if (!token) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const payload = verifyAccessToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
        }

        // Include the password field which is normally excluded by default depending on the schema
        const user = await User.findById(payload.userId).select('+password');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValidPassword = await verifyPassword(currentPassword, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid current password' }, { status: 403 });
        }

        const newPasswordHash = await hashPassword(newPassword);
        user.password = newPasswordHash;
        await user.save();

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
