import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Verification, UserRole } from '@/lib/models';
import { uploadDocument } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, role } = authResult.user;

        // Only Founders and Investors need to submit KYC directly here under this role abstraction
        if (role !== 'founder' && role !== 'investor') {
            return NextResponse.json({ error: 'Role not authorized for Business KYC flow' }, { status: 403 });
        }

        await connectDB();

        const formData = await request.formData();
        const file = formData.get('document') as File | null;
        const type = formData.get('type') as string;

        if (!file || !type) {
            return NextResponse.json({ error: 'Document and type are required' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        // Verify based on role and type
        let verifType = type as string;
        let level = type === 'kyc-id' ? 1 : 2; 

        // For founder: kyc-registration, kyc-gstn, kyc-pan, kyc-id
        // For investor: kyc-cin, kyc-networth, kyc-income, kyc-funds, kyc-id
        const founderTypes = ['kyc-registration', 'kyc-gstn', 'kyc-pan', 'kyc-id', 'business', 'id'];
        const investorTypes = ['kyc-cin', 'kyc-networth', 'kyc-income', 'kyc-funds', 'kyc-id', 'id'];
        
        if (role === 'founder' && !founderTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid document type for founder.' }, { status: 400 });
        }
        if (role === 'investor' && !investorTypes.includes(type)) {
            return NextResponse.json({ error: 'Invalid document type for investor.' }, { status: 400 });
        }

        // Backward compatibility
        if (type === 'business') verifType = 'kyc-registration';
        if (type === 'id') verifType = 'kyc-id';

        // Buffer processing
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const s3Path = `kyc/${role}/${userId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

        // Upload to our abstraction storage (fallback mocked locally)
        const documentUrl = await uploadDocument(buffer, s3Path, file.type);

        // Save to Verification model
        const verification = await Verification.create({
            userId,
            role: role as UserRole,
            type: verifType,
            level,
            status: 'submitted',
            documentUrl,
            documents: [{
                type: file.type,
                url: documentUrl,
                fileName: file.name,
                fileSize: file.size,
                uploadedAt: new Date(),
            }],
            submittedAt: new Date(),
        });

        // Upgrade the top-level User model if this is their first submission
        await User.findByIdAndUpdate(userId, {
            kycStatus: 'pending',
        });

        return NextResponse.json({
            success: true,
            data: verification,
        });
    } catch (error) {
        console.error('KYC Submission Error:', error);
        return NextResponse.json({ error: 'Internal server error while uploading document' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const verifications = await Verification.find({
            userId: authResult.user.userId,
            type: { $in: ['kyc-id', 'kyc-business', 'kyc-registration', 'kyc-gstn', 'kyc-pan', 'kyc-cin', 'kyc-networth', 'kyc-income', 'kyc-funds'] }
        }).sort({ createdAt: -1 });

        const user = await User.findById(authResult.user.userId).select('kycStatus kycLevel');

        return NextResponse.json({
            success: true,
            kycStatus: user?.kycStatus || 'not_submitted',
            kycLevel: user?.kycLevel || 0,
            documents: verifications,
        });
    } catch (error) {
        console.error('KYC Status Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
