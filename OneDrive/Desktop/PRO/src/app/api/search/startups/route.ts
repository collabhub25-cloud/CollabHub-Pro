import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup } from '@/lib/models';
import { sanitizeSearchQuery, escapeRegex, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

// GET /api/search/startups - Search startups with filters
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'search');
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.search);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.search.message);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    
    // SECURITY FIX: Sanitize query to prevent ReDoS
    const query = sanitizeSearchQuery(rawQuery);
    
    const industry = searchParams.get('industry');
    const stage = searchParams.get('stage');
    const fundingStage = searchParams.get('fundingStage');
    const minTrustScore = searchParams.get('minTrustScore');
    const maxTrustScore = searchParams.get('maxTrustScore');
    const location = searchParams.get('location');
    
    // Validate and limit pagination
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1'), 1), 1000);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build filter
    const filter: Record<string, unknown> = { isActive: true };

    // SECURITY FIX: Escape regex in queries
    if (query) {
      const safeQuery = escapeRegex(query);
      filter.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } },
        { vision: { $regex: safeQuery, $options: 'i' } },
      ];
    }

    if (industry) {
      // SECURITY FIX: Escape regex in industry filter
      const industries = industry.split(',').map(i => escapeRegex(i.trim())).filter(i => i);
      if (industries.length > 0) {
        filter.industry = { $in: industries.map(i => new RegExp(i, 'i')) };
      }
    }

    if (stage) {
      // Validate stage values
      const validStages = ['idea', 'validation', 'mvp', 'growth', 'scaling'];
      const stages = stage.split(',').filter(s => validStages.includes(s.trim()));
      if (stages.length > 0) {
        filter.stage = { $in: stages };
      }
    }

    if (fundingStage) {
      // Validate funding stage values
      const validFundingStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];
      const fundingStages = fundingStage.split(',').filter(s => validFundingStages.includes(s.trim()));
      if (fundingStages.length > 0) {
        filter.fundingStage = { $in: fundingStages };
      }
    }

    if (minTrustScore || maxTrustScore) {
      const min = minTrustScore ? Math.max(0, Math.min(100, parseInt(minTrustScore))) : 0;
      const max = maxTrustScore ? Math.max(0, Math.min(100, parseInt(maxTrustScore))) : 100;
      filter.trustScore = { $gte: min, $lte: max };
    }

    if (location) {
      // SECURITY FIX: Escape regex in location
      const safeLocation = escapeRegex(location.substring(0, 100));
      filter.$or = filter.$or || [];
      filter.$or.push({ 'location': { $regex: safeLocation, $options: 'i' } });
    }

    // Build sort (validate sortBy to prevent injection)
    const validSortFields = ['createdAt', 'trustScore', 'name', 'updatedAt'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort: Record<string, number> = {};
    sort[safeSortBy] = sortOrder;

    // Execute query with pagination
    const [startups, total] = await Promise.all([
      Startup.find(filter)
        .populate('founderId', '_id name email avatar trustScore')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Startup.countDocuments(filter),
    ]);

    return NextResponse.json({
      startups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        query,
        industry,
        stage,
        fundingStage,
        trustScoreRange: minTrustScore || maxTrustScore ? { min: minTrustScore, max: maxTrustScore } : null,
        location,
      },
    });
  } catch (error) {
    console.error('Error searching startups:', error);
    return NextResponse.json(
      { error: 'Failed to search startups' },
      { status: 500 }
    );
  }
}
