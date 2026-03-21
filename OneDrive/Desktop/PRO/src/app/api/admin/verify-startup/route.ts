import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models/startup.model';
import { User } from '@/lib/models/user.model';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getAdmin(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
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

        const update: Record<string, unknown> = {
            AlloySphereVerified: verified,
            verificationNotes: notes || '',
        };

        if (verified) {
            update.AlloySphereVerifiedAt = new Date();
            update.AlloySphereVerifiedBy = admin._id;
        } else {
            update.AlloySphereVerifiedAt = null;
            update.AlloySphereVerifiedBy = null;
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
