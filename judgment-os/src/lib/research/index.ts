import { AiBuildersSearchProvider } from "./ai-builders-search";
import type { WebSearchProvider } from "./types";

export type { WebSearchProvider, WebSearchResponse, WebSearchHit } from "./types";

/**
 * Factory for the configured web search provider.
 * Keep replaceable — do not call Tavily/vendor APIs from UI.
 */
export function getWebSearchProvider(): WebSearchProvider {
  const provider = (process.env.WEB_SEARCH_PROVIDER ?? "ai-builders").trim();
  const apiKey =
    process.env.LLM_API_KEY?.trim() ||
    process.env.AI_BUILDER_TOKEN?.trim() ||
    "";
  const baseURL =
    process.env.WEB_SEARCH_BASE_URL?.trim() ||
    process.env.LLM_BASE_URL?.trim() ||
    "https://space.ai-builders.com/backend/v1";

  if (!apiKey) {
    throw new Error(
      "未配置搜索密钥。请设置 LLM_API_KEY 或 AI_BUILDER_TOKEN。",
    );
  }

  if (provider === "ai-builders") {
    return new AiBuildersSearchProvider({ apiKey, baseURL });
  }

  throw new Error(
    `未知的 WEB_SEARCH_PROVIDER「${provider}」。当前支持：ai-builders`,
  );
}
