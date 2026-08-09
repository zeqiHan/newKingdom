/**
 * Replaceable web search / research provider boundary.
 * Decision Engine depends on this — not on a vendor SDK from UI.
 */

export type WebSearchHit = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type WebSearchResult = {
  keyword: string;
  hits: WebSearchHit[];
};

export type WebSearchResponse = {
  results: WebSearchResult[];
  combinedAnswer: string | null;
  provider: string;
};

export interface WebSearchProvider {
  readonly id: string;
  search(keywords: string[], maxResults?: number): Promise<WebSearchResponse>;
}
