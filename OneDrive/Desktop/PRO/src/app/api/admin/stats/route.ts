import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user.model';
import { Startup } from '@/lib/models/startup.model';
import { Payment } from '@/lib/models/payment.model';
import { requireAdmin, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorizedResponse();

  try {
    await connectDB();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalUsers,
      founderCount,
      investorCount,
      talentCount,
      newUsersWeek,
      newUsersMonth,
      totalStartups,
      activeStartups,
      pendingVerifications,
      approvedStartups,
      rejectedStartups,
      totalPayments,
      completedPayments,
      revenueResult,
      recentUsers,
      startupsByStage,
      startupsByIndustry,
      paymentsByPurpose,
      monthlyUserGrowth,
    ] = await Promise.all([
      // User counts
      User.countDocuments({}),
      User.countDocuments({ role: 'founder' }),
      User.countDocuments({ role: 'investor' }),
      User.countDocuments({ role: 'talent' }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      // Startup counts
      Startup.countDocuments({}),
      Startup.countDocuments({ isActive: true }),
      Startup.countDocuments({ verificationStatus: 'pending' }),
      Startup.countDocuments({ verificationStatus: 'approved' }),
      Startup.countDocuments({ verificationStatus: 'rejected' }),

      // Payment counts
      Payment.countDocuments({}),
      Payment.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Recent users (last 10)
      User.find({})
        .select('name email role avatar isEmailVerified createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Startups by stage
      Startup.aggregate([
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Startups by industry (top 8)
      Startup.aggregate([
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // Payments by purpose
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$purpose', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),

      // Monthly user growth (last 6 months)
      User.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: { founder: founderCount, investor: investorCount, talent: talentCount },
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
        recent: recentUsers,
      },
      startups: {
        total: totalStartups,
        active: activeStartups,
        pendingVerifications,
        approved: approvedStartups,
        rejected: rejectedStartups,
        byStage: startupsByStage,
        byIndustry: startupsByIndustry,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        totalRevenue, // in paise
        byPurpose: paymentsByPurpose,
      },
      growth: {
        monthlyUsers: monthlyUserGrowth,
      },
    });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
