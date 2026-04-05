import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserTestAttempt } from '@/lib/models/skill-test.model';

// GET: Get user's test results/history
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId');

    const filter: any = { userId, status: { $in: ['completed', 'timed_out'] } };
    if (testId) filter.testId = testId;

    const results = await UserTestAttempt.find(filter)
      .populate('testId', 'title skill difficulty durationMinutes totalPoints passingScore')
      .sort({ completedAt: -1 })
      .limit(50)
      .lean();

    // Aggregate best scores by skill
    const bestScores = await UserTestAttempt.aggregate([
      { $match: { userId: userId, status: { $in: ['completed', 'timed_out'] } } },
      {
        $lookup: {
          from: 'skilltests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test',
        },
      },
      { $unwind: '$test' },
      {
        $group: {
          _id: '$test.skill',
          bestPercentage: { $max: '$percentage' },
          bestPercentile: { $max: '$percentile' },
          attempts: { $sum: 1 },
          lastAttempt: { $max: '$completedAt' },
        },
      },
      { $sort: { bestPercentage: -1 } },
    ]);

    return NextResponse.json({
      results,
      bestScores: bestScores.map((s) => ({
        skill: s._id,
        bestPercentage: s.bestPercentage,
        bestPercentile: s.bestPercentile,
        attempts: s.attempts,
        lastAttempt: s.lastAttempt,
      })),
    });
  } catch (error) {
    console.error('GET /api/skill-tests/results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
