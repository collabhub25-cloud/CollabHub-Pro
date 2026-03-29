import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Investment } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload || payload.role !== 'investor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch investments for this investor
    const investments = await Investment.find({ investorId: payload.userId })
      .populate('startupId', 'name logo industry stage fundingStage revenue website isActive')
      .sort({ investmentDate: -1 });

    // Calculate aggregated metrics
    let totalInvested = 0;
    let averageInvestmentSize = 0;
    
    investments.forEach((inv) => {
      totalInvested += inv.amountInvested;
    });

    if (investments.length > 0) {
      averageInvestmentSize = totalInvested / investments.length;
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalInvested,
        numberOfStartups: investments.length,
        averageInvestmentSize
      },
      investments
    });
  } catch (error: any) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
