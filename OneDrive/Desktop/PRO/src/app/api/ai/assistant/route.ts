import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getRateLimitKey, rateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getSystemPrompt } from '@/lib/ai/system-prompts';

export const runtime = 'nodejs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

export async function POST(request: NextRequest) {
    try {
        const rateLimitKey = getRateLimitKey(request, 'ai_assistant');
        const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.ai_assistant);

        if (!rateLimitResult.allowed) {
            return rateLimitResponse(rateLimitResult.resetTime, RATE_LIMITS.ai_assistant.message);
        }

        const authResult = await requireAuth(request);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { message } = await request.json();

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(authResult.user.userId)
            .select('role verificationLevel')
            .lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const systemPrompt = getSystemPrompt({
            role: (user as any).role || 'founder',

            verificationLevel: (user as any).verificationLevel,
        });

        if (!GEMINI_API_KEY) {
            // Fallback: generate contextual response without API
            const fallbackResponse = generateFallbackResponse(message, (user as any).role);
            return NextResponse.json({ response: fallbackResponse });
        }

        // Call Google Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPrompt }],
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: message }],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 600,
                        temperature: 0.7,
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            console.error('Gemini API error:', geminiResponse.status, await geminiResponse.text().catch(() => ''));
            const fallbackResponse = generateFallbackResponse(message, (user as any).role);
            return NextResponse.json({ response: fallbackResponse });
        }

        const data = await geminiResponse.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
            || 'I could not generate a response. Please try again.';

        return NextResponse.json({ response: reply });
    } catch (error) {
        console.error('AI Assistant Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Generates contextual fallback responses when no AI API key is configured.
 */
function generateFallbackResponse(message: string, role: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('trust') || lower.includes('score')) {
        return 'Your platform standing reflects your activity: verification level, completed milestones, signed agreements, and collaboration history. To improve it, complete your KYC verification and ensure all agreements are signed.';
    }

    if (lower.includes('agreement') || lower.includes('contract')) {
        return 'You can create and manage agreements from the Agreements tab. Each agreement includes digital signing with an immutable audit trail. Make sure all active collaborations have signed agreements for legal protection.';
    }

    if (lower.includes('milestone') || lower.includes('payment')) {
        return 'Milestones are tracked in the Milestones tab. Payments are released per milestone completion. Both parties can view payment status and history.';
    }

    if (lower.includes('verification') || lower.includes('kyc')) {
        return 'Complete your verification from the KYC tab. Level 1 requires email verification. Level 2 requires identity documents. Level 3 requires full accreditation (required for investors to invest).';
    }

    if (role === 'founder') {
        if (lower.includes('hire') || lower.includes('talent')) {
            return 'Use the Search tab to find verified talent. Filter by skills and verification level. Review their profiles before sending offers.';
        }
        if (lower.includes('funding') || lower.includes('invest')) {
            return 'Create funding rounds from the Funding tab. Verified investors (Level 3+) can discover and invest in your startup. Ensure your startup profile and financials are up to date.';
        }
        return 'I can help with hiring, milestones, agreements, funding, and verification. What would you like to know about?';
    }

    if (role === 'investor') {
        if (lower.includes('startup') || lower.includes('deal')) {
            return 'Browse startups from the Deal Flow tab. Each startup shows founder verification level and team composition. Use due diligence tools to request documents before investing.';
        }
        return 'I can help with deal flow, due diligence, portfolio tracking, risk assessment, and accreditation. What would you like to know about?';
    }

    if (role === 'talent') {
        if (lower.includes('job') || lower.includes('role') || lower.includes('work')) {
            return 'Use the Find Work tab to discover verified startup roles. Filter by industry, role type, and compensation. Check the founder\'s verification level before applying.';
        }
        return 'I can help with finding roles, milestone payments, skill verification, and platform navigation. What would you like to know about?';
    }

    return 'I can help with agreements, milestones, verification, and platform navigation. What would you like to know about?';
}
