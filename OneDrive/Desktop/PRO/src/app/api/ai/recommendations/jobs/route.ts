import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { getRecommendedJobs } from '@/lib/ai/recommendationEngine';

export const runtime = 'nodejs';

/**
 * GET /api/ai/recommendations/jobs
 * Returns AI-powered job recommendations for talents
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const recommendations = await getRecommendedJobs(authResult.user.userId);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Job recommendations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
