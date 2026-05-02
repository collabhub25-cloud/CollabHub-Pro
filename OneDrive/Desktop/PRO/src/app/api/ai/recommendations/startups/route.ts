import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedStartups } from '@/lib/ai/recommendationEngine';
import { requireAuth } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can get startup recommendations' }, { status: 403 });
    }

    const recommendations = await getRecommendedStartups(authResult.user.userId);
    return NextResponse.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Startups Recommendation Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
