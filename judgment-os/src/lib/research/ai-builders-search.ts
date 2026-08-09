import type {
  WebSearchHit,
  WebSearchProvider,
  WebSearchResponse,
  WebSearchResult,
} from "./types";

type TavilyQueryResponse = {
  queries?: Array<{
    keyword?: string;
    response?: {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };
  }>;
  combined_answer?: string | null;
  errors?: unknown;
};

/**
 * AI Builders Space search (Tavily under the hood).
 * POST /v1/search/ with Bearer AI_BUILDER_TOKEN.
 */
export class AiBuildersSearchProvider implements WebSearchProvider {
  readonly id = "ai-builders-tavily";

  constructor(
    private readonly opts: {
      apiKey: string;
      baseURL: string;
    },
  ) {}

  async search(
    keywords: string[],
    maxResults = 5,
  ): Promise<WebSearchResponse> {
    const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      throw new Error("搜索关键词不能为空。");
    }

    const base = this.opts.baseURL.replace(/\/$/, "");
    const url = `${base}/search/`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords: cleaned.slice(0, 3),
        max_results: Math.min(20, Math.max(1, maxResults)),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Web search failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as TavilyQueryResponse;
    const results: WebSearchResult[] = (data.queries ?? []).map((q) => {
      const hits: WebSearchHit[] = (q.response?.results ?? []).map((r) => ({
        title: (r.title ?? "").trim() || "(untitled)",
        url: (r.url ?? "").trim(),
        content: (r.content ?? "").trim(),
        score: typeof r.score === "number" ? r.score : undefined,
      }));
      return {
        keyword: (q.keyword ?? "").trim() || "(keyword)",
        hits,
      };
    });

    return {
      results,
      combinedAnswer: data.combined_answer ?? null,
      provider: this.id,
    };
  }
}
