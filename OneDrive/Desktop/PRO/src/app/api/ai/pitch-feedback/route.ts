import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { Startup, FundingRound, Milestone } from '@/lib/models';
import { callGemini, sanitizePromptInput } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

/**
 * POST /api/ai/pitch-feedback
 * AI-powered pitch feedback for founders.
 * Analyzes startup data and provides investor-readiness feedback.
 * 
 * Body: { startupId: string, pitchText?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request, 'ai_pitch');
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 300000, maxRequests: 3, message: 'Pitch feedback rate limit reached.' });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, 'Pitch feedback rate limit reached.');
    }

    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { startupId, pitchText } = await request.json();

    if (!startupId) {
      return NextResponse.json({ error: 'startupId is required' }, { status: 400 });
    }

    await connectDB();

    const startup = await Startup.findById(startupId)
      .populate('founderId', 'name verificationLevel')
      .populate('team', 'name skills')
      .lean() as any;

    if (!startup) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 });
    }

    // Verify ownership
    const founderIdStr = startup.founderId?._id?.toString() || startup.founderId?.toString();
    if (founderIdStr !== authResult.user.userId) {
      return NextResponse.json({ error: 'You can only get pitch feedback for your own startup' }, { status: 403 });
    }

    // Gather additional data
    const [fundingRounds, milestones] = await Promise.all([
      FundingRound.find({ startupId }).select('roundName targetAmount raisedAmount status').lean() as any,
      Milestone.find({ startupId }).select('status title').lean() as any,
    ]);

    const startupData = {
      name: startup.name,
      vision: startup.vision,
      description: startup.description,
      industry: startup.industry,
      stage: startup.stage,
      fundingStage: startup.fundingStage,
      teamSize: startup.team?.length || 0,
      teamSkills: startup.team?.flatMap((t: any) => t.skills || [])?.slice(0, 10) || [],
      founderVerified: startup.founderId?.verificationLevel || 0,
      fundingRounds: fundingRounds.length,
      totalRaised: fundingRounds.reduce((sum: number, r: any) => sum + (r.raisedAmount || 0), 0),
      completedMilestones: milestones.filter((m: any) => m.status === 'completed').length,
      totalMilestones: milestones.length,
    };

    const systemPrompt = `You are an AI pitch coach on AlloySphere, an investor-facing startup platform.
Analyze the startup data and any pitch text provided, then give structured feedback.
Return JSON with:
{
  "investorReadinessScore": number (0-100),
  "strengths": [{ "area": string, "detail": string }],
  "weaknesses": [{ "area": string, "detail": string, "suggestion": string }],
  "pitchTips": [string],
  "investorQuestions": [string],
  "summary": string (2-3 sentences)
}
Be honest but constructive. Max 4 strengths, 4 weaknesses, 4 tips, 4 questions.`;

    const userPrompt = `Startup Data:
${JSON.stringify(startupData, null, 2)}
${pitchText ? `\nPitch Text:\n${sanitizePromptInput(pitchText)}` : ''}`;

    const geminiResult = await callGemini({
      systemPrompt,
      userPrompt,
      maxOutputTokens: 1500,
      temperature: 0.5,
      jsonMode: true,
    });

    if (geminiResult.success && geminiResult.json) {
      return NextResponse.json({ feedback: geminiResult.json });
    }

    // Fallback feedback
    const readinessScore = calculateReadinessScore(startupData);
    return NextResponse.json({
      feedback: {
        investorReadinessScore: readinessScore,
        strengths: [
          ...(startupData.teamSize > 2 ? [{ area: 'Team', detail: `${startupData.teamSize} team members show operational capability` }] : []),
          ...(startupData.completedMilestones > 0 ? [{ area: 'Execution', detail: `${startupData.completedMilestones} completed milestones demonstrate traction` }] : []),
          ...(startupData.vision ? [{ area: 'Vision', detail: 'Clear vision statement helps investors understand direction' }] : []),
        ],
        weaknesses: [
          ...(startupData.teamSize < 3 ? [{ area: 'Team', detail: 'Small team size', suggestion: 'Consider recruiting key technical or business roles' }] : []),
          ...(!startupData.description || startupData.description.length < 100 ? [{ area: 'Description', detail: 'Brief startup description', suggestion: 'Expand your description with market size, competitive advantage, and traction' }] : []),
          ...(startupData.totalRaised === 0 ? [{ area: 'Traction', detail: 'No funding raised yet', suggestion: 'Consider a small angel round or demonstrate revenue' }] : []),
        ],
        pitchTips: [
          'Lead with the problem you solve, not the technology',
          'Include specific metrics: users, revenue, growth rate',
          'Show a clear path to profitability',
          'End with a specific ask — how much funding and what milestones it unlocks',
        ],
        investorQuestions: [
          'What is your customer acquisition cost?',
          'Who are your main competitors and what differentiates you?',
          'What will you do with the funding in the next 12 months?',
        ],
        summary: `Your startup has a readiness score of ${readinessScore}/100. ${readinessScore > 60 ? 'You are showing good fundamentals. Focus on specific traction metrics.' : 'Consider strengthening your team and demonstrating initial traction before pitching investors.'}`,
      },
    });
  } catch (error) {
    console.error('Pitch Feedback Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateReadinessScore(data: any): number {
  let score = 20; // Base
  if (data.vision) score += 10;
  if (data.description && data.description.length > 100) score += 10;
  if (data.teamSize > 2) score += 15;
  if (data.teamSize > 5) score += 5;
  if (data.completedMilestones > 0) score += 15;
  if (data.totalRaised > 0) score += 15;
  if (data.founderVerified >= 2) score += 10;
  return Math.min(100, score);
}
