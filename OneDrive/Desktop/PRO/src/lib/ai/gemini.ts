/**
 * Shared Gemini API Client
 * Provides reusable helpers for calling Google Gemini with structured output,
 * retry logic, and error handling.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** If true, attempt to parse the response as JSON */
  jsonMode?: boolean;
}

export interface GeminiResponse {
  success: boolean;
  text: string;
  /** Parsed JSON if jsonMode was true and parsing succeeded */
  json?: unknown;
  error?: string;
}

/**
 * Call Gemini API with retry logic (up to 2 retries on transient failures).
 */
export async function callGemini(options: GeminiRequestOptions): Promise<GeminiResponse> {
  const {
    systemPrompt,
    userPrompt,
    maxOutputTokens = 1024,
    temperature = 0.7,
    jsonMode = false,
  } = options;

  if (!GEMINI_API_KEY) {
    return { success: false, text: '', error: 'GEMINI_API_KEY not configured' };
  }

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens,
      temperature,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const maxRetries = 2;
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000), // 30s timeout
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        lastError = `Gemini API error ${response.status}: ${errorText}`;

        // Retry on 429 (rate limit) or 5xx (server errors)
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        return { success: false, text: '', error: lastError };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        return { success: false, text: '', error: 'Empty response from Gemini' };
      }

      const result: GeminiResponse = { success: true, text };

      if (jsonMode) {
        try {
          // Strip markdown code fences if present
          const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
          result.json = JSON.parse(cleaned);
        } catch {
          // Return raw text if JSON parsing fails
          result.error = 'JSON parsing failed, raw text returned';
        }
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return { success: false, text: '', error: lastError };
}

/**
 * Sanitize user input before sending to Gemini to prevent prompt injection.
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Remove potential system prompt overrides
  return input
    .replace(/\[SYSTEM\]/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<\/?system>/gi, '')
    .trim()
    .substring(0, 5000); // Hard limit
}
