import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Subscription, Startup, Payment } from '@/lib/models';
import { callGemini, sanitizePromptInput } from '@/lib/ai/gemini';
import { verifyAccessToken, extractTokenFromCookies } from '@/lib/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('ai:market-report');

const REPORT_SYSTEM_PROMPT = `You are an expert market analyst for the AlloySphere startup platform.
Generate a comprehensive market validation report for the given startup.
Return a JSON object with these fields:
{
  "marketSize": { "tam": string, "sam": string, "som": string, "growth": string },
  "competitors": [{ "name": string, "description": string, "strengths": string[], "weaknesses": string[] }],
  "validationScore": number (0-100),
  "validationRationale": string,
  "opportunities": string[],
  "risks": string[],
  "recommendations": string[],
  "executiveSummary": string
}
All monetary values should be in INR (₹). Be specific and data-driven.`;

/**
 * POST /api/ai/market-report
 * Generate an AI market validation report for a startup.
 * Requires: active subscription OR one-time payment.
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromCookies(request);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (payload.role !== 'founder') {
      return NextResponse.json({ error: 'Only founders can generate market reports' }, { status: 403 });
    }

    await connectDB();

    // Check access: paid subscription OR one-time ai_report payment
    const subscription = await Subscription.findOne({
      userId: payload.userId,
      status: 'active',
      plan: { $in: ['pro_founder', 'scale_founder', 'enterprise_founder'] },
    });

    if (!subscription) {
      // Check for one-time payment
      const aiPayment = await Payment.findOne({
        fromUserId: payload.userId,
        purpose: 'ai_report',
        status: 'completed',
      });

      if (!aiPayment) {
        return NextResponse.json({
          error: 'AI reports require a Startup Boost subscription or one-time purchase',
          requiredAction: 'upgrade',
        }, { status: 403 });
      }
    }

    // Get startup details
    const startup = await Startup.findOne({ founderId: payload.userId })
      .populate('founderId', 'name')
      .lean() as any;

    if (!startup) {
      return NextResponse.json({ error: 'No startup found for your account' }, { status: 404 });
    }

    // Generate report using Gemini
    const userPrompt = sanitizePromptInput(
      `Generate a market validation report for this startup:
Name: ${startup.name}
Industry: ${startup.industry}
Stage: ${startup.stage}
Funding Stage: ${startup.fundingStage}
Description: ${startup.description}
Vision: ${startup.vision}
Skills Needed: ${(startup.skillsNeeded || []).join(', ')}
Team Size: ${(startup.team || []).length}
Revenue: ₹${startup.revenue || 0}
Location: India`
    );

    const result = await callGemini({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      userPrompt,
      maxOutputTokens: 4096,
      temperature: 0.4,
      jsonMode: true,
    });

    if (!result.success) {
      log.error(`Gemini report generation failed: ${result.error}`);
      return NextResponse.json({ error: 'Failed to generate market report' }, { status: 500 });
    }

    const report = result.json || {};

    log.info(`Market report generated for startup=${startup._id}, user=${payload.userId}`);

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString(),
      startup: {
        name: startup.name,
        industry: startup.industry,
        stage: startup.stage,
      },
    });
  } catch (error) {
    log.error('Market report generation error', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
