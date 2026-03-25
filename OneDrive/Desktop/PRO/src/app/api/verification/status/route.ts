import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Verification, User, VERIFICATION_LEVELS } from '@/lib/models';
import { generateSecureDownloadUrl } from '@/lib/storage';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId, role } = authResult.user;

        // Admins skip verification in this context
        if (role === 'admin') {
            return NextResponse.json({ success: true, verified: true, currentLevel: 5, pendingSteps: [] });
        }

        await connectDB();

        const user = await User.findById(userId).select('verificationLevel isEmailVerified');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Role-specific verification config matrix
        const requiredSteps = VERIFICATION_LEVELS[role] || [];

        // Existing documents the user submitted
        const submissions = await Verification.find({ userId }).sort({ level: 1 });

        // Construct the status map
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        let levelBumped = false;

        const mappedSteps = await Promise.all(requiredSteps.map(async (step) => {
            let isCompleted = false;
            let status = 'not_started';
            let documentUrl: string | null = null;
            let rejectionReason: string | null = null;

            // Special hardcoded hooks (e.g email)
            if (step.type === 'email_verified') {
                isCompleted = user.isEmailVerified;
                status = user.isEmailVerified ? 'approved' : 'pending';
            } else if (step.type === 'profile') {
                // Mock profile check
                isCompleted = true;
                status = 'approved';
            } else {
                // Document-based hooks
                const matchingDoc = submissions.find(sub => sub.type === step.type);
                if (matchingDoc) {
                    status = matchingDoc.status;

                    // AUTO-APPROVAL: If pending for more than 2 hours, auto-approve
                    if (status === 'pending' && matchingDoc.createdAt) {
                        const elapsed = Date.now() - new Date(matchingDoc.createdAt).getTime();
                        if (elapsed >= TWO_HOURS_MS) {
                            matchingDoc.status = 'approved';
                            matchingDoc.reviewedAt = new Date();
                            matchingDoc.reviewNotes = 'Auto-approved after 2 hours';
                            await matchingDoc.save();
                            status = 'approved';

                            // Bump user verification level if applicable
                            if (step.level && step.level > (user.verificationLevel || 0)) {
                                user.verificationLevel = step.level;
                                levelBumped = true;
                            }
                        }
                    }

                    isCompleted = status === 'approved';
                    rejectionReason = matchingDoc.rejectionReason;
                    if (matchingDoc.documentUrl || matchingDoc.resumeUrl) {
                        documentUrl = await generateSecureDownloadUrl(matchingDoc.documentUrl || matchingDoc.resumeUrl as string);
                    }
                }
            }

            return {
                ...step,
                status,
                isCompleted,
                documentUrl,
                rejectionReason,
            };
        }));

        // Save user if level was bumped
        if (levelBumped) {
            await user.save();
        }

        return NextResponse.json({
            success: true,
            currentLevel: user.verificationLevel,
            steps: mappedSteps,
        });
    } catch (error) {
        console.error('Verification Status Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
