/**
 * AlloySphere — AI API Route
 * POST /api/ai
 *
 * Unified AI endpoint powered by AWS Bedrock (Claude Opus).
 * Accepts dynamic prompts from the frontend and returns structured JSON.
 *
 * Supports multiple AlloySphere use-cases via a single, flexible interface:
 *  • Startup analysis   – "Analyze this startup's market fit…"
 *  • Investor insights   – "Evaluate this investor profile…"
 *  • Recommendations     – "Suggest startups matching these criteria…"
 *  • General Q&A         – Any free-form prompt
 *
 * Security:
 *  - No hardcoded secrets (env vars only)
 *  - Input validation with size limits
 *  - Vercel-compatible (Edge-optional, Node runtime by default)
 *
 * @module api/ai
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  invokeBedrockModel,
  DEFAULT_SYSTEM_PROMPT,
  type BedrockInvokeOptions,
} from '@/lib/aws/bedrock-client';

// ─── Configuration ───────────────────────────────────────────────────

/** Maximum allowed prompt length (characters) to prevent abuse */
const MAX_PROMPT_LENGTH = 8_000;

/** Optional: force Node.js runtime for Vercel (Bedrock SDK needs Node) */
export const runtime = 'nodejs';

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestStart = Date.now();

  try {
    // ── 1. Parse & validate request body ─────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { prompt, systemPrompt, maxTokens, temperature, modelId } = body as {
      prompt?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      modelId?: string;
    };

    // Prompt is the only required field
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "prompt" field (string required)' },
        { status: 400 },
      );
    }

    // Guard against excessively long prompts
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    // ── 2. Build invocation options ──────────────────────────────────
    const options: BedrockInvokeOptions = {
      prompt,
      systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : DEFAULT_SYSTEM_PROMPT,
      maxTokens: typeof maxTokens === 'number' ? maxTokens : undefined,
      temperature: typeof temperature === 'number' ? temperature : undefined,
      modelId: typeof modelId === 'string' ? modelId : undefined,
    };

    // ── 3. Invoke AWS Bedrock ────────────────────────────────────────
    console.info('[AI] Invoking Bedrock model', {
      promptLength: prompt.length,
      model: options.modelId ?? 'default',
    });

    const result = await invokeBedrockModel(options);

    console.info('[AI] Bedrock response received', {
      latencyMs: result.latencyMs,
      model: result.model,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // ── 4. Return structured JSON response ───────────────────────────
    const response = NextResponse.json(
      {
        success: true,
        data: result.content,
        meta: {
          model: result.model,
          latencyMs: result.latencyMs,
          usage: result.usage,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 },
    );

    // Performance header for observability
    response.headers.set('X-Response-Time', `${Date.now() - requestStart}ms`);
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    // ── 5. Error handling ────────────────────────────────────────────
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isConfigError = message.includes('AWS credentials');

    console.error('[AI] Bedrock invocation failed', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'production' && !isConfigError
          ? 'AI service temporarily unavailable'
          : message,
      },
      {
        status: isConfigError ? 503 : 500,
      },
    );
  }
}
