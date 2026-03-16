import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getSystemPrompt } from '@/lib/ai/system-prompts';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
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
            .select('role trustScore verificationLevel')
            .lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const systemPrompt = getSystemPrompt({
            role: (user as any).role || 'founder',
            trustScore: (user as any).trustScore,
            verificationLevel: (user as any).verificationLevel,
        });

        // Check for Gemini API key
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Fallback: generate contextual response without API
            const fallbackResponse = generateFallbackResponse(message, (user as any).role);
            return NextResponse.json({ response: fallbackResponse });
        }

        // Call Google Gemini API
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n\nUser message: ${message}` }],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                ],
            }),
        });

        if (!geminiResponse.ok) {
            console.error('Gemini API error:', geminiResponse.status, await geminiResponse.text().catch(() => ''));
            const fallbackResponse = generateFallbackResponse(message, (user as any).role);
            return NextResponse.json({ response: fallbackResponse });
        }

        const data = await geminiResponse.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';

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
        return 'Your trust score reflects your platform activity: verification level, completed milestones, signed agreements, and collaboration history. To improve it, complete your KYC verification and ensure all agreements are signed.';
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
            return 'Use the Search tab to find verified talent. Filter by skills, trust score, and verification level. Review their profiles and trust history before sending offers.';
        }
        if (lower.includes('funding') || lower.includes('invest')) {
            return 'Create funding rounds from the Funding tab. Verified investors (Level 3+) can discover and invest in your startup. Ensure your startup profile and financials are up to date.';
        }
        return 'I can help with hiring, milestones, agreements, funding, and trust score. What would you like to know about?';
    }

    if (role === 'investor') {
        if (lower.includes('startup') || lower.includes('deal')) {
            return 'Browse startups from the Deal Flow tab. Each startup shows founder verification level, trust score, and team composition. Use due diligence tools to request documents before investing.';
        }
        return 'I can help with deal flow, due diligence, portfolio tracking, risk assessment, and accreditation. What would you like to know about?';
    }

    if (role === 'talent') {
        if (lower.includes('job') || lower.includes('role') || lower.includes('work')) {
            return 'Use the Find Work tab to discover verified startup roles. Filter by industry, role type, and compensation. Check the founder\'s trust score before applying.';
        }
        return 'I can help with finding roles, milestone payments, skill verification, and trust score. What would you like to know about?';
    }

    return 'I can help with trust scores, agreements, milestones, verification, and platform navigation. What would you like to know about?';
}
