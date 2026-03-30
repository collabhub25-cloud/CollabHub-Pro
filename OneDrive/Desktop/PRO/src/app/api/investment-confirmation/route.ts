import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvestmentConfirmation, Pitch, Startup, User, Investment, TeamMember, Notification } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';

// GET /api/investment-confirmation — Get confirmation status
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const pitchId = searchParams.get('pitchId');
    const startupId = searchParams.get('startupId');
    const investorId = searchParams.get('investorId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};

    if (pitchId) query.pitchId = pitchId;
    if (startupId) query.startupId = startupId;
    if (investorId) query.investorId = investorId;
    if (status) query.status = status;

    // Security: only show confirmations relevant to the current user
    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role === 'investor') {
      query.investorId = payload.userId;
    } else if (user.role === 'founder') {
      // Get all startups owned by this founder
      const startups = await Startup.find({ founderId: payload.userId }).select('_id');
      const startupIds = startups.map(s => s._id);
      query.startupId = { $in: startupIds };
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    const confirmations = await InvestmentConfirmation.find(query)
      .populate('startupId', 'name logo industry stage')
      .populate('investorId', 'name avatar email')
      .populate('pitchId', 'pitchStatus pitchDocumentUrl pitchSentAt')
      .sort({ createdAt: -1 })
      .lean();

    // Strip sensitive data: don't reveal the other party's entry until both have submitted
    const sanitized = confirmations.map((c: any) => {
      const isFounder = user.role === 'founder';
      const isInvestor = user.role === 'investor';
      const bothSubmitted = c.status === 'matched' || c.status === 'mismatched';

      return {
        ...c,
        // Only show own entry or both if matched/mismatched
        founderAmount: (isFounder || bothSubmitted) ? c.founderAmount : undefined,
        founderEquity: (isFounder || bothSubmitted) ? c.founderEquity : undefined,
        investorAmount: (isInvestor || bothSubmitted) ? c.investorAmount : undefined,
        investorEquity: (isInvestor || bothSubmitted) ? c.investorEquity : undefined,
      };
    });

    return NextResponse.json({ success: true, confirmations: sanitized });
  } catch (error) {
    console.error('Fetch Confirmations Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
