import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '@/lib/security';
import { validateResumeFile, sanitizeFileName } from '@/lib/verification-service';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'talent') {
      return NextResponse.json({ error: 'Only talents can upload resumes' }, { status: 403 });
    }

    const { fileName, mimeType } = await request.json();

    if (!fileName || !mimeType) {
      return NextResponse.json({ error: 'fileName and mimeType are required' }, { status: 400 });
    }

    // Validate file type using the existing service
    const typeValidation = validateResumeFile(mimeType, fileName);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    const sanitizedName = sanitizeFileName(fileName);
    const key = `resumes/${authResult.user.userId}/${Date.now()}-${sanitizedName}`;
    const bucket = process.env.AWS_S3_BUCKET || 'alloysphere-uploads';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      // Metadata could be added here
    });

    // Signed URL expires in 5 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      fileUrl,
      key,
    });
  } catch (error) {
    console.error('S3 Presigned URL Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
