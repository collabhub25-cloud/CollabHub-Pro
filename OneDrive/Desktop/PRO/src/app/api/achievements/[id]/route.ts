import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import Achievement from '@/lib/models/achievement.model';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const achievementId = id;
        const userId = authResult.user.userId;

        // Atomic ownership-checked delete
        const deleted = await Achievement.findOneAndDelete({ _id: achievementId, userId });
        
        if (!deleted) {
            // Check if it exists but belongs to someone else
            const exists = await Achievement.findById(achievementId);
            if (!exists) {
                return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Unauthorized to delete this achievement' }, { status: 403 });
        }

        return NextResponse.json({ success: true, message: 'Achievement deleted' });

    } catch (error) {
        console.error('Achievement Delete Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
