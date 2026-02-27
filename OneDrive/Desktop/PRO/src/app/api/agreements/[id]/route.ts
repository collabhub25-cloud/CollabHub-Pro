import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Agreement } from '@/lib/models';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        const agreement = await Agreement.findById(params.id)
            .populate('parties', 'name email role avatar')
            .populate('startupId', 'name logo industry');

        if (!agreement) {
            return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
        }

        // Security: Only involved parties or admins can view the agreement
        const isParty = agreement.parties.some(
            (party: any) => party._id.toString() === authResult.user.userId
        );

        if (!isParty && authResult.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized to view this agreement' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            data: agreement
        });
    } catch (error) {
        console.error('Agreement Fetch Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
