import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Job } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'founder') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const data = await request.json();

    const { startupId, title, description, skillsRequired, experienceLevel, employmentType, locationType, compensation } = data;

    if (!startupId || !title || !description || !experienceLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const job = await Job.create({
      startupId,
      title,
      description,
      skillsRequired: skillsRequired || [],
      experienceLevel,
      employmentType: employmentType || 'full-time',
      locationType: locationType || 'remote',
      compensation: compensation || { currency: 'USD' }
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
