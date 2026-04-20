import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models/startup.model';
import { User } from '@/lib/models/user.model';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
    const token = req.cookies.get('accessToken')?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        await connectDB();
        const user = await User.findById(decoded.userId).select('role');
        if (!user || user.role !== 'admin') return null;
        return user;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const admin = await getAdmin(req);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized – admin only' }, { status: 403 });
    }

    try {
        const { startupId, verified, notes } = await req.json();

        if (!startupId || typeof verified !== 'boolean') {
            return NextResponse.json({ error: 'startupId and verified (boolean) are required' }, { status: 400 });
        }

        await connectDB();

        // Automated verification criteria check
        if (verified) {
            const startup = await Startup.findById(startupId).populate('founderId', 'isEmailVerified');
            if (!startup) {
                return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
            }

            const founder = startup.founderId as any;
            const warnings: string[] = [];

            if (!founder?.isEmailVerified) {
                warnings.push('Founder email is not verified');
            }
            if (!startup.description || startup.description.length < 50) {
                warnings.push('Startup description is incomplete (min 50 chars)');
            }
            if (!startup.industry) {
                warnings.push('Industry not specified');
            }

            // Return warnings but still allow verification
            if (warnings.length > 0) {
                // Admin can override, but log it
                console.warn(`[VERIFY] Admin ${admin._id} verifying startup ${startupId} with warnings:`, warnings);
            }
        }

        const update: Record<string, unknown> = {
            AlloySphereVerified: verified,
            verificationNotes: notes || '',
        };

        if (verified) {
            update.AlloySphereVerifiedAt = new Date();
            update.AlloySphereVerifiedBy = admin._id;
            update.verificationStatus = 'approved';
            update.verifiedAt = new Date();
        } else {
            update.AlloySphereVerifiedAt = null;
            update.AlloySphereVerifiedBy = null;
            update.verificationStatus = 'rejected';
            update.verifiedAt = null;
        }

        const startup = await Startup.findByIdAndUpdate(startupId, update, { new: true });

        if (!startup) {
            return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
        }

        return NextResponse.json({ startup, message: `Startup ${verified ? 'verified' : 'unverified'} successfully` });
    } catch (error) {
        console.error('Admin verify-startup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: Admin-only — list startups by verification status
export async function GET(req: NextRequest) {
    const admin = await getAdmin(req);
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized – admin only' }, { status: 403 });
    }

    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status'); // 'verified', 'unverified', 'pending', or 'all'

        const filter: any = {};
        if (status === 'verified') filter.AlloySphereVerified = true;
        else if (status === 'unverified') filter.AlloySphereVerified = { $ne: true };
        else if (status === 'pending') filter.verificationStatus = 'pending';
        else if (status === 'rejected') filter.verificationStatus = 'rejected';

        const startups = await Startup.find(filter)
            .select('name industry stage AlloySphereVerified AlloySphereVerifiedAt verificationNotes verificationStatus verificationRequestedAt verifiedAt founderId')
            .populate('founderId', 'name email isEmailVerified')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({ startups });
    } catch (error) {
        console.error('Admin GET verify-startup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
