import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Logged out of all sessions successfully'
    });

    // Clear the auth cookies to log out locally
    // In a system with a refresh token whitelist, you would also clear the DB records here
    clearAuthCookies(response);

    return response;
}
