import { getLlmProvider } from "@/lib/llm";
import type {
  DecisionGateEvaluation,
  DecisionGateOption,
  GateRecommendation,
} from "./decision-gate-types";

const SYSTEM_PROMPT = `你是 JudgmentOS Decision Engine 中的 Decision Gate（决策关卡）顾问。

当前阶段：信念已更新。你必须判断：是否有足够信息采取下一步行动？

只能给出三种推荐之一：
- KEEP_RESEARCHING — 继续收集证据 / 做最小实验
- MAKE_PROVISIONAL_DECISION — 可做临时决定（可修订）
- READY_TO_FREEZE — 可冻结决定并承担后果

硬性原则（不可违反）：
- 禁止使用任意数值信心阈值（例如「信心>70就冻结」）。
- 禁止要求确定性；不确定性必须显式保留。
- 禁止替用户做最终决定；你只推荐并解释理由。
- 禁止隐藏 tradeoff、未知项或做错的代价。
- 不要把意见包装成事实。
- 所有面向用户的文本使用简体中文。

评估时必须显式回答这 7 个问题（写入对应字段）：
1. 该不确定性当前阻塞了什么决策？
2. 各可行选项目前各有哪些证据支持？
3. 还缺哪些重要证据？
4. 继续收集信息的预期价值是什么？（定性，非分数阈值）
5. 等待的代价是什么？
6. 该决策是否可逆，还是回撤代价很高？
7. 额外信息是否真的可能改变下一步行动？

只返回合法 JSON：
{
  "blockedDecision": "被阻塞的决策是什么",
  "recommendation": "KEEP_RESEARCHING|MAKE_PROVISIONAL_DECISION|READY_TO_FREEZE",
  "why": "为什么给出该推荐（引用上述判断，禁止数字阈值借口）",
  "options": [
    {
      "id": "opt_a",
      "label": "选项名",
      "description": "该选项含义",
      "bestEvidence": ["支持该选项的证据摘要1"]
    }
  ],
  "tradeoffs": ["关键权衡1"],
  "remainingUnknowns": ["仍未知1"],
  "costOfWaiting": "继续等待/调研的代价",
  "costOfBeingWrong": "选错的代价",
  "valueOfMoreInfo": "再收集信息的预期价值",
  "reversibility": "可逆性判断",
  "wouldInfoChangeAction": "额外信息是否可能改变下一步行动",
  "aiRecommendation": {
    "optionId": "opt_a 或 null（若 KEEP_RESEARCHING）",
    "label": "推荐选项标签或 null",
    "reasoning": "推荐理由（论据，不是命令）"
  }
}

若 KEEP_RESEARCHING：仍须列出当前可见选项与证据缺口；aiRecommendation.optionId 可为 null，但 reasoning 必须说明下一步最小信息行动。
至少给出 2 个有意义的选项（除非上下文确实只有一条路，也要写明「默认路径」与「推迟」）。`;

type LlmGateJson = {
  blockedDecision?: string;
  recommendation?: string;
  why?: string;
  options?: Array<{
    id?: string;
    label?: string;
    description?: string;
    bestEvidence?: string[];
  }>;
  tradeoffs?: string[];
  remainingUnknowns?: string[];
  costOfWaiting?: string;
  costOfBeingWrong?: string;
  valueOfMoreInfo?: string;
  reversibility?: string;
  wouldInfoChangeAction?: string;
  aiRecommendation?: {
    optionId?: string | null;
    label?: string | null;
    reasoning?: string;
  };
};

function parseJsonContent(content: string): LlmGateJson {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as LlmGateJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as LlmGateJson;
  }
}

function normalizeRecommendation(
  value: string | undefined,
): GateRecommendation {
  const upper = (value ?? "").toUpperCase().replace(/-/g, "_");
  if (upper === "KEEP_RESEARCHING") return "KEEP_RESEARCHING";
  if (
    upper === "MAKE_PROVISIONAL_DECISION" ||
    upper === "PROVISIONAL" ||
    upper === "MAKE_PROVISIONAL"
  ) {
    return "MAKE_PROVISIONAL_DECISION";
  }
  if (
    upper === "READY_TO_FREEZE" ||
    upper === "FREEZE" ||
    upper === "READY_TO_DECIDE"
  ) {
    return "READY_TO_FREEZE";
  }
  // Conservative default: do not invent readiness.
  return "KEEP_RESEARCHING";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export type EvaluateDecisionGateInput = {
  projectTitle: string;
  projectGoal: string;
  successCriteria: string;
  constraints: string;
  userDeadline: string | null;
  uncertaintyQuestion: string;
  uncertaintyConfidence: number;
  milestoneTitle: string;
  milestonePurpose: string;
  milestoneExpectedLearning: string;
  evidence: Array<{
    claim: string;
    type: string;
    source: string | null;
    confidence: number;
    userStatus: string;
  }>;
  beliefUpdates: Array<{
    evidenceClaim: string;
    evidenceType: string;
    supportsOrChallenges: string;
    beliefUpdate: string;
    remainingUnknowns: string[];
    suggestedConfidence: number;
    userReviewStatus: string;
  }>;
};

/**
 * Belief Update → Decision Gate.
 * Returns a recommendation only — never auto-commits the user's choice.
 */
export async function evaluateDecisionGate(
  input: EvaluateDecisionGateInput,
): Promise<DecisionGateEvaluation> {
  const llm = getLlmProvider();

  const evidenceText =
    input.evidence.length === 0
      ? "（尚无证据）"
      : input.evidence
          .map(
            (e, i) =>
              `${i + 1}. [${e.type}/${e.userStatus}] 信心=${e.confidence} 来源=${e.source || "无"}\n${e.claim}`,
          )
          .join("\n\n");

  const beliefText =
    input.beliefUpdates.length === 0
      ? "（尚无信念更新）"
      : input.beliefUpdates
          .map(
            (b, i) =>
              `${i + 1}. [${b.userReviewStatus}] 证据「${b.evidenceClaim}」类型=${b.evidenceType} 关系=${b.supportsOrChallenges} 建议信心=${b.suggestedConfidence}\n信念更新：${b.beliefUpdate}\n仍未知：${b.remainingUnknowns.join("；") || "—"}`,
          )
          .join("\n\n");

  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `项目：${input.projectTitle}
目标：${input.projectGoal}
成功标准：${input.successCriteria || "—"}
约束：${input.constraints || "—"}
用户截止日期：${input.userDeadline || "—"}

不确定性：
${input.uncertaintyQuestion}
当前信心（仅供上下文，禁止用作硬阈值）：${input.uncertaintyConfidence}

里程碑：${input.milestoneTitle}
目的：${input.milestonePurpose || "—"}
预期学习：${input.milestoneExpectedLearning || "—"}

证据：
${evidenceText}

信念更新历史：
${beliefText}

请运行 Decision Gate：回答 7 问，给出 KEEP_RESEARCHING / MAKE_PROVISIONAL_DECISION / READY_TO_FREEZE 之一，并解释 WHY。`,
      },
    ],
  });

  const parsed = parseJsonContent(response.content);
  const recommendation = normalizeRecommendation(parsed.recommendation);
  const why = (parsed.why ?? "").trim();
  if (!why) {
    throw new Error("模型未返回 Decision Gate 理由（why）。");
  }

  const options: DecisionGateOption[] = (parsed.options ?? [])
    .map((o, i) => {
      const label = (o.label ?? "").trim();
      if (!label) return null;
      return {
        id: (o.id ?? `opt_${i + 1}`).trim() || `opt_${i + 1}`,
        label,
        description: (o.description ?? "").trim(),
        bestEvidence: asStringList(o.bestEvidence),
      };
    })
    .filter((o): o is DecisionGateOption => o !== null);

  if (options.length === 0) {
    options.push(
      {
        id: "opt_proceed",
        label: "基于现有信息推进",
        description: "在承认未知的前提下选择一条前进路径。",
        bestEvidence: [],
      },
      {
        id: "opt_wait",
        label: "继续调研后再定",
        description: "先补关键证据，暂不锁定方向。",
        bestEvidence: [],
      },
    );
  }

  const remainingUnknowns = asStringList(parsed.remainingUnknowns);
  if (remainingUnknowns.length === 0) {
    remainingUnknowns.push("关键未知仍未显式消解；勿假装已确定。");
  }

  const tradeoffs = asStringList(parsed.tradeoffs);
  if (tradeoffs.length === 0) {
    tradeoffs.push("速度 vs 信息充分度；可逆性 vs 锁定成本。");
  }

  let optionId = parsed.aiRecommendation?.optionId ?? null;
  if (typeof optionId === "string") {
    optionId = optionId.trim() || null;
  }
  if (recommendation === "KEEP_RESEARCHING") {
    // Keep optional pointer, but allow null.
  } else if (optionId && !options.some((o) => o.id === optionId)) {
    optionId = options[0]?.id ?? null;
  } else if (!optionId) {
    optionId = options[0]?.id ?? null;
  }

  const optionLabel =
    (parsed.aiRecommendation?.label ?? "").trim() ||
    options.find((o) => o.id === optionId)?.label ||
    null;

  return {
    blockedDecision:
      (parsed.blockedDecision ?? "").trim() ||
      `与不确定性相关的下一步选择：${input.uncertaintyQuestion}`,
    recommendation,
    why,
    options,
    tradeoffs,
    remainingUnknowns,
    costOfWaiting:
      (parsed.costOfWaiting ?? "").trim() ||
      "等待可能消耗截止时间与机会窗口，但也可能避免过早锁定。",
    costOfBeingWrong:
      (parsed.costOfBeingWrong ?? "").trim() ||
      "选错可能需要回撤；具体代价取决于可逆性。",
    valueOfMoreInfo:
      (parsed.valueOfMoreInfo ?? "").trim() ||
      "更多信息应针对仍可能改变行动的关键未知。",
    reversibility:
      (parsed.reversibility ?? "").trim() ||
      "尚未充分评估可逆性；默认假设部分路径回撤成本较高。",
    wouldInfoChangeAction:
      (parsed.wouldInfoChangeAction ?? "").trim() ||
      "若额外信息不能改变下一步行动，则继续调研的价值有限。",
    aiRecommendation: {
      optionId,
      label: optionLabel,
      reasoning:
        (parsed.aiRecommendation?.reasoning ?? "").trim() ||
        why,
    },
  };
}
