import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sanitizeSearchQuery, escapeRegex, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';

// GET /api/search/talents - Search talents with filters
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

    const skills = searchParams.get('skills');
    const verificationLevel = searchParams.get('verificationLevel');
    const minTrustScore = searchParams.get('minTrustScore');
    const maxTrustScore = searchParams.get('maxTrustScore');
    const experience = searchParams.get('experience');

    // Validate and limit pagination
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1'), 1), 1000);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100);
    const sortBy = searchParams.get('sortBy') || 'trustScore';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build filter
    const filter: Record<string, unknown> = { role: 'talent' };

    // SECURITY FIX: Escape regex in queries
    if (query) {
      const safeQuery = escapeRegex(query);
      filter.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { bio: { $regex: safeQuery, $options: 'i' } },
      ];
    }

    if (skills) {
      // SECURITY FIX: Escape regex in skills filter
      const skillList = skills.split(',').map(s => escapeRegex(s.trim())).filter(s => s);
      if (skillList.length > 0) {
        filter.skills = { $in: skillList.map(s => new RegExp(s, 'i')) };
      }
    }

    if (verificationLevel) {
      // Validate verification level values
      const levels = verificationLevel.split(',')
        .map(Number)
        .filter(l => l >= 0 && l <= 4);
      if (levels.length > 0) {
        filter.verificationLevel = { $in: levels };
      }
    }

    if (minTrustScore || maxTrustScore) {
      const min = minTrustScore ? Math.max(0, Math.min(100, parseInt(minTrustScore))) : 0;
      const max = maxTrustScore ? Math.max(0, Math.min(100, parseInt(maxTrustScore))) : 100;
      filter.trustScore = { $gte: min, $lte: max };
    }

    if (experience) {
      // SECURITY FIX: Escape regex in experience filter
      const safeExp = escapeRegex(experience.substring(0, 100));
      filter.experience = { $regex: safeExp, $options: 'i' };
    }

    // Build sort (validate sortBy to prevent injection)
    const validSortFields = ['trustScore', 'verificationLevel', 'createdAt', 'name'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'trustScore';
    const sort: Record<string, 1 | -1> = {};
    sort[safeSortBy] = sortOrder as 1 | -1;

    // Execute query with pagination
    const [talents, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      talents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        query,
        skills,
        verificationLevel,
        trustScoreRange: minTrustScore || maxTrustScore ? { min: minTrustScore, max: maxTrustScore } : null,
        experience,
      },
    });
  } catch (error) {
    console.error('Error searching talents:', error);
    return NextResponse.json(
      { error: 'Failed to search talents' },
      { status: 500 }
    );
  }
}
