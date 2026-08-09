import { getLlmProvider } from "@/lib/llm";

export type FeedbackAnalysis = {
  difference: string;
  learning: string;
  assumptionsStrengthened: string[];
  assumptionsWeakened: string[];
  uncertaintiesReduced: string[];
  newUncertainties: string[];
  decisionImpact: "SUPPORTS" | "WEAKENS" | "INVALIDATES" | "NEUTRAL";
  suggestReopen: boolean;
  aiAnalysis: string;
  suggestedConfidenceAfter: number | null;
};

const SYSTEM_PROMPT = `你是 JudgmentOS Decision Engine 中的现实反馈分析顾问。

用户完成了一个实验/行动，并报告了预期与实际结果。你的工作是帮助解释现实教了我们什么。

硬性原则：
- 现实 > 推理。结果可以挑战用户与 AI 的先前信念。
- 口头兴趣弱于真实付款/真实行为。
- 禁止虚假确定性；保留未知。
- AI 分析；人可覆盖并决定是否重开决策。
- 所有面向用户的文本使用简体中文。

只返回合法 JSON：
{
  "difference": "预期与实际的关键差异",
  "learning": "学到了什么（判断层面，不是任务完成）",
  "assumptionsStrengthened": ["被加强的假设"],
  "assumptionsWeakened": ["被削弱的假设"],
  "uncertaintiesReduced": ["被降低的不确定性"],
  "newUncertainties": ["新引入的不确定性"],
  "decisionImpact": "SUPPORTS|WEAKENS|INVALIDATES|NEUTRAL",
  "suggestReopen": true或false,
  "aiAnalysis": "简要分析说明",
  "suggestedConfidenceAfter": 0-100或null
}`;

type LlmJson = {
  difference?: string;
  learning?: string;
  assumptionsStrengthened?: string[];
  assumptionsWeakened?: string[];
  uncertaintiesReduced?: string[];
  newUncertainties?: string[];
  decisionImpact?: string;
  suggestReopen?: boolean;
  aiAnalysis?: string;
  suggestedConfidenceAfter?: number | null;
};

function parseJson(content: string): LlmJson {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as LlmJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as LlmJson;
  }
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function impact(
  value: string | undefined,
): FeedbackAnalysis["decisionImpact"] {
  const u = (value ?? "NEUTRAL").toUpperCase();
  if (u === "SUPPORTS" || u === "WEAKENS" || u === "INVALIDATES") return u;
  return "NEUTRAL";
}

export type AnalyzeFeedbackInput = {
  uncertaintyQuestion: string;
  priorConfidence: number;
  decisionQuestion: string | null;
  selectedOptionLabel: string | null;
  experimentAction: string;
  hypothesis: string;
  expectedOutcome: string;
  actualOutcome: string;
};

export async function analyzeFeedback(
  input: AnalyzeFeedbackInput,
): Promise<FeedbackAnalysis> {
  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `不确定性：${input.uncertaintyQuestion}
先前信心（仅供上下文，禁止硬阈值）：${input.priorConfidence}

相关决策：${input.decisionQuestion || "—"}
已选方案：${input.selectedOptionLabel || "—"}

实验/行动：${input.experimentAction}
假设：${input.hypothesis || "—"}

预期结果：
${input.expectedOutcome}

实际结果：
${input.actualOutcome}

请分析现实反馈对信念与决策的影响。`,
      },
    ],
  });

  const parsed = parseJson(response.content);
  const difference = (parsed.difference ?? "").trim();
  const learning = (parsed.learning ?? "").trim();
  if (!difference || !learning) {
    throw new Error("模型未返回差异或学习说明。");
  }

  return {
    difference,
    learning,
    assumptionsStrengthened: list(parsed.assumptionsStrengthened),
    assumptionsWeakened: list(parsed.assumptionsWeakened),
    uncertaintiesReduced: list(parsed.uncertaintiesReduced),
    newUncertainties: list(parsed.newUncertainties),
    decisionImpact: impact(parsed.decisionImpact),
    suggestReopen: Boolean(parsed.suggestReopen),
    aiAnalysis:
      (parsed.aiAnalysis ?? "").trim() ||
      "现实结果已记录；请人工判断是否重开决策。",
    suggestedConfidenceAfter:
      parsed.suggestedConfidenceAfter == null
        ? null
        : Math.min(
            100,
            Math.max(0, Math.round(Number(parsed.suggestedConfidenceAfter))),
          ),
  };
}
