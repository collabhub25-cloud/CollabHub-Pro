import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investor, User } from '@/lib/models';
import { requireAuth } from '@/lib/security';

/**
 * GET /api/investors/profile
 * Fetch the authenticated investor's profile (preferences, thesis, ticket size).
 * If no profile exists yet, returns { exists: false } so the frontend can prompt setup.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can access this endpoint' }, { status: 403 });
    }

    await connectDB();

    const profile = await Investor.findOne({ userId: authResult.user.userId })
      .populate('userId', 'name email avatar verificationLevel')
      .lean();

    if (!profile) {
      return NextResponse.json({ success: true, exists: false, profile: null });
    }

    return NextResponse.json({ success: true, exists: true, profile });
  } catch (error) {
    console.error('Investor Profile Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/investors/profile
 * Create or update the investor's profile (upsert).
 *
 * Body: {
 *   ticketSize: { min: number, max: number },
 *   preferredIndustries: string[],
 *   stagePreference: FundingStage[],
 *   investmentThesis?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (authResult.user.role !== 'investor') {
      return NextResponse.json({ error: 'Only investors can create profiles' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { ticketSize, preferredIndustries, stagePreference, investmentThesis } = body;

    // Validation
    if (!ticketSize || typeof ticketSize.min !== 'number' || typeof ticketSize.max !== 'number') {
      return NextResponse.json({ error: 'ticketSize with min and max (numbers) is required' }, { status: 400 });
    }

    if (ticketSize.min < 0 || ticketSize.max < ticketSize.min) {
      return NextResponse.json({ error: 'Invalid ticketSize range' }, { status: 400 });
    }

    const validStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];
    if (stagePreference && !Array.isArray(stagePreference)) {
      return NextResponse.json({ error: 'stagePreference must be an array' }, { status: 400 });
    }
    if (stagePreference?.some((s: string) => !validStages.includes(s))) {
      return NextResponse.json({ error: `Invalid stage. Valid: ${validStages.join(', ')}` }, { status: 400 });
    }

    // Upsert profile
    const profile = await Investor.findOneAndUpdate(
      { userId: authResult.user.userId },
      {
        $set: {
          userId: authResult.user.userId,
          ticketSize: {
            min: ticketSize.min,
            max: ticketSize.max,
          },
          preferredIndustries: preferredIndustries || [],
          stagePreference: stagePreference || [],
          investmentThesis: investmentThesis?.substring(0, 2000) || undefined,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    return NextResponse.json({
      success: true,
      message: 'Investor profile saved',
      profile,
    });
  } catch (error) {
    console.error('Investor Profile Save Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
