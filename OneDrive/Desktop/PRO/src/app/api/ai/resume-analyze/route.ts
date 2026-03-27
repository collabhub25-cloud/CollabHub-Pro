import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { callGemini, sanitizePromptInput } from '@/lib/ai/gemini';

export const runtime = 'nodejs';

/**
 * POST /api/ai/resume-analyze
 * AI-powered resume/profile analysis for talent users.
 * Analyzes skills, experience, and provides improvement suggestions.
 * 
 * Body (optional): { additionalContext?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request, 'ai_resume');
    const rateLimitResult = checkRateLimit(rateLimitKey, { windowMs: 300000, maxRequests: 3, message: 'Resume analysis rate limit reached.' });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, 'Resume analysis rate limit reached. Please try again in a few minutes.');
    }

    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json().catch(() => ({}));

    await connectDB();

    const user = await User.findById(authResult.user.userId)
      .select('name role skills experience bio location githubUrl linkedinUrl portfolioUrl verificationLevel')
      .lean() as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profileData = {
      name: user.name,
      role: user.role,
      skills: user.skills || [],
      experience: user.experience || '',
      bio: user.bio || '',
      location: user.location || '',
      hasGithub: !!user.githubUrl,
      hasLinkedIn: !!user.linkedinUrl,
      hasPortfolio: !!user.portfolioUrl,
      verificationLevel: user.verificationLevel || 0,
    };

    const systemPrompt = `You are an AI career advisor on AlloySphere, a startup collaboration platform.
Analyze the user's professional profile and provide actionable feedback.
Return JSON with:
{
  "overallScore": number (0-100),
  "strengths": [{ "area": string, "detail": string }],
  "improvements": [{ "area": string, "suggestion": string, "priority": "high"|"medium"|"low" }],
  "skillGaps": [string],
  "profileCompleteness": number (0-100),
  "summary": string (2-3 sentences)
}
Be specific and actionable. Max 4 strengths, 4 improvements, 5 skill gaps.`;

    const userPrompt = `Profile to analyze:
${JSON.stringify(profileData, null, 2)}
${body.additionalContext ? `\nAdditional context: ${sanitizePromptInput(body.additionalContext)}` : ''}`;

    const geminiResult = await callGemini({
      systemPrompt,
      userPrompt,
      maxOutputTokens: 1200,
      temperature: 0.5,
      jsonMode: true,
    });

    if (geminiResult.success && geminiResult.json) {
      return NextResponse.json({ analysis: geminiResult.json });
    }

    // Fallback analysis
    const completeness = calculateProfileCompleteness(profileData);
    return NextResponse.json({
      analysis: {
        overallScore: completeness,
        strengths: profileData.skills.length > 0
          ? [{ area: 'Skills', detail: `${profileData.skills.length} skills listed on profile` }]
          : [],
        improvements: [
          ...(!profileData.bio ? [{ area: 'Bio', suggestion: 'Add a professional bio to attract founders', priority: 'high' as const }] : []),
          ...(!profileData.hasGithub ? [{ area: 'GitHub', suggestion: 'Link your GitHub to showcase your work', priority: 'medium' as const }] : []),
          ...(!profileData.hasPortfolio ? [{ area: 'Portfolio', suggestion: 'Add a portfolio URL to stand out', priority: 'medium' as const }] : []),
          ...(profileData.skills.length < 3 ? [{ area: 'Skills', suggestion: 'Add more skills to improve matching accuracy', priority: 'high' as const }] : []),
        ],
        skillGaps: [],
        profileCompleteness: completeness,
        summary: `Your profile is ${completeness}% complete. ${completeness < 60 ? 'Adding more details will significantly improve your visibility to founders.' : 'Your profile has good coverage. Consider adding more specific skills.'}`,
      },
    });
  } catch (error) {
    console.error('Resume Analysis Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateProfileCompleteness(profile: any): number {
  let score = 0;
  const checks = [
    { check: !!profile.name, weight: 10 },
    { check: !!profile.bio, weight: 20 },
    { check: profile.skills.length > 0, weight: 20 },
    { check: !!profile.experience, weight: 15 },
    { check: !!profile.location, weight: 5 },
    { check: profile.hasGithub, weight: 10 },
    { check: profile.hasLinkedIn, weight: 10 },
    { check: profile.hasPortfolio, weight: 5 },
    { check: profile.verificationLevel >= 1, weight: 5 },
  ];
  for (const c of checks) {
    if (c.check) score += c.weight;
  }
  return score;
}
