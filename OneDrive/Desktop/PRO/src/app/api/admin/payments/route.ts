import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Payment } from '@/lib/models/payment.model';
import { requireAdmin, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/payments — List payments with filters and revenue summary
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status') || '';
    const purpose = searchParams.get('purpose') || '';

    // Build filter
    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'processing', 'completed', 'failed', 'refunded'].includes(status)) {
      filter.status = status;
    }
    if (purpose) {
      filter.purpose = purpose;
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [payments, total, revenueSummary, thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      Payment.find(filter)
        .populate('fromUserId', 'name email')
        .populate('startupId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),

      // Total revenue
      Payment.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalFees: { $sum: '$platformFee' },
            count: { $sum: 1 },
          },
        },
      ]),

      // This month
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thisMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),

      // Last month
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalRevenue: revenueSummary[0]?.totalRevenue || 0,
        totalFees: revenueSummary[0]?.totalFees || 0,
        totalCompleted: revenueSummary[0]?.count || 0,
        thisMonth: {
          revenue: thisMonthRevenue[0]?.total || 0,
          count: thisMonthRevenue[0]?.count || 0,
        },
        lastMonth: {
          revenue: lastMonthRevenue[0]?.total || 0,
          count: lastMonthRevenue[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('[Admin Payments] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
