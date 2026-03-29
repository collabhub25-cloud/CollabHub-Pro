import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investment } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'investor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const investment = await Investment.findOne({
      _id: params.id,
      investorId: payload.userId
    }).populate('startupId');

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, investment });
  } catch (error: any) {
    console.error('Error fetching investment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
