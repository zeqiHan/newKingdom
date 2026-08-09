import { getLlmProvider } from "@/lib/llm";

export type DeadlineChangeAnalysis = {
  benefitsOfCompression: string[];
  costs: string[];
  milestonesAffected: string[];
  validationSacrificed: string[];
  expectedInformationLoss: string;
  decisionRisk: string;
  recommendedTimelineDisadvantages: string[];
  summary: string;
};

const SYSTEM_PROMPT = `你是 JudgmentOS 的时间引擎顾问。

用户正在调整项目截止日期。你必须同时考虑：
- 等待的代价（机会成本）
- 不确定性未消解的代价

禁止暗示「更长一定更好」。

硬性原则：
- 用户拥有最终截止日期。
- 暴露 tradeoff，不替用户决定。
- 所有面向用户的文本使用简体中文。

只返回合法 JSON：
{
  "benefitsOfCompression": ["压缩时间的收益"],
  "costs": ["压缩或改期的代价"],
  "milestonesAffected": ["可能受影响的里程碑"],
  "validationSacrificed": ["可能牺牲的验证"],
  "expectedInformationLoss": "预期信息损失说明",
  "decisionRisk": "决策风险说明",
  "recommendedTimelineDisadvantages": ["若坚持更长推荐时间线，其劣势"],
  "summary": "一段简短总述"
}`;

type LlmJson = Partial<DeadlineChangeAnalysis>;

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

export async function analyzeDeadlineChange(input: {
  projectTitle: string;
  projectGoal: string;
  previousUserDeadline: string | null;
  newUserDeadline: string | null;
  systemRecommendedDeadline: string | null;
  milestones: Array<{ title: string; deadline: string | null; status: string }>;
}): Promise<DeadlineChangeAnalysis> {
  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `项目：${input.projectTitle}
目标：${input.projectGoal}

原用户截止日期：${input.previousUserDeadline || "（无）"}
新用户截止日期：${input.newUserDeadline || "（清空）"}
系统建议截止日期：${input.systemRecommendedDeadline || "（无）"}

当前里程碑：
${
  input.milestones.length === 0
    ? "（无）"
    : input.milestones
        .map(
          (m, i) =>
            `${i + 1}. ${m.title} [${m.status}] 截止=${m.deadline || "—"}`,
        )
        .join("\n")
}

请分析此次截止日期变更的利弊。`,
      },
    ],
  });

  const parsed = parseJson(response.content);
  return {
    benefitsOfCompression: list(parsed.benefitsOfCompression),
    costs: list(parsed.costs),
    milestonesAffected: list(parsed.milestonesAffected),
    validationSacrificed: list(parsed.validationSacrificed),
    expectedInformationLoss:
      (parsed.expectedInformationLoss ?? "").trim() ||
      "时间压缩可能减少可收集的验证信息。",
    decisionRisk:
      (parsed.decisionRisk ?? "").trim() ||
      "在信息不足时行动会提高决策风险。",
    recommendedTimelineDisadvantages: list(
      parsed.recommendedTimelineDisadvantages,
    ),
    summary:
      (parsed.summary ?? "").trim() ||
      "截止日期已变更；请审视等待代价与不确定性代价。",
  };
}
