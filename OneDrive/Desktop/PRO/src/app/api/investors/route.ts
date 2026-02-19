import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investor, User, Startup, FundingRound } from '@/lib/models';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// GET /api/investors - Get investor profile or list
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const investorId = searchParams.get('id');

    // If specific investor ID requested
    if (investorId) {
      const investor = await Investor.findById(investorId)
        .populate('userId', 'name email avatar trustScore verificationLevel');
      
      if (!investor) {
        return NextResponse.json(
          { error: 'Investor not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        investor,
      });
    }

    // Get current user's investor profile
    const investor = await Investor.findOne({ userId: payload.userId })
      .populate('userId', 'name email avatar trustScore verificationLevel bio location');

    if (!investor) {
      return NextResponse.json({
        success: true,
        investor: null,
        message: 'Investor profile not created yet',
      });
    }

    // Get deal flow - startups matching investor preferences
    const dealFlow = await Startup.find({
      isActive: true,
      industry: { $in: investor.preferredIndustries || [] },
      fundingStage: { $in: investor.stagePreference || [] },
    })
      .populate('founderId', 'name avatar trustScore')
      .sort({ trustScore: -1 })
      .limit(20);

    return NextResponse.json({
      success: true,
      investor,
      dealFlow,
    });
  } catch (error) {
    console.error('Get investor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/investors - Create investor profile
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is an investor
    const user = await User.findById(payload.userId);
    if (!user || user.role !== 'investor') {
      return NextResponse.json(
        { error: 'Only investors can create investor profiles' },
        { status: 403 }
      );
    }

    // Check if profile already exists
    const existingInvestor = await Investor.findOne({ userId: payload.userId });
    if (existingInvestor) {
      return NextResponse.json(
        { error: 'Investor profile already exists' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { ticketSize, preferredIndustries, stagePreference, investmentThesis } = body;

    // Validation
    if (!ticketSize || !ticketSize.min || !ticketSize.max) {
      return NextResponse.json(
        { error: 'Ticket size range is required' },
        { status: 400 }
      );
    }

    if (ticketSize.min >= ticketSize.max) {
      return NextResponse.json(
        { error: 'Minimum ticket size must be less than maximum' },
        { status: 400 }
      );
    }

    const investor = await Investor.create({
      userId: payload.userId,
      ticketSize: {
        min: ticketSize.min,
        max: ticketSize.max,
      },
      preferredIndustries: preferredIndustries || [],
      stagePreference: stagePreference || [],
      investmentThesis: investmentThesis?.trim() || undefined,
      dealHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await investor.populate('userId', 'name email avatar trustScore verificationLevel');

    console.log(`✅ New investor profile created: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Investor profile created successfully',
      investor,
    });
  } catch (error) {
    console.error('Create investor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/investors - Update investor profile
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketSize, preferredIndustries, stagePreference, investmentThesis } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (ticketSize) {
      if (ticketSize.min >= ticketSize.max) {
        return NextResponse.json(
          { error: 'Minimum ticket size must be less than maximum' },
          { status: 400 }
        );
      }
      updateData.ticketSize = ticketSize;
    }
    if (preferredIndustries) updateData.preferredIndustries = preferredIndustries;
    if (stagePreference) updateData.stagePreference = stagePreference;
    if (investmentThesis !== undefined) updateData.investmentThesis = investmentThesis;

    const investor = await Investor.findOneAndUpdate(
      { userId: payload.userId },
      { $set: updateData },
      { new: true }
    ).populate('userId', 'name email avatar trustScore verificationLevel');

    if (!investor) {
      return NextResponse.json(
        { error: 'Investor profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Investor profile updated successfully',
      investor,
    });
  } catch (error) {
    console.error('Update investor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
