import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User, Startup, FundingRound } from '@/lib/models';
import { callGemini, sanitizePromptInput } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

/**
 * POST /api/ai/match
 * AI-powered matching: talent↔startups or investor↔startups
 * 
 * Body: { type: 'talent-startup' | 'investor-startup' }
 * Returns: { matches: Array<{ id, name, score, explanation, reasons }> }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, 'ai_match');
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 5, message: 'AI matching rate limit reached.' });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, 'AI matching rate limit reached. Please try again later.');
    }

    // Auth
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { type } = await request.json();
    if (!type || !['talent-startup', 'investor-startup'].includes(type)) {
      return NextResponse.json({ error: 'Invalid match type. Use "talent-startup" or "investor-startup".' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(authResult.user.userId)
      .select('name role skills experience bio location verificationLevel')
      .lean() as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (type === 'talent-startup' && user.role !== 'talent' && user.role !== 'founder') {
      return NextResponse.json({ error: 'Talent-startup matching requires talent or founder role' }, { status: 403 });
    }

    if (type === 'investor-startup' && user.role !== 'investor' && user.role !== 'founder') {
      return NextResponse.json({ error: 'Investor-startup matching requires investor or founder role' }, { status: 403 });
    }

    let matches;
    if (type === 'talent-startup') {
      matches = await matchTalentToStartups(user);
    } else {
      matches = await matchInvestorToStartups(user);
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('AI Match Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function matchTalentToStartups(user: any) {
  // Fetch active startups with open positions
  const startups = await Startup.find({ status: { $ne: 'closed' } })
    .select('name vision description industry stage fundingStage team founderId')
    .populate('founderId', 'name verificationLevel')
    .limit(20)
    .lean() as any[];

  if (startups.length === 0) {
    return [];
  }

  const userProfile = {
    skills: user.skills || [],
    experience: user.experience || 'Not specified',
    bio: user.bio || '',
    location: user.location || 'Not specified',
    verificationLevel: user.verificationLevel || 0,
  };

  const startupSummaries = startups.map((s: any, i: number) => ({
    index: i,
    name: s.name,
    industry: s.industry,
    stage: s.stage,
    vision: s.vision?.substring(0, 150),
    teamSize: s.team?.length || 0,
    founderVerified: s.founderId?.verificationLevel || 0,
  }));

  const systemPrompt = `You are an AI matching engine for AlloySphere, a startup collaboration platform.
Analyze the talent profile and available startups to find the best matches.
Return a JSON array of the top 5 matches sorted by score (highest first).
Each match must have: index (number), score (0-100), explanation (1-2 sentences), reasons (array of 2-3 short strings).
Only return the JSON array, no other text.`;

  const userPrompt = `Talent Profile:
Skills: ${userProfile.skills.join(', ') || 'None listed'}
Experience: ${sanitizePromptInput(userProfile.experience)}
Bio: ${sanitizePromptInput(userProfile.bio)}
Location: ${userProfile.location}
Verification Level: ${userProfile.verificationLevel}

Available Startups:
${JSON.stringify(startupSummaries, null, 2)}

Find the best startup matches for this talent based on skill alignment, industry fit, stage appropriateness, and team composition.`;

  const geminiResult = await callGemini({
    systemPrompt,
    userPrompt,
    maxOutputTokens: 1500,
    temperature: 0.5,
    jsonMode: true,
  });

  if (!geminiResult.success || !geminiResult.json) {
    // Fallback: return basic keyword-based matches
    return generateFallbackMatches(startups, user.skills || []);
  }

  const aiMatches = Array.isArray(geminiResult.json) ? geminiResult.json : [];

  return aiMatches
    .filter((m: any) => m.index >= 0 && m.index < startups.length)
    .map((m: any) => ({
      id: startups[m.index]._id,
      name: startups[m.index].name,
      industry: startups[m.index].industry,
      stage: startups[m.index].stage,
      vision: startups[m.index].vision,
      score: Math.min(100, Math.max(0, m.score || 50)),
      explanation: m.explanation || 'Potential match based on profile analysis.',
      reasons: Array.isArray(m.reasons) ? m.reasons.slice(0, 3) : ['Profile alignment'],
    }))
    .slice(0, 5);
}

async function matchInvestorToStartups(user: any) {
  // Fetch startups with active funding rounds
  const fundingRounds = await FundingRound.find({ status: 'open' })
    .populate({
      path: 'startupId',
      select: 'name vision description industry stage fundingStage team founderId',
      populate: { path: 'founderId', select: 'name verificationLevel' },
    })
    .limit(20)
    .lean() as any[];

  const startupsWithFunding = fundingRounds
    .filter((r: any) => r.startupId)
    .map((r: any) => ({
      startup: r.startupId,
      round: {
        name: r.roundName,
        target: r.targetAmount,
        raised: r.raisedAmount,
        equity: r.equityOffered,
        valuation: r.valuation,
        minInvestment: r.minInvestment,
      },
    }));

  if (startupsWithFunding.length === 0) {
    // If no active funding rounds, fetch recent startups
    const recentStartups = await Startup.find({ status: { $ne: 'closed' } })
      .select('name vision description industry stage fundingStage team founderId')
      .populate('founderId', 'name verificationLevel')
      .limit(10)
      .lean() as any[];

    return recentStartups.map((s: any, i: number) => ({
      id: s._id,
      name: s.name,
      industry: s.industry,
      stage: s.stage,
      vision: s.vision,
      score: Math.max(30, 80 - i * 8),
      explanation: 'This startup is active on the platform and may be seeking investment.',
      reasons: ['Active startup', s.industry || 'Growing sector', `${s.team?.length || 0} team members`],
    }));
  }

  const systemPrompt = `You are an AI investment matching engine for AlloySphere.
Analyze the investor profile and available startups with active funding rounds.
Return a JSON array of the top 5 matches sorted by score (highest first).
Each match must have: index (number), score (0-100), explanation (1-2 sentences), reasons (array of 2-3 short strings).
Only return the JSON array, no other text.`;

  const investorProfile = {
    bio: user.bio || '',
    experience: user.experience || '',
    verificationLevel: user.verificationLevel || 0,
  };

  const startupSummaries = startupsWithFunding.map((item: any, i: number) => ({
    index: i,
    name: item.startup.name,
    industry: item.startup.industry,
    stage: item.startup.stage,
    vision: item.startup.vision?.substring(0, 150),
    teamSize: item.startup.team?.length || 0,
    founderVerified: item.startup.founderId?.verificationLevel || 0,
    fundingRound: item.round.name,
    targetAmount: item.round.target,
    raisedAmount: item.round.raised,
    equityOffered: item.round.equity,
    valuation: item.round.valuation,
    minInvestment: item.round.minInvestment,
  }));

  const userPrompt = `Investor Profile:
Bio: ${sanitizePromptInput(investorProfile.bio)}
Experience: ${sanitizePromptInput(investorProfile.experience)}
Verification Level: ${investorProfile.verificationLevel}

Startups with Active Funding Rounds:
${JSON.stringify(startupSummaries, null, 2)}

Find the best investment opportunities for this investor based on industry fit, valuation, team strength, and funding round attractiveness.`;

  const geminiResult = await callGemini({
    systemPrompt,
    userPrompt,
    maxOutputTokens: 1500,
    temperature: 0.5,
    jsonMode: true,
  });

  if (!geminiResult.success || !geminiResult.json) {
    return startupsWithFunding.slice(0, 5).map((item: any, i: number) => ({
      id: item.startup._id,
      name: item.startup.name,
      industry: item.startup.industry,
      stage: item.startup.stage,
      vision: item.startup.vision,
      score: Math.max(40, 90 - i * 10),
      explanation: 'Active funding round available for investment.',
      reasons: [`${item.round.name} round`, `$${item.round.target?.toLocaleString()} target`, item.startup.industry || 'Growing sector'],
      fundingRound: item.round,
    }));
  }

  const aiMatches = Array.isArray(geminiResult.json) ? geminiResult.json : [];

  return aiMatches
    .filter((m: any) => m.index >= 0 && m.index < startupsWithFunding.length)
    .map((m: any) => {
      const item = startupsWithFunding[m.index];
      return {
        id: item.startup._id,
        name: item.startup.name,
        industry: item.startup.industry,
        stage: item.startup.stage,
        vision: item.startup.vision,
        score: Math.min(100, Math.max(0, m.score || 50)),
        explanation: m.explanation || 'Potential investment opportunity.',
        reasons: Array.isArray(m.reasons) ? m.reasons.slice(0, 3) : ['Active funding'],
        fundingRound: item.round,
      };
    })
    .slice(0, 5);
}

function generateFallbackMatches(startups: any[], skills: string[]) {
  const skillSet = new Set(skills.map((s: string) => s.toLowerCase()));

  return startups
    .map((s: any) => {
      let score = 50;
      const reasons: string[] = [];

      // Industry keyword match
      if (s.industry && skillSet.has(s.industry.toLowerCase())) {
        score += 20;
        reasons.push(`Industry match: ${s.industry}`);
      }

      // Team size (smaller = more opportunity)
      if ((s.team?.length || 0) < 5) {
        score += 10;
        reasons.push('Small team — high impact potential');
      }

      // Verified founder bonus
      if (s.founderId?.verificationLevel >= 2) {
        score += 10;
        reasons.push('Verified founder');
      }

      if (reasons.length === 0) reasons.push('Active startup');

      return {
        id: s._id,
        name: s.name,
        industry: s.industry,
        stage: s.stage,
        vision: s.vision,
        score: Math.min(100, score),
        explanation: `Matched based on ${reasons.length} criteria.`,
        reasons,
      };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);
}
