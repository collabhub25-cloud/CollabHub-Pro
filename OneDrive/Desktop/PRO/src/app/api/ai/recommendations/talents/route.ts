import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models';
import { getRecommendedTalents } from '@/lib/ai/recommendationEngine';

export const runtime = 'nodejs';

/**
 * GET /api/ai/recommendations/talents
 * Returns AI-powered talent recommendations for founders
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();

    // Find the founder's startup
    const startup = await Startup.findOne({ founderId: authResult.user.userId })
      .select('_id')
      .lean() as any;

    if (!startup) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendations = await getRecommendedTalents(startup._id.toString());
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Talent recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
