import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedTalents } from '@/lib/ai/recommendationEngine';
import { requireAuth } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can get talent recommendations' }, { status: 403 });
    }

    // Usually, you need a startupId to recommend talents.
    // Assuming the frontend passes startupId as a query param.
    const url = new URL(request.url);
    const startupId = url.searchParams.get('startupId');

    if (!startupId) {
      return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
    }

    const recommendations = await getRecommendedTalents(startupId);
    return NextResponse.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Talents Recommendation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
