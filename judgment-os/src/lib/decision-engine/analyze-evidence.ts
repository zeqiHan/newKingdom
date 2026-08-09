import { getLlmProvider } from "@/lib/llm";
import type {
  BeliefUpdateAnalysis,
  BeliefUpdatePrior,
  SupportsOrChallenges,
} from "./belief-update-types";

const SYSTEM_PROMPT = `你是 JudgmentOS Decision Engine 中的信念更新顾问。

用户刚为某个不确定性添加了一条证据。你的工作不是替用户做决定，而是分析：这条证据实际改变了什么信念。

硬性原则：
- Source ≠ Fact。来源声称某事，不等于它就是事实。
- 区分观察（observation）与推断（inference）。
- 口头意向弱于观察到的行为。
- 「愿意付费的说法」弱于「已经付费的行为」。
- 证据应更新信念，但不应自动消解不确定性。
- 禁止制造虚假确定性。必须明确写出仍然未知的部分。
- AI 提出解释；人可以质疑与修正。
- 所有面向用户的文本使用简体中文。

只返回合法 JSON：
{
  "evidenceType": "FACT|ASSUMPTION|INFERENCE|OPINION",
  "evidenceStrength": 0-100,
  "supportsOrChallenges": "SUPPORTS|CHALLENGES|MIXED|NEUTRAL",
  "beliefUpdate": "这条证据如何改变了对该不确定性的信念（不是最终结论）",
  "remainingUnknowns": ["仍然未知的点1", "点2"],
  "recommendedNextExperiment": "下一步最小现实实验（学习行动，不是任务清单）",
  "suggestedConfidence": 0-100
}

evidenceStrength：证据本身有多强（行为观察通常高于口头声明）。
suggestedConfidence：对该不确定性问题当前总体信心的建议值（可相对 priorConfidence 小幅调整，勿跳跃到接近 100）。`;

type LlmBeliefJson = {
  evidenceType?: string;
  evidenceStrength?: number;
  supportsOrChallenges?: string;
  beliefUpdate?: string;
  remainingUnknowns?: string[];
  recommendedNextExperiment?: string;
  suggestedConfidence?: number;
};

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseJsonContent(content: string): LlmBeliefJson {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as LlmBeliefJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as LlmBeliefJson;
  }
}

function normalizeType(
  value: string | undefined,
  fallback: string,
): BeliefUpdateAnalysis["evidenceType"] {
  const allowed = ["FACT", "ASSUMPTION", "INFERENCE", "OPINION"] as const;
  const upper = (value ?? fallback).toUpperCase();
  if ((allowed as readonly string[]).includes(upper)) {
    return upper as BeliefUpdateAnalysis["evidenceType"];
  }
  return "ASSUMPTION";
}

function normalizeSupport(
  value: string | undefined,
): SupportsOrChallenges {
  const allowed = ["SUPPORTS", "CHALLENGES", "MIXED", "NEUTRAL"] as const;
  const upper = (value ?? "NEUTRAL").toUpperCase();
  if ((allowed as readonly string[]).includes(upper)) {
    return upper as SupportsOrChallenges;
  }
  return "NEUTRAL";
}

export type AnalyzeEvidenceInput = {
  uncertaintyQuestion: string;
  priorConfidence: number;
  milestoneTitle: string;
  milestoneExpectedLearning: string;
  newEvidence: {
    claim: string;
    userDeclaredType: string;
    source: string | null;
    userConfidence: number;
  };
  priorBeliefUpdates: BeliefUpdatePrior[];
};

/**
 * GATHER EVIDENCE → UPDATE BELIEFS (proposal only until human reviews).
 * Uses prior belief updates on the same uncertainty for cumulative context.
 */
export async function analyzeEvidenceBeliefUpdate(
  input: AnalyzeEvidenceInput,
): Promise<BeliefUpdateAnalysis> {
  const llm = getLlmProvider();

  const priorText =
    input.priorBeliefUpdates.length === 0
      ? "（尚无历史信念更新）"
      : input.priorBeliefUpdates
          .map(
            (p, i) =>
              `${i + 1}. [${p.userReviewStatus}] 证据「${p.evidenceClaim}」类型=${p.evidenceType} 关系=${p.supportsOrChallenges} 信心→${p.suggestedConfidence}\n信念更新：${p.beliefUpdate}\n仍未知：${p.remainingUnknowns.join("；") || "—"}${p.userCorrection ? `\n用户修正：${p.userCorrection}` : ""}`,
          )
          .join("\n\n");

  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `不确定性问题：
${input.uncertaintyQuestion}

当前信心（priorConfidence）：${input.priorConfidence}

所属里程碑：${input.milestoneTitle}
预期学习：${input.milestoneExpectedLearning || "—"}

历史信念更新（同一不确定性，按时间）：
${priorText}

新证据（用户录入）：
- 陈述：${input.newEvidence.claim}
- 用户标注类型：${input.newEvidence.userDeclaredType}
- 来源：${input.newEvidence.source || "（无）"}
- 用户给该陈述的信心：${input.newEvidence.userConfidence}

请分析这条新证据对信念的影响。记住：来源不等于事实；勿制造虚假确定性。`,
      },
    ],
  });

  const parsed = parseJsonContent(response.content);
  const beliefUpdate = (parsed.beliefUpdate ?? "").trim();
  if (!beliefUpdate) {
    throw new Error("模型未返回信念更新说明。");
  }

  const remainingUnknowns = (parsed.remainingUnknowns ?? [])
    .map((u) => String(u).trim())
    .filter(Boolean);

  if (remainingUnknowns.length === 0) {
    remainingUnknowns.push("该不确定性尚未被充分消解；仍需更多现实反馈。");
  }

  return {
    evidenceType: normalizeType(
      parsed.evidenceType,
      input.newEvidence.userDeclaredType,
    ),
    evidenceStrength: clampInt(Number(parsed.evidenceStrength ?? 40), 0, 100),
    supportsOrChallenges: normalizeSupport(parsed.supportsOrChallenges),
    beliefUpdate,
    remainingUnknowns,
    recommendedNextExperiment: (
      parsed.recommendedNextExperiment ?? ""
    ).trim() || "设计一个能在现实中检验关键假设的最小实验。",
    suggestedConfidence: clampInt(
      Number(parsed.suggestedConfidence ?? input.priorConfidence),
      0,
      100,
    ),
  };
}
