import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models';
import Achievement from '@/lib/models/achievement.model';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const startupId = searchParams.get('startupId');

        if (!startupId) {
            return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
        }

        const achievements = await Achievement.find({ startupId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, achievements });
    } catch (error) {
        console.error('Achievement Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const body = await request.json();
        const { startupId, title, description, type, visibility } = body;

        if (!startupId || !title || !description || !type) {
            return NextResponse.json({ error: 'startupId, title, description, and type are required' }, { status: 400 });
        }

        // Only the startup founder can post achievements
        const startup = await Startup.findById(startupId);
        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }
        if (startup.founderId.toString() !== authResult.user.userId) {
            return NextResponse.json({ error: 'Only the startup founder can post achievements' }, { status: 403 });
        }

        const achievement = await Achievement.create({
            startupId,
            title,
            description,
            type,
            visibility: visibility || 'public',
        });

        return NextResponse.json({ success: true, achievement }, { status: 201 });
    } catch (error) {
        console.error('Achievement Create Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
