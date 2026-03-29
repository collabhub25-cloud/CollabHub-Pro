import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { JourneyPost, Startup, User } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('startupId');

    if (!startupId) {
      return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
    }

    const posts = await JourneyPost.find({ startupId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error('Fetch Journey Posts Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { startupId, title, description, mediaUrls, postType, tags } = body;

    // Check auth -> Founder only check
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can log journey posts' }, { status: 403 });
    }

    // Verify startup ownership
    const startup = await Startup.findById(startupId);
    if (!startup || startup.founderId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Not authorized for this startup' }, { status: 403 });
    }

    const post = await JourneyPost.create({
      startupId,
      title,
      description,
      mediaUrls: mediaUrls || [],
      postType: postType || 'general',
      tags: tags || [],
    });

    // We no longer push to legacy achievements array, but we can do it for backwards compatibility if needed.
    // However, goal is to remove legacy `achievements` array entirely.

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Create Journey Post Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
