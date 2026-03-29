import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Job } from '@/lib/models';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: any = { isActive: true };

    const role = searchParams.get('role');
    if (role) filter.role = new RegExp(role, 'i');

    const limit = parseInt(searchParams.get('limit') || '50');

    const jobs = await Job.find(filter)
      .populate('startupId', 'name logo industry location')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ success: true, jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching all jobs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
