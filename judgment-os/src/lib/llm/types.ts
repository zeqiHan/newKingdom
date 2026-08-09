/**
 * Replaceable LLM provider boundary.
 * Decision Engine depends on this — never on a vendor SDK directly from UI.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmChatRequest = {
  messages: LlmMessage[];
  /** Hint for structured output; providers may ignore. */
  json?: boolean;
  temperature?: number;
};

export type LlmChatResponse = {
  content: string;
  model: string;
  provider: string;
};

export interface LlmProvider {
  readonly id: string;
  chat(request: LlmChatRequest): Promise<LlmChatResponse>;
}
