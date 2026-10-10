import "server-only";
import type { Category, Job, Result } from "../../shared/contracts.ts";
import { outputSchemaFor, SYSTEM_PROMPT } from "../assessment-output.ts";
import { failure, success } from "../results.ts";

export interface AssessmentInput { cvText: string; preferences: Category[]; job: Pick<Job, "title" | "company" | "location" | "category" | "description" | "status" | "sourceType"> }
export interface OpenRouterConfig { apiKey: string; modelId: string }
export function openRouterConfig(): OpenRouterConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const modelId = process.env.OPENROUTER_MODEL?.trim();
  return apiKey && modelId && modelId.length <= 200 ? { apiKey, modelId } : null;
}
// Transport injection is only for isolated tests. The app always uses the real fetch endpoint.
export async function requestAssessment(input: AssessmentInput, config: OpenRouterConfig, fetcher: typeof fetch = fetch, timeoutMs = 20000): Promise<Result<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", signal: controller.signal, cache: "no-store",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "X-OpenRouter-Title": "Hireland" },
      body: JSON.stringify({ model: config.modelId, stream: false, temperature: 0, max_tokens: 1800,
        provider: { require_parameters: true, allow_fallbacks: false },
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(input) }],
        response_format: { type: "json_schema", json_schema: { name: "hireland_assessment", strict: true, schema: outputSchemaFor(input.cvText, input.job.description) } },
      }),
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: "OpenRouter rejected the model or structured output configuration. Check the server configuration.",
        401: "OpenRouter authentication failed. Check the server API key.",
        402: "OpenRouter credits are unavailable. Check your account balance.",
        403: "OpenRouter denied this request. Check account and model access.",
        429: "OpenRouter is rate limiting requests. Wait before trying once more.",
      };
      return failure("PROVIDER_ERROR", messages[response.status] ?? "OpenRouter is currently unavailable. No assessment was saved.", response.status === 429 || response.status >= 500);
    }
    // Bound body size; the timeout also covers reading the body, not just response headers.
    const reader = response.body?.getReader();
    if (!reader) return failure("INVALID_OUTPUT", "OpenRouter returned an empty response. No assessment was saved.", true);
    let body = ""; let bytes = 0; const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 65536) { await reader.cancel(); return failure("INVALID_OUTPUT", "OpenRouter returned an oversized response. No assessment was saved.", true); }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
    const envelope = JSON.parse(body);
    const choice = envelope?.choices?.[0];
    if (envelope?.error || choice?.error || choice?.finish_reason === "error") return failure("PROVIDER_ERROR", "The AI provider did not complete the request. No assessment was saved.", true);
    if (choice?.finish_reason !== "stop" || choice?.message?.refusal || typeof choice?.message?.content !== "string") return failure("INVALID_OUTPUT", "The AI response was incomplete or refused. No assessment was saved.", true);
    return success(JSON.parse(choice.message.content));
  } catch (error) {
    if (controller.signal.aborted) return failure("PROVIDER_TIMEOUT", "OpenRouter did not finish within 20 seconds. No assessment was saved.", true);
    if (error instanceof SyntaxError) return failure("INVALID_OUTPUT", "OpenRouter returned invalid JSON. No assessment was saved.", true);
    return failure("PROVIDER_ERROR", "We couldn't reach OpenRouter. Check the connection and try once more.", true);
  } finally { clearTimeout(timer); }
}
