import OpenAI from "openai";
import type { LlmChatRequest, LlmChatResponse, LlmProvider } from "./types";

/**
 * OpenAI-compatible chat provider (AI Builders Space, OpenAI, etc.).
 * Swap baseURL / apiKey / model via env — JudgmentOS stays unbound.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly id = "openai-compatible";

  private client: OpenAI;
  private model: string;

  constructor(options: {
    apiKey: string;
    baseURL: string;
    model: string;
  }) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: request.temperature ?? 0.2,
      ...(request.json
        ? { response_format: { type: "json_object" as const } }
        : {}),
      messages: request.messages,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("模型返回了空响应。");
    }

    return {
      content,
      model: completion.model ?? this.model,
      provider: this.id,
    };
  }
}
