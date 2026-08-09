import { getLlmProvider } from "@/lib/llm";

export type PlanChangeType =
  | "ADD_MILESTONE"
  | "REMOVE_MILESTONE"
  | "MODIFY_MILESTONE"
  | "ADD_UNCERTAINTY"
  | "CLOSE_UNCERTAINTY"
  | "REOPEN_DECISION";

export type ProposedPlanChange = {
  type: PlanChangeType;
  /** Existing milestone/uncertainty/decision id when relevant */
  targetId: string | null;
  title: string;
  detail: string;
};

export type ReplanProposal = {
  whatChanged: string;
  whyNotOptimal: string;
  proposedChanges: ProposedPlanChange[];
  expectedBenefit: string;
  tradeoffRisk: string;
  newUnknown: string;
};

const SYSTEM_PROMPT = `你是 JudgmentOS Decision Engine 的动态重规划顾问。

有新证据、反馈、期限变化或决策结果后，评估当前计划是否仍最优。

硬性原则：
- AI 只提案，绝不静默改写计划。
- 说明 WHAT CHANGED / WHY / PROPOSED CHANGE / BENEFIT / TRADEOFF。
- 里程碑必须绑定不确定性与学习，禁止变成 TODO 清单。
- 所有面向用户的文本使用简体中文。

只返回合法 JSON：
{
  "whatChanged": "...",
  "whyNotOptimal": "...",
  "proposedChanges": [
    {
      "type": "ADD_MILESTONE|REMOVE_MILESTONE|MODIFY_MILESTONE|ADD_UNCERTAINTY|CLOSE_UNCERTAINTY|REOPEN_DECISION",
      "targetId": "已有实体 id 或 null",
      "title": "短标题",
      "detail": "具体改动说明"
    }
  ],
  "expectedBenefit": "...",
  "tradeoffRisk": "...",
  "newUnknown": "..."
}

若当前计划仍然合理，proposedChanges 可以为空数组，并在 whyNotOptimal 中说明「暂不建议改计划」。`;

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

const CHANGE_TYPES: PlanChangeType[] = [
  "ADD_MILESTONE",
  "REMOVE_MILESTONE",
  "MODIFY_MILESTONE",
  "ADD_UNCERTAINTY",
  "CLOSE_UNCERTAINTY",
  "REOPEN_DECISION",
];

function normalizeType(value: string | undefined): PlanChangeType | null {
  const u = (value ?? "").toUpperCase() as PlanChangeType;
  return CHANGE_TYPES.includes(u) ? u : null;
}

export async function proposeReplan(input: {
  projectTitle: string;
  projectGoal: string;
  userDeadline: string | null;
  uncertainties: Array<{ id: string; question: string; status: string }>;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    expectedLearning: string;
  }>;
  recentFeedbackLearning: string | null;
  triggerNote: string;
}): Promise<ReplanProposal> {
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
用户截止日期：${input.userDeadline || "—"}

触发原因：${input.triggerNote}
最近学习：${input.recentFeedbackLearning || "—"}

不确定性：
${input.uncertainties.map((u) => `- [${u.id}] (${u.status}) ${u.question}`).join("\n") || "（无）"}

里程碑：
${
  input.milestones
    .map(
      (m) =>
        `- [${m.id}] (${m.status}) ${m.title} / 预期学习：${m.expectedLearning || "—"}`,
    )
    .join("\n") || "（无）"
}

请提案是否以及如何重规划。不要静默执行。`,
      },
    ],
  });

  const parsed = parseJson(response.content);
  const raw = Array.isArray(parsed.proposedChanges)
    ? parsed.proposedChanges
    : [];
  const proposedChanges: ProposedPlanChange[] = raw
    .map((c) => {
      const row = c as Record<string, unknown>;
      const type = normalizeType(
        typeof row.type === "string" ? row.type : undefined,
      );
      if (!type) return null;
      return {
        type,
        targetId: row.targetId ? String(row.targetId) : null,
        title: String(row.title ?? "").trim() || type,
        detail: String(row.detail ?? "").trim(),
      };
    })
    .filter((c): c is ProposedPlanChange => c !== null);

  return {
    whatChanged:
      String(parsed.whatChanged ?? "").trim() || input.triggerNote,
    whyNotOptimal:
      String(parsed.whyNotOptimal ?? "").trim() ||
      "需要人工判断当前计划是否仍最优。",
    proposedChanges,
    expectedBenefit: String(parsed.expectedBenefit ?? "").trim() || "—",
    tradeoffRisk: String(parsed.tradeoffRisk ?? "").trim() || "—",
    newUnknown: String(parsed.newUnknown ?? "").trim() || "—",
  };
}
