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

    const search = searchParams.get('search');
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        // Need to be careful with startupId.name, mongoose can't always do that directly without aggregation 
        // but we'll try matching role fields as well.
        { description: new RegExp(search, 'i') }
      ];
    }

    const skillsStr = searchParams.get('skills');
    if (skillsStr) {
      const skillsArray = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      if (skillsArray.length > 0) {
        // filter.skillsRequired matches if it contains any of the queried skills
        filter.skillsRequired = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
      }
    }

    const experienceLevel = searchParams.get('experienceLevel');
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    const locationStr = searchParams.get('location');
    if (locationStr) {
      filter.locationType = locationStr;
    }

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
