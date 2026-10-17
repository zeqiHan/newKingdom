import { randomUUID } from "crypto";
import { getLlmProvider } from "@/lib/llm";
import type { Locale } from "@/lib/i18n";
import type { GoalProposal, ProposedMilestone, ProposedUncertainty } from "./types";
import {
  asIsoDate,
  assignMilestoneDeadlines,
  defaultRecommendedDate,
} from "./milestone-deadlines";
import { withOutputLanguage } from "./output-language";

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
- 关键不确定性优先 3–6 个。里程碑正好 3 个，不要更多。质量重于数量。
- recommendedDeadline 必填，格式 YYYY-MM-DD。这是你建议三个学习里程碑能拿到现实证据的日期，不能留空。
- 每个里程碑必须带 deadline，格式 YYYY-MM-DD。
- 第一个里程碑必须能在三天内做完，并且按这个期限来设计：三天内拿到第一个真实成果。截止日期不晚于今天起第 3 天。不要把一个大阶段硬压进三天。
- 第 2、第 3 个里程碑的截止日期依次排在第一个之后，最后一个不晚于 recommendedDeadline。

只返回合法 JSON，结构如下：
{
  "title": "简短项目标题",
  "clarifiedGoal": "清晰目标（结果，不是实现计划）",
  "successCriteria": "如何知道目标已达成",
  "constraints": "已知约束，或空字符串",
  "recommendedDeadline": "YYYY-MM-DD",
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
      "expectedLearning": "我们期望获得什么信息/反馈",
      "deadline": "YYYY-MM-DD"
    }
  ]
}

uncertaintyIndex 是 keyUncertainties 的从 0 开始的下标。`;

type LlmGoalJson = {
  title?: string;
  clarifiedGoal?: string;
  successCriteria?: string;
  constraints?: string;
  recommendedDeadline?: string;
  keyUncertainties?: Array<{
    question?: string;
    importance?: number;
  }>;
  suggestedMilestones?: Array<{
    uncertaintyIndex?: number;
    title?: string;
    purpose?: string;
    expectedLearning?: string;
    deadline?: string;
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
  locale: Locale = "zh",
): Promise<GoalProposal> {
  const goal = rawGoal.trim();
  if (!goal) throw new Error("请填写原始目标。");

  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: withOutputLanguage(SYSTEM_PROMPT, locale) },
      {
        role: "user",
        content: withOutputLanguage(
          `今天是 ${new Date().toISOString().slice(0, 10)}。\n\n用户的自然语言原始目标：\n\n${goal}\n\nrecommendedDeadline 必须是 YYYY-MM-DD，不能留空。里程碑正好 3 个，每个都有 deadline。第一个里程碑的 deadline 不晚于今天起第 3 天，而且这件事本身要能在三天内做完并拿到第一个成果。后两个依次排在它后面，最后一个不晚于 recommendedDeadline。`,
          locale,
        ),
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
    if (suggestedMilestones.length >= 3) continue;
    suggestedMilestones.push({
      tempId: String(randomUUID()),
      uncertaintyTempId: uncertainty.tempId,
      title,
      purpose: (m.purpose ?? "").trim(),
      expectedLearning,
      deadline: asIsoDate(m.deadline) ?? "",
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

  const recommendedDeadline =
    asIsoDate(parsed.recommendedDeadline) ?? defaultRecommendedDate();
  const datedMilestones = withMilestoneDeadlines(
    suggestedMilestones,
    recommendedDeadline,
  );

  return {
    rawGoal: goal,
    title,
    clarifiedGoal,
    successCriteria: (parsed.successCriteria ?? "").trim(),
    constraints: (parsed.constraints ?? "").trim(),
    recommendedDeadline,
    keyUncertainties,
    suggestedMilestones: datedMilestones,
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
      deadline: m.deadline,
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

  const recommendedDeadline =
    asIsoDate(proposal.recommendedDeadline) ?? defaultRecommendedDate();

  return {
    rawGoal: proposal.rawGoal.trim(),
    title,
    clarifiedGoal,
    successCriteria: (proposal.successCriteria ?? "").trim(),
    constraints: (proposal.constraints ?? "").trim(),
    recommendedDeadline,
    keyUncertainties,
    suggestedMilestones: withMilestoneDeadlines(
      suggestedMilestones.slice(0, 3),
      recommendedDeadline,
    ),
  };
}

function withMilestoneDeadlines<T extends { deadline?: string }>(
  milestones: T[],
  recommendedDeadline: string,
): Array<T & { deadline: string }> {
  const dates = assignMilestoneDeadlines(
    milestones.map((m) => m.deadline),
    recommendedDeadline,
  );
  return milestones.map((m, index) => ({ ...m, deadline: dates[index] }));
}
