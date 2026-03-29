import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import Achievement from '@/lib/models/achievement.model';

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const body = await request.json();
        const { title, description, type, organization, date, proofLink, visibility } = body;

        if (!title || !type) {
            return NextResponse.json({ error: 'title and type are required' }, { status: 400 });
        }

        const achievement = await Achievement.create({
            userId: authResult.user.userId,
            title,
            description,
            type,
            organization,
            date: date ? new Date(date) : undefined,
            proofLink,
            visibility: visibility || 'public',
        });

        return NextResponse.json({ success: true, achievement }, { status: 201 });
    } catch (error) {
        console.error('User Achievement Create Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
