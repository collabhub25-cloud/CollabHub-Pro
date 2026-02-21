import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User, Startup } from '@/lib/models';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        await dbConnect();

        // Fetch user without sensitive fields
        const user = await User.findById(id).select(
            '_id name role bio skills experience githubUrl linkedinUrl portfolioUrl location avatar joinedAt trustScore verificationLevel'
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Fetch their public startups if they are a founder, or the startups they are a team member of
        let startups = [];
        if (user.role === 'founder') {
            startups = await Startup.find({ founderId: id }).select(
                '_id name industry stage vision fundingStage isActive'
            );
        } else if (user.role === 'talent') {
            startups = await Startup.find({ team: id }).select(
                '_id name industry stage vision fundingStage isActive'
            );
        }

        return NextResponse.json({
            success: true,
            user,
            startups,
        });
    } catch (error) {
        console.error('Error fetching public user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
