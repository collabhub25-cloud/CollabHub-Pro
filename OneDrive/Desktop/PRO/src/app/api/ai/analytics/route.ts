import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, Milestone, FundingRound, Agreement } from '@/lib/models';
import { callGemini } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

/**
 * GET /api/ai/analytics
 * AI-powered analytics: success prediction, team insights, burn rate, ROI
 * Returns role-specific analytics based on the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request, 'ai_analytics');
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 5, message: 'AI analytics rate limit reached.' });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, 'AI analytics rate limit reached.');
    }

    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();

    const user = await User.findById(authResult.user.userId)
      .select('name role verificationLevel skills')
      .lean() as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let analytics;
    switch (user.role) {
      case 'founder':
        analytics = await getFounderAnalytics(authResult.user.userId);
        break;
      case 'talent':
        analytics = await getTalentAnalytics(authResult.user.userId);
        break;
      case 'investor':
        analytics = await getInvestorAnalytics(authResult.user.userId);
        break;
      default:
        analytics = { insights: [], predictions: [], recommendations: [] };
    }

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('AI Analytics Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getFounderAnalytics(userId: string) {
  // Gather real data
  const [startups, milestones, fundingRounds, agreements] = await Promise.all([
    Startup.find({ founderId: userId }).select('name industry stage team').lean() as any,
    Milestone.find({ createdBy: userId }).select('status amount dueDate').lean() as any,
    FundingRound.find({ createdBy: userId }).select('targetAmount raisedAmount status roundName').lean() as any,
    Agreement.find({ 'parties.userId': userId }).select('status type').lean() as any,
  ]);

  const totalTeam = startups.reduce((sum: number, s: any) => sum + (s.team?.length || 0), 0);
  const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const milestoneCompletionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const totalRaised = fundingRounds.reduce((sum: number, r: any) => sum + (r.raisedAmount || 0), 0);
  const totalTarget = fundingRounds.reduce((sum: number, r: any) => sum + (r.targetAmount || 0), 0);
  const fundingProgress = totalTarget > 0 ? Math.round((totalRaised / totalTarget) * 100) : 0;
  const signedAgreements = agreements.filter((a: any) => a.status === 'signed' || a.status === 'active').length;

  // Build data summary for Gemini
  const dataSummary = {
    startupCount: startups.length,
    totalTeamMembers: totalTeam,
    milestoneCompletionRate,
    totalMilestones,
    completedMilestones,
    totalRaised,
    totalTarget,
    fundingProgress,
    signedAgreements,
    totalAgreements: agreements.length,
    industries: startups.map((s: any) => s.industry).filter(Boolean),
  };

  // Get AI insights
  const geminiResult = await callGemini({
    systemPrompt: `You are a startup analytics AI for AlloySphere. Given founder data, produce insights.
Return JSON with: { successScore: number (0-100), insights: [{ title, description, type: "positive"|"warning"|"info" }], predictions: [{ metric, value, trend: "up"|"down"|"stable" }], recommendations: [string] }.
Be data-driven and practical. Max 4 insights, 3 predictions, 3 recommendations.`,
    userPrompt: `Founder Analytics Data:\n${JSON.stringify(dataSummary, null, 2)}`,
    maxOutputTokens: 1200,
    temperature: 0.4,
    jsonMode: true,
  });

  if (geminiResult.success && geminiResult.json) {
    const ai = geminiResult.json as any;
    return {
      successScore: ai.successScore || calculateSuccessScore(dataSummary),
      insights: ai.insights || [],
      predictions: ai.predictions || [],
      recommendations: ai.recommendations || [],
      data: dataSummary,
    };
  }

  // Fallback analytics
  return {
    successScore: calculateSuccessScore(dataSummary),
    insights: generateFallbackInsights(dataSummary),
    predictions: [
      { metric: 'Team Growth', value: `${totalTeam} members`, trend: totalTeam > 3 ? 'up' : 'stable' },
      { metric: 'Funding Progress', value: `${fundingProgress}%`, trend: fundingProgress > 50 ? 'up' : 'stable' },
      { metric: 'Milestone Rate', value: `${milestoneCompletionRate}%`, trend: milestoneCompletionRate > 60 ? 'up' : 'down' },
    ],
    recommendations: [
      totalTeam < 3 ? 'Consider expanding your team to accelerate growth' : 'Your team size is healthy',
      milestoneCompletionRate < 50 ? 'Focus on completing existing milestones before adding new ones' : 'Great milestone completion rate',
      fundingProgress < 30 ? 'Update your startup profile to attract more investors' : 'Funding is on track',
    ],
    data: dataSummary,
  };
}

async function getTalentAnalytics(userId: string) {
  const [milestones, agreements, user] = await Promise.all([
    Milestone.find({ assignedTo: userId }).select('status amount title').lean() as any,
    Agreement.find({ 'parties.userId': userId }).select('status type').lean() as any,
    User.findById(userId).select('skills verificationLevel').lean() as any,
  ]);

  const completedMilestones = milestones.filter((m: any) => m.status === 'completed').length;
  const totalEarned = milestones.filter((m: any) => m.status === 'completed').reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
  const activeMilestones = milestones.filter((m: any) => m.status !== 'completed' && m.status !== 'cancelled').length;
  const productivityScore = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  const dataSummary = {
    totalMilestones: milestones.length,
    completedMilestones,
    activeMilestones,
    totalEarned,
    signedAgreements: agreements.filter((a: any) => a.status === 'signed' || a.status === 'active').length,
    skillCount: user?.skills?.length || 0,
    verificationLevel: user?.verificationLevel || 0,
    productivityScore,
  };

  const geminiResult = await callGemini({
    systemPrompt: `You are a talent analytics AI for AlloySphere. Given talent data, produce career insights.
Return JSON with: { productivityScore: number (0-100), insights: [{ title, description, type: "positive"|"warning"|"info" }], predictions: [{ metric, value, trend: "up"|"down"|"stable" }], recommendations: [string] }.
Max 3 insights, 3 predictions, 3 recommendations. Be practical and encouraging.`,
    userPrompt: `Talent Analytics Data:\n${JSON.stringify(dataSummary, null, 2)}`,
    maxOutputTokens: 1000,
    temperature: 0.4,
    jsonMode: true,
  });

  if (geminiResult.success && geminiResult.json) {
    const ai = geminiResult.json as any;
    return {
      productivityScore: ai.productivityScore || productivityScore,
      insights: ai.insights || [],
      predictions: ai.predictions || [],
      recommendations: ai.recommendations || [],
      data: dataSummary,
    };
  }

  return {
    productivityScore,
    insights: [
      { title: 'Milestone Completion', description: `${completedMilestones} of ${milestones.length} milestones completed`, type: completedMilestones > 0 ? 'positive' : 'info' },
      { title: 'Total Earned', description: `$${totalEarned.toLocaleString()} earned from completed milestones`, type: 'info' },
    ],
    predictions: [
      { metric: 'Productivity', value: `${productivityScore}%`, trend: productivityScore > 60 ? 'up' : 'stable' },
      { metric: 'Active Work', value: `${activeMilestones} tasks`, trend: activeMilestones > 0 ? 'up' : 'stable' },
    ],
    recommendations: [
      dataSummary.verificationLevel < 2 ? 'Complete verification to unlock more opportunities' : 'Good verification status',
      dataSummary.skillCount < 3 ? 'Add more skills to your profile for better matching' : 'Strong skill profile',
    ],
    data: dataSummary,
  };
}

async function getInvestorAnalytics(userId: string) {
  const [investments, agreements] = await Promise.all([
    FundingRound.find({ 'investors.userId': userId }).select('targetAmount raisedAmount status startupId roundName investors').lean() as any,
    Agreement.find({ 'parties.userId': userId }).select('status type').lean() as any,
  ]);

  const totalInvested = investments.reduce((sum: number, inv: any) => {
    const userInvestment = inv.investors?.find((i: any) => i.userId?.toString() === userId);
    return sum + (userInvestment?.amount || 0);
  }, 0);

  const dataSummary = {
    totalInvestments: investments.length,
    totalInvested,
    activeDeals: investments.filter((i: any) => i.status === 'open').length,
    completedDeals: investments.filter((i: any) => i.status === 'closed').length,
    signedAgreements: agreements.filter((a: any) => a.status === 'signed' || a.status === 'active').length,
  };

  const geminiResult = await callGemini({
    systemPrompt: `You are an investment analytics AI for AlloySphere. Given investor portfolio data, produce insights.
Return JSON with: { roiPrediction: number (percentage), insights: [{ title, description, type: "positive"|"warning"|"info" }], predictions: [{ metric, value, trend: "up"|"down"|"stable" }], recommendations: [string] }.
Max 3 insights, 3 predictions, 3 recommendations. Be analytical and cautious.`,
    userPrompt: `Investor Analytics Data:\n${JSON.stringify(dataSummary, null, 2)}`,
    maxOutputTokens: 1000,
    temperature: 0.4,
    jsonMode: true,
  });

  if (geminiResult.success && geminiResult.json) {
    const ai = geminiResult.json as any;
    return {
      roiPrediction: ai.roiPrediction || 0,
      insights: ai.insights || [],
      predictions: ai.predictions || [],
      recommendations: ai.recommendations || [],
      data: dataSummary,
    };
  }

  return {
    roiPrediction: investments.length > 0 ? 15 : 0,
    insights: [
      { title: 'Portfolio Size', description: `${investments.length} investments across the platform`, type: 'info' },
      { title: 'Active Deals', description: `${dataSummary.activeDeals} active funding rounds`, type: dataSummary.activeDeals > 0 ? 'positive' : 'info' },
    ],
    predictions: [
      { metric: 'Portfolio Value', value: `$${totalInvested.toLocaleString()}`, trend: totalInvested > 0 ? 'up' : 'stable' },
      { metric: 'Active Deals', value: `${dataSummary.activeDeals}`, trend: 'stable' },
    ],
    recommendations: [
      dataSummary.totalInvestments < 3 ? 'Diversify your portfolio with more investments' : 'Good portfolio diversification',
      'Review deal flow regularly for new opportunities',
    ],
    data: dataSummary,
  };
}

function calculateSuccessScore(data: any): number {
  let score = 30; // Base
  if (data.startupCount > 0) score += 10;
  if (data.totalTeamMembers > 2) score += 10;
  if (data.milestoneCompletionRate > 50) score += 15;
  if (data.fundingProgress > 30) score += 15;
  if (data.signedAgreements > 0) score += 10;
  if (data.milestoneCompletionRate > 80) score += 10;
  return Math.min(100, score);
}

function generateFallbackInsights(data: any) {
  const insights: { title: string; description: string; type: 'positive' | 'warning' | 'info' }[] = [];
  if (data.startupCount > 0) {
    insights.push({ title: 'Active Startups', description: `Managing ${data.startupCount} startup(s) with ${data.totalTeamMembers} team members`, type: 'positive' });
  }
  if (data.milestoneCompletionRate > 60) {
    insights.push({ title: 'Strong Execution', description: `${data.milestoneCompletionRate}% milestone completion rate indicates strong execution`, type: 'positive' });
  } else if (data.totalMilestones > 0) {
    insights.push({ title: 'Milestone Focus Needed', description: `${data.milestoneCompletionRate}% completion rate — consider prioritizing active milestones`, type: 'warning' });
  }
  if (data.fundingProgress > 50) {
    insights.push({ title: 'Funding On Track', description: `${data.fundingProgress}% of funding target raised`, type: 'positive' });
  }
  return insights;
}
