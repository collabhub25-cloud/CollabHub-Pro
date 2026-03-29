import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Job } from '@/lib/models';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Startup ID is required' }, { status: 400 });
    }

    // Fetch jobs for this startup
    const jobs = await Job.find({ startupId: id }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching jobs for startup:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
