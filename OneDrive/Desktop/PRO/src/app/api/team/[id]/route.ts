import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { TeamMember, Startup } from '@/lib/models';

export async function GET(
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

        const member = await TeamMember.findById(id)
            .populate('userId', 'name email role avatar skills')
            .populate('startupId', 'name')
            .lean();

        if (!member) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, member });
    } catch (error) {
        console.error('Team Member Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
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

        const member = await TeamMember.findById(id);
        if (!member) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        // Only the startup founder can edit team members
        const startup = await Startup.findById(member.startupId);
        if (!startup || startup.founderId.toString() !== authResult.user.userId) {
            return NextResponse.json({ error: 'Not authorized to edit this team member' }, { status: 403 });
        }

        const body = await request.json();

        const allowedFields = ['role', 'skills', 'equity', 'status'];
        const updates: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updated = await TeamMember.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
            .populate('userId', 'name email role avatar skills')
            .lean();

        return NextResponse.json({ success: true, member: updated });
    } catch (error) {
        console.error('Team Member Update Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
