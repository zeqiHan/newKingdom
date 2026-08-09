import { randomUUID } from "crypto";
import { getLlmProvider } from "@/lib/llm";
import type { GoalProposal, ProposedMilestone, ProposedUncertainty } from "./types";

const SYSTEM_PROMPT = `你是 JudgmentOS 中的 Decision Engine 顾问。

你的工作不是规划任务或实现步骤。
你的工作是帮助用户澄清目标、暴露关键不确定性，并提出「只为减少不确定性并产生学习」的里程碑。

硬性规则：
- Goal ≠ Plan。「做一个 Next.js App」是计划，不是目标。请澄清真实结果。
- 里程碑不是待办、功能清单或工程步骤。
- 里程碑是学习机制：每一个都必须减少某个具体不确定性。
- 每个建议里程碑必须绑定恰好一个不确定性。
- 每个建议里程碑必须包含 expectedLearning（现实将教给我们什么）。
- AI 提出建议，人做决定。不要假装你有不存在的确定性。
- 不要编造事实。把未知表述为问题。
- 关键不确定性与里程碑各优先 3–6 个。质量重于数量。
- 所有面向用户的文本字段必须使用简体中文。

只返回合法 JSON，结构如下：
{
  "title": "简短项目标题",
  "clarifiedGoal": "清晰目标（结果，不是实现计划）",
  "successCriteria": "如何知道目标已达成",
  "constraints": "已知约束，或空字符串",
  "keyUncertainties": [
    {
      "question": "我们关键地不知道什么",
      "importance": 0-100
    }
  ],
  "suggestedMilestones": [
    {
      "uncertaintyIndex": 0,
      "title": "作为现实中学习行动的里程碑",
      "purpose": "它减少哪个不确定性以及为什么",
      "expectedLearning": "我们期望获得什么信息/反馈"
    }
  ]
}

uncertaintyIndex 是 keyUncertainties 的从 0 开始的下标。`;

type LlmGoalJson = {
  title?: string;
  clarifiedGoal?: string;
  successCriteria?: string;
  constraints?: string;
  keyUncertainties?: Array<{
    question?: string;
    importance?: number;
  }>;
  suggestedMilestones?: Array<{
    uncertaintyIndex?: number;
    title?: string;
    purpose?: string;
    expectedLearning?: string;
  }>;
};

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseJsonContent(content: string): LlmGoalJson {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as LlmGoalJson;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as LlmGoalJson;
  }
}

/**
 * GOAL → UNDERSTAND → MAP UNCERTAINTIES → GENERATE MILESTONES
 * Returns a proposal for human review. Does not persist.
 */
export async function proposeGoalFromRaw(
  rawGoal: string,
): Promise<GoalProposal> {
  const goal = rawGoal.trim();
  if (!goal) throw new Error("请填写原始目标。");

  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `用户的自然语言原始目标：\n\n${goal}`,
      },
    ],
  });

  const parsed = parseJsonContent(response.content);

  const keyUncertainties: ProposedUncertainty[] = (parsed.keyUncertainties ?? [])
    .map((u) => ({
      tempId: String(randomUUID()),
      question: (u.question ?? "").trim(),
      importance: clampInt(Number(u.importance ?? 50), 0, 100),
    }))
    .filter((u) => u.question.length > 0);

  if (keyUncertainties.length === 0) {
    throw new Error("模型未返回可用的不确定性。");
  }

  const suggestedMilestones: ProposedMilestone[] = [];
  for (const m of parsed.suggestedMilestones ?? []) {
    const index = Number(m.uncertaintyIndex ?? 0);
    const uncertainty = keyUncertainties[index];
    if (!uncertainty) continue;
    const title = (m.title ?? "").trim();
    const expectedLearning = (m.expectedLearning ?? "").trim();
    if (!title || !expectedLearning) continue;
    suggestedMilestones.push({
      tempId: String(randomUUID()),
      uncertaintyTempId: uncertainty.tempId,
      title,
      purpose: (m.purpose ?? "").trim(),
      expectedLearning,
    });
  }

  if (suggestedMilestones.length === 0) {
    throw new Error(
      "模型未返回绑定不确定性且含预期学习的里程碑。",
    );
  }

  const clarifiedGoal =
    (parsed.clarifiedGoal ?? "").trim() || goal;
  const title =
    (parsed.title ?? "").trim() ||
    clarifiedGoal.slice(0, 80) ||
    "未命名项目";

  return {
    rawGoal: goal,
    title,
    clarifiedGoal,
    successCriteria: (parsed.successCriteria ?? "").trim(),
    constraints: (parsed.constraints ?? "").trim(),
    keyUncertainties,
    suggestedMilestones,
  };
}

/**
 * Validate a human-edited proposal before persistence.
 * Enforces Milestone Rule: every milestone needs uncertainty + expectedLearning.
 */
export function validateGoalProposal(proposal: GoalProposal): GoalProposal {
  const title = proposal.title.trim();
  const clarifiedGoal = proposal.clarifiedGoal.trim();
  if (!title) throw new Error("标题不能为空。");
  if (!clarifiedGoal) throw new Error("澄清后的目标不能为空。");

  const keyUncertainties = proposal.keyUncertainties
    .map((u) => ({
      ...u,
      tempId: u.tempId || String(randomUUID()),
      question: u.question.trim(),
      importance: clampInt(Number(u.importance ?? 50), 0, 100),
    }))
    .filter((u) => u.question.length > 0);

  if (keyUncertainties.length === 0) {
    throw new Error("至少需要一条不确定性。");
  }

  const uncertaintyIds = new Set(keyUncertainties.map((u) => u.tempId));

  const suggestedMilestones = proposal.suggestedMilestones
    .map((m) => ({
      ...m,
      tempId: m.tempId || String(randomUUID()),
      title: m.title.trim(),
      purpose: (m.purpose ?? "").trim(),
      expectedLearning: (m.expectedLearning ?? "").trim(),
      uncertaintyTempId: m.uncertaintyTempId,
    }))
    .filter((m) => m.title && m.expectedLearning);

  for (const m of suggestedMilestones) {
    if (!uncertaintyIds.has(m.uncertaintyTempId)) {
      throw new Error(
        `里程碑「${m.title}」必须绑定到已有的不确定性。`,
      );
    }
  }

  if (suggestedMilestones.length === 0) {
    throw new Error("至少需要一个含预期学习的里程碑。");
  }

  return {
    rawGoal: proposal.rawGoal.trim(),
    title,
    clarifiedGoal,
    successCriteria: (proposal.successCriteria ?? "").trim(),
    constraints: (proposal.constraints ?? "").trim(),
    keyUncertainties,
    suggestedMilestones,
  };
}
