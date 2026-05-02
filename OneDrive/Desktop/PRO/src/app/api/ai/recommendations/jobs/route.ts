import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedJobs } from '@/lib/ai/recommendationEngine';
import { requireAuth } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'talent') {
      return NextResponse.json({ error: 'Only talents can get job recommendations' }, { status: 403 });
    }

    const recommendations = await getRecommendedJobs(authResult.user.userId);
    return NextResponse.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Jobs Recommendation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
