import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getRecommendedStartups, getRecommendedInvestors } from '@/lib/ai/recommendationEngine';

export const runtime = 'nodejs';

/**
 * GET /api/ai/recommendations/startups
 * Returns AI-powered startup recommendations for investors,
 * or investor recommendations for founders.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const user = await User.findById(authResult.user.userId).select('role').lean() as any;

    if (user?.role === 'founder') {
      // For founders, return investor recommendations
      const recommendations = await getRecommendedInvestors(authResult.user.userId);
      return NextResponse.json({ recommendations });
    }

    // Default: investor gets startup recommendations
    const recommendations = await getRecommendedStartups(authResult.user.userId);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Startup recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
