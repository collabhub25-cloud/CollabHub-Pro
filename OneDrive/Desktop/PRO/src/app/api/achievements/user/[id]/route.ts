import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import Achievement from '@/lib/models/achievement.model';
import mongoose from 'mongoose';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const userId = params.id;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        let targetId = userId;

        // If 'me', get the current logged in user's ID
        if (userId === 'me') {
            const authResult = await requireAuth(request);
            if (!authResult.success) {
                return NextResponse.json({ error: authResult.error }, { status: authResult.status });
            }
            targetId = authResult.user.userId;
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
        }

        const achievements = await Achievement.find({ userId: targetId })
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, achievements });
    } catch (error) {
        console.error('User Achievement Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
