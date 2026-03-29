import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Startup, Investment, User } from '@/lib/models';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const investor = await User.findById(payload.userId);
    let industriesOfInterest: string[] = [];

    if (investor?.role === 'investor' && investor.investorProfile?.targetIndustries) {
      industriesOfInterest = investor.investorProfile.targetIndustries;
    } else {
      // Find industries of past investments to serve as recommendations
      const pastInvestments = await Investment.find({ investorId: payload.userId }).populate('startupId', 'industry');
      
      const industries = new Set<string>();
      pastInvestments.forEach(inv => {
        if (inv.startupId && inv.startupId.industry) {
          industries.add(inv.startupId.industry);
        }
      });
      industriesOfInterest = Array.from(industries);
    }

    let filter: any = { isActive: true };
    
    // If we detected industries, prioritize them. If not, just return broad recommendations (e.g., highly active startups).
    if (industriesOfInterest.length > 0) {
      filter.industry = { $in: industriesOfInterest };
    }

    // Exclude startups they already invested in
    const existingInvestments = await Investment.find({ investorId: payload.userId }).select('startupId');
    const investedIds = existingInvestments.map(inv => inv.startupId);
    
    if (investedIds.length > 0) {
      filter._id = { $nin: investedIds };
    }

    const recommendedStartups = await Startup.find(filter)
      .limit(5)
      .sort({ createdAt: -1 }) // Simple sort, in reality this would be scored by AI metrics
      .select('name logo industry stage fundingStage vision matchScore');

    // MOCK AI DATA ATTACHMENT: Calculate a mock "AI Match Score" for each based on criteria.
    const startupsWithInsights = recommendedStartups.map(startup => {
      const doc = startup.toObject();
      return {
        ...doc,
        aiMatchScore: Math.floor(Math.random() * (98 - 75) + 75), // random 75-98 for realism
        aiReasoning: `Strong market alignment in ${doc.industry} matching your historical investment patterns.`
      };
    });

    // Sort by mock AI score
    startupsWithInsights.sort((a, b) => b.aiMatchScore - a.aiMatchScore);

    return NextResponse.json({ success: true, recommended: startupsWithInsights });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
