import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Investor } from '@/lib/models';

// GET /api/search/investors - Search investors with filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const minTicket = searchParams.get('minTicket');
    const maxTicket = searchParams.get('maxTicket');
    const industries = searchParams.get('industries');
    const stagePreference = searchParams.get('stagePreference');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build user filter for name search
    const userFilter: Record<string, unknown> = { role: 'investor' };
    if (query) {
      userFilter.$or = [
        { name: { $regex: query, $options: 'i' } },
      ];
    }

    // Build investor filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const investorFilter: Record<string, any> = {};

    if (minTicket || maxTicket) {
      if (minTicket) {
        investorFilter['ticketSize.max'] = { $gte: parseInt(minTicket) };
      }
      if (maxTicket) {
        investorFilter['ticketSize.min'] = { $lte: parseInt(maxTicket) };
      }
    }

    if (industries) {
      investorFilter.preferredIndustries = {
        $in: industries.split(',').map(i => new RegExp(i.trim(), 'i'))
      };
    }

    if (stagePreference) {
      investorFilter.stagePreference = { $in: stagePreference.split(',') };
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder as 1 | -1;

    // Get investor user IDs first
    const investors = await Investor.find(investorFilter).lean();
    const investorUserIds = investors.map(i => i.userId);

    // Add investor IDs to user filter
    if (investorUserIds.length > 0) {
      userFilter._id = { $in: investorUserIds };
    }

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select('-passwordHash')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(userFilter),
    ]);

    // Attach investor details
    const investorDetailsMap = new Map(
      investors.map(i => [i.userId.toString(), i])
    );

    const results = users.map(user => ({
      ...user,
      investorDetails: investorDetailsMap.get(user._id.toString()) || null,
    }));

    return NextResponse.json({
      investors: results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        query,
        ticketSize: minTicket || maxTicket ? { min: minTicket, max: maxTicket } : null,
        industries,
        stagePreference,
      },
    });
  } catch (error) {
    console.error('Error searching investors:', error);
    return NextResponse.json(
      { error: 'Failed to search investors' },
      { status: 500 }
    );
  }
}
