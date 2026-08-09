import { OpenAiCompatibleProvider } from "./openai-compatible";
import type { LlmProvider } from "./types";

export type { LlmProvider } from "./types";

/**
 * Factory for the configured LLM provider.
 * Providers must remain replaceable — never hardcode a vendor in call sites.
 */
export function getLlmProvider(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER ?? "openai-compatible").trim();
  const apiKey =
    process.env.LLM_API_KEY?.trim() ||
    process.env.AI_BUILDER_TOKEN?.trim() ||
    "";
  const baseURL =
    process.env.LLM_BASE_URL?.trim() ||
    "https://space.ai-builders.com/backend/v1";
  const model = process.env.LLM_MODEL?.trim() || "grok-4-fast";

  if (!apiKey) {
    throw new Error(
      "未配置模型密钥。请设置 LLM_API_KEY 或 AI_BUILDER_TOKEN（本地用 .env.local；AI Builders 部署时会自动注入 AI_BUILDER_TOKEN）。",
    );
  }

  if (provider === "openai-compatible") {
    return new OpenAiCompatibleProvider({ apiKey, baseURL, model });
  }

  throw new Error(
    `未知的 LLM_PROVIDER「${provider}」。当前支持：openai-compatible`,
  );
}
