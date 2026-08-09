import { getLlmProvider } from "@/lib/llm";
import { getWebSearchProvider } from "@/lib/research";
import type { EvidenceType } from "@/lib/db/types";

export type ResearchClaim = {
  claim: string;
  sourceTitle: string;
  sourceUrl: string;
  evidenceType: EvidenceType;
  evidenceStrength: number;
  /** Explicit: this is what the source said, not proven truth. */
  sourceSaid: string;
  notes: string;
};

export type WebResearchBundle = {
  researchQuestion: string;
  keywords: string[];
  combinedAnswer: string | null;
  claims: ResearchClaim[];
  provider: string;
};

const KEYWORD_PROMPT = `你是 JudgmentOS 调研助手。给定研究问题，生成 1–3 个短搜索关键词（英文或中文均可）。
只返回 JSON：{ "keywords": ["..."] }
禁止无止境发散；关键词必须服务该不确定性。`;

const CLAIM_PROMPT = `你是 JudgmentOS Decision Engine 的外部证据提取顾问。

你拿到网页搜索结果。任务：提取少量与研究问题相关的「来源声称」，不是宣布真理。

硬性原则：
- SOURCE SAID X ≠ X IS TRUE
- 区分 FACT / ASSUMPTION / INFERENCE / OPINION
- 行为证据强于口头意向
- 最多提取 3 条最相关声称；宁缺毋滥
- 每条必须带 sourceUrl
- 所有面向用户的文本使用简体中文（claim/notes）；URL 保持原样

只返回合法 JSON：
{
  "claims": [
    {
      "claim": "可检查的陈述（我们如何理解该来源）",
      "sourceTitle": "来源标题",
      "sourceUrl": "https://...",
      "evidenceType": "FACT|ASSUMPTION|INFERENCE|OPINION",
      "evidenceStrength": 0-100,
      "sourceSaid": "来源原文要点（注明这是来源所说）",
      "notes": "为何强度如此；仍未知什么"
    }
  ]
}`;

function parseJson(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeType(value: string | undefined): EvidenceType {
  const u = (value ?? "ASSUMPTION").toUpperCase();
  if (
    u === "FACT" ||
    u === "ASSUMPTION" ||
    u === "INFERENCE" ||
    u === "OPINION"
  ) {
    return u;
  }
  return "ASSUMPTION";
}

/**
 * Research Question → Search → Claims (with source provenance).
 * Does not persist; caller creates Evidence + Belief Update.
 */
export async function runWebResearch(input: {
  researchQuestion: string;
  uncertaintyQuestion: string;
  milestoneTitle: string;
}): Promise<WebResearchBundle> {
  const question = input.researchQuestion.trim();
  if (!question) throw new Error("研究问题不能为空。");

  const llm = getLlmProvider();
  const keywordRes = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: KEYWORD_PROMPT },
      {
        role: "user",
        content: `不确定性：${input.uncertaintyQuestion}\n里程碑：${input.milestoneTitle}\n研究问题：${question}`,
      },
    ],
  });
  const keywordJson = parseJson(keywordRes.content);
  let keywords = Array.isArray(keywordJson.keywords)
    ? keywordJson.keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];
  if (keywords.length === 0) keywords = [question.slice(0, 80)];
  keywords = keywords.slice(0, 3);

  const search = getWebSearchProvider();
  const searchRes = await search.search(keywords, 5);

  const corpus = searchRes.results
    .map((r) => {
      const hits = r.hits
        .slice(0, 5)
        .map(
          (h, i) =>
            `[${i + 1}] ${h.title}\nURL: ${h.url}\n${h.content.slice(0, 500)}`,
        )
        .join("\n\n");
      return `关键词「${r.keyword}」:\n${hits || "（无结果）"}`;
    })
    .join("\n\n---\n\n");

  const claimRes = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: CLAIM_PROMPT },
      {
        role: "user",
        content: `研究问题：${question}
不确定性：${input.uncertaintyQuestion}
搜索摘要：${searchRes.combinedAnswer || "—"}

搜索结果：
${corpus || "（无）"}

请提取最多 3 条带来源的声称。记住：来源所说 ≠ 事实为真。`,
      },
    ],
  });

  const claimJson = parseJson(claimRes.content);
  const rawClaims = Array.isArray(claimJson.claims) ? claimJson.claims : [];
  const claims: ResearchClaim[] = rawClaims
    .slice(0, 3)
    .map((c) => {
      const row = c as Record<string, unknown>;
      const claim = String(row.claim ?? "").trim();
      const sourceUrl = String(row.sourceUrl ?? "").trim();
      if (!claim || !sourceUrl) return null;
      return {
        claim,
        sourceTitle: String(row.sourceTitle ?? "").trim() || sourceUrl,
        sourceUrl,
        evidenceType: normalizeType(
          typeof row.evidenceType === "string" ? row.evidenceType : undefined,
        ),
        evidenceStrength: Math.min(
          100,
          Math.max(0, Math.round(Number(row.evidenceStrength ?? 40))),
        ),
        sourceSaid:
          String(row.sourceSaid ?? "").trim() ||
          `来源声称：${claim}`,
        notes: String(row.notes ?? "").trim(),
      };
    })
    .filter((c): c is ResearchClaim => c !== null);

  return {
    researchQuestion: question,
    keywords,
    combinedAnswer: searchRes.combinedAnswer,
    claims,
    provider: searchRes.provider,
  };
}
