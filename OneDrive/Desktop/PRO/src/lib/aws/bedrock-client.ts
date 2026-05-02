/**
 * AWS Bedrock Client — AlloySphere AI Engine
 *
 * Centralized, reusable Bedrock Runtime client for Claude model invocations.
 * Designed for modularity: any API route or service can import and invoke
 * the Bedrock model without duplicating SDK setup.
 *
 * Authentication:
 *  - Primary: Bedrock API Key (Bearer token via AWS_BEARER_TOKEN_BEDROCK)
 *  - Fallback: IAM credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *
 * Supports:
 *  - Startup analysis
 *  - Investor insights
 *  - Recommendation engine
 *  - Any dynamic prompt from frontend
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  type InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { awsConfig } from './config';

// ─── Model Configuration ────────────────────────────────────────────
// Change this constant to switch models without touching business logic.
export const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-opus-20240229-v1:0';

// Default system prompt that forces structured JSON output.
export const DEFAULT_SYSTEM_PROMPT =
  'You are an AI API. Always return responses in valid JSON format.';

// Sensible defaults for inference parameters (low-latency optimized).
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.3; // lower = faster, more deterministic

// ─── Singleton Client ────────────────────────────────────────────────
// Reuse across Lambda / serverless warm starts for connection pooling.
let _client: BedrockRuntimeClient | null = null;

/**
 * Returns a configured BedrockRuntimeClient.
 *
 * Supports two auth modes:
 *  1. Bedrock API Key (Bearer token) — set AWS_BEARER_TOKEN_BEDROCK
 *  2. IAM credentials — set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *
 * The API key path uses a custom middleware to inject the Bearer token
 * header, which is what Bedrock expects for API-key-based auth.
 */
function getClient(): BedrockRuntimeClient {
  if (!_client) {
    const region = process.env.AWS_REGION || awsConfig.region;
    const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;

    if (bearerToken) {
      // ── Bedrock API Key auth (Bearer token) ──────────────────────
      // When using a Bedrock API key, we bypass SigV4 signing and
      // inject an Authorization: Bearer header via middleware.
      _client = new BedrockRuntimeClient({
        region,
        // Provide dummy credentials to satisfy the SDK's credential
        // resolver — the actual auth is done via the Bearer header.
        credentials: {
          accessKeyId: 'BEDROCK_API_KEY',
          secretAccessKey: 'BEDROCK_API_KEY',
        },
      });

      // Inject Bearer token into every outgoing request
      _client.middlewareStack.add(
        (next) => async (args) => {
          const request = args.request as { headers: Record<string, string> };
          request.headers['Authorization'] = `Bearer ${bearerToken}`;
          // Remove the SigV4 signature so it doesn't conflict
          delete request.headers['authorization'];
          request.headers['Authorization'] = `Bearer ${bearerToken}`;
          return next(args);
        },
        { step: 'finalizeRequest', name: 'bedrockApiKeyAuth', priority: 'high' },
      );
    } else {
      // ── IAM credentials auth (SigV4) ─────────────────────────────
      _client = new BedrockRuntimeClient({
        region,
        credentials: {
          accessKeyId: awsConfig.credentials.accessKeyId,
          secretAccessKey: awsConfig.credentials.secretAccessKey,
        },
      });
    }
  }
  return _client;
}

// ─── Types ───────────────────────────────────────────────────────────

export interface BedrockInvokeOptions {
  /** The user prompt to send to the model */
  prompt: string;
  /** Optional system prompt override (defaults to JSON-forcing prompt) */
  systemPrompt?: string;
  /** Maximum tokens for the response */
  maxTokens?: number;
  /** Temperature (0–1). Lower = more deterministic */
  temperature?: number;
  /** Model ID override for A/B testing or model migration */
  modelId?: string;
}

export interface BedrockResponse {
  /** Parsed response content from the model */
  content: unknown;
  /** Raw text returned by the model (before JSON parse) */
  rawText: string;
  /** Model ID that was invoked */
  model: string;
  /** Latency of the Bedrock API call in milliseconds */
  latencyMs: number;
  /** Token usage metadata when available */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

// ─── Core Invocation ─────────────────────────────────────────────────

/**
 * Invoke AWS Bedrock Claude model with the given prompt.
 *
 * @throws {Error} When authentication is not configured or invocation fails.
 */
export async function invokeBedrockModel(
  options: BedrockInvokeOptions,
): Promise<BedrockResponse> {
  const {
    prompt,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    modelId = BEDROCK_MODEL_ID,
  } = options;

  // Validate that at least one auth method is configured
  const hasBearerToken = !!process.env.AWS_BEARER_TOKEN_BEDROCK;
  const hasIamCredentials =
    !!awsConfig.credentials.accessKeyId && !!awsConfig.credentials.secretAccessKey;

  if (!hasBearerToken && !hasIamCredentials) {
    throw new Error(
      'AWS Bedrock auth not configured. Set AWS_BEARER_TOKEN_BEDROCK (API key) ' +
        'or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (IAM).',
    );
  }

  // Construct the Claude Messages API payload
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    system: systemPrompt,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user' as const,
        content: prompt,
      },
    ],
  };

  const input: InvokeModelCommandInput = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  };

  const startTime = Date.now();
  const client = getClient();
  const command = new InvokeModelCommand(input);
  const response = await client.send(command);
  const latencyMs = Date.now() - startTime;

  // Decode the response body (Uint8Array → string)
  const rawText = new TextDecoder().decode(response.body);

  // Safely parse the outer Bedrock response envelope
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Failed to parse Bedrock response JSON: ${rawText.slice(0, 200)}`);
  }

  // Extract the text content from Claude's Messages API response structure
  const contentBlocks = parsed.content as Array<{ type: string; text?: string }> | undefined;
  const textBlock = contentBlocks?.find((block) => block.type === 'text');
  const modelText = textBlock?.text ?? '';

  // Attempt to parse the model's text as JSON; fall back to raw string
  let content: unknown;
  try {
    content = JSON.parse(modelText);
  } catch {
    // Model didn't return valid JSON — return the raw text as-is
    content = modelText;
  }

  return {
    content,
    rawText: modelText,
    model: modelId,
    latencyMs,
    usage: {
      inputTokens: parsed.usage
        ? (parsed.usage as Record<string, number>).input_tokens
        : undefined,
      outputTokens: parsed.usage
        ? (parsed.usage as Record<string, number>).output_tokens
        : undefined,
    },
  };
}
