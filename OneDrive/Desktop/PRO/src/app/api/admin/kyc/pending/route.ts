import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Verification, User } from '@/lib/models';
import { generateSecureDownloadUrl } from '@/lib/storage';

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();

        // Fetch all pending KYCs specifically
        const pendingKYCs = await Verification.find({
            status: 'submitted',
            type: { $in: ['kyc-id', 'kyc-business'] },
        }).sort({ submittedAt: 1 }).populate('userId', 'name email role');

        // Secure all returned S3 URLs for viewing over the admin panel
        const securedDocs = await Promise.all(pendingKYCs.map(async (doc) => {
            const secureObject = doc.toObject();
            if (secureObject.documentUrl) {
                secureObject.documentUrl = await generateSecureDownloadUrl(secureObject.documentUrl);
            }
            return secureObject;
        }));

        return NextResponse.json({
            success: true,
            pendingCount: securedDocs.length,
            data: securedDocs,
        });
    } catch (error) {
        console.error('Admin Fetch Pending KYC Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
