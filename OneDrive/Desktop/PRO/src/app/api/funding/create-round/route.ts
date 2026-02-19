import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FundingRound, Startup, User, Notification } from '@/lib/models';
import { verifyToken } from '@/lib/auth';
import { validateInput, CreateFundingRoundSchema } from '@/lib/validation/schemas';

// POST /api/funding/create-round - Create a funding round
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Verify founder role
    const user = await User.findById(decoded.userId);
    if (!user || user.role !== 'founder') {
      return NextResponse.json(
        { error: 'Only founders can create funding rounds' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Zod validation
    const validation = validateInput(CreateFundingRoundSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { 
      startupId, 
      roundName, 
      targetAmount, 
      equityOffered, 
      valuation, 
      minInvestment,
      closesAt 
    } = validation.data;

    // Verify startup ownership
    const startup = await Startup.findById(startupId);
    if (!startup) {
      return NextResponse.json(
        { error: 'Startup not found' },
        { status: 404 }
      );
    }

    if (startup.founderId.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'You can only create rounds for your own startups' },
        { status: 403 }
      );
    }

    // Create funding round
    const round = await FundingRound.create({
      startupId,
      roundName,
      targetAmount,
      raisedAmount: 0,
      equityOffered,
      valuation,
      minInvestment,
      status: 'open',
      investors: [],
      closesAt: closesAt ? new Date(closesAt) : undefined,
    });

    return NextResponse.json({
      success: true,
      round: {
        _id: round._id,
        roundName: round.roundName,
        targetAmount: round.targetAmount,
        equityOffered: round.equityOffered,
        status: round.status,
        createdAt: round.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating funding round:', error);
    return NextResponse.json(
      { error: 'Failed to create funding round' },
      { status: 500 }
    );
  }
}

// GET /api/funding/create-round - Get rounds for startup
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startupId = searchParams.get('startupId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (startupId) query.startupId = startupId;
    if (status) query.status = status;

    const rounds = await FundingRound.find(query)
      .populate('startupId', 'name industry stage logo')
      .populate('investors.investorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      rounds,
      total: rounds.length,
    });
  } catch (error) {
    console.error('Error fetching funding rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funding rounds' },
      { status: 500 }
    );
  }
}
