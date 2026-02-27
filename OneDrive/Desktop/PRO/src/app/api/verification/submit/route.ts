import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Verification, UserRole } from '@/lib/models';
import { uploadDocument } from '@/lib/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { userId, role } = authResult.user;

        await connectDB();

        const formData = await request.formData();
        const file = formData.get('document') as File | null;
        const type = formData.get('type') as string;

        if (!file || !type) {
            return NextResponse.json({ error: 'Document and type are required' }, { status: 400 });
        }

        if (type === 'resume' && role !== 'talent') {
            return NextResponse.json({ error: 'Only talent can upload resumes' }, { status: 403 });
        }

        if (type === 'resume' && !ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and Word docs allowed.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        // Determine the level and constraint target based on the role and input type
        let level = 1;
        if (role === 'talent' && type === 'resume') level = 2;
        if (role === 'talent' && type === 'nda') level = 5;

        // Buffer processing
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const s3Path = `verifications/${role}/${userId}/${type}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

        // Upload to our abstraction storage
        const documentUrl = await uploadDocument(buffer, s3Path, file.type);

        // Upsert into Verification model to prevent duplicate documents clogging the DB
        const verification = await Verification.findOneAndUpdate(
            { userId, type },
            {
                role: role as UserRole,
                type,
                level,
                status: 'submitted',
                resumeUrl: type === 'resume' ? documentUrl : undefined,
                documentUrl: type !== 'resume' ? documentUrl : undefined,
                resumeFileName: file.name,
                documents: [{
                    type: file.type,
                    url: documentUrl,
                    fileName: file.name,
                    fileSize: file.size,
                    uploadedAt: new Date(),
                }],
                submittedAt: new Date(),
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({
            success: true,
            message: `${type} uploaded successfully and is pending review`,
            data: verification,
        });
    } catch (error) {
        console.error('Verification Submit Error:', error);
        return NextResponse.json({ error: 'Internal server error while uploading document' }, { status: 500 });
    }
}
