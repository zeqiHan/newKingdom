/**
 * Conversation Analysis Engine
 * 
 * Core principle: "如果使用过程像做作业一样，那么它就会没人使用。"
 * 
 * Users should just talk. AI extracts structure.
 */

import { randomUUID } from "crypto";
import { getLlmProvider } from "@/lib/llm";
import type { Locale } from "@/lib/i18n";
import type { Sacrifice, SacrificeCategory } from "../db/schema";
import { withOutputLanguage } from "./output-language";

function parseJsonContent(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

const ANALYSIS_SYSTEM_PROMPT = `You are a judgment advisor in JudgmentOS.

Users will describe their project in natural language - sometimes messy, sometimes brief, sometimes detailed.

Your job: Extract ALL the structure they need, even if they didn't explicitly say it.

Extract:
1. Goal (what they want to achieve)
2. Title (short, clear project name)
3. Success Criteria (how to know if succeeded)
4. Constraints (limitations: time, resources, skills, etc.)
5. Willing Sacrifices (exactly 3)
6. Key Uncertainties (3-5 critical unknowns)
7. Suggested Milestones (exactly 3, learning-focused)
8. recommendedDeadline (required YYYY-MM-DD)

Principles:
- Be concrete and specific, not vague
- Infer reasonable details from context
- Make uncertainties about real unknowns, not obvious tasks
- Make milestones about learning, not just doing
- Make sacrifices realistic, not catastrophic
- Every sacrifice states personal time (a quantity), the concrete experience lived through or given up, and the opportunity cost
- Never return more than 3 sacrifices or more than 3 milestones
- recommendedDeadline is always a real date. Never omit it.

Return structured JSON.`;

export type ConversationAnalysis = {
  title: string;
  goal: string;
  clarifiedGoal: string;
  successCriteria: string;
  constraints: string;
  willingSacrifices: Sacrifice[];
  keyUncertainties: Array<{
    tempId: string;
    question: string;
    importance: number;
  }>;
  suggestedMilestones: Array<{
    tempId: string;
    uncertaintyTempId: string;
    title: string;
    purpose: string;
    expectedLearning: string;
  }>;
  /** YYYY-MM-DD. Always set. */
  recommendedDeadline: string;
  /** YYYY-MM-DD when the user stated a date or duration; otherwise null. */
  userDeadline: string | null;
};

/**
 * Analyze user's natural language input and extract full project structure
 */
export async function analyzeConversationInput(
  userInput: string,
  locale: Locale = "zh",
): Promise<ConversationAnalysis> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `User said:

"${userInput}"

Today is ${today}.

Extract complete project structure from this. Be specific and concrete.

Return JSON in this exact format:
{
  "title": "Short project name (3-7 words)",
  "goal": "Clear statement of what user wants to achieve",
  "clarifiedGoal": "More detailed/clarified version if needed, or same as goal",
  "successCriteria": "Concrete ways to know if project succeeded",
  "constraints": "Time, resource, skill, or other limitations",
  "userDeadline": "YYYY-MM-DD if the user stated a date or a duration you can count from today, otherwise empty string",
  "recommendedDeadline": "YYYY-MM-DD, required. Your own suggestion for when the three learning milestones can produce real evidence. It may be later than the user's wished date. Never omit it.",
  "willingSacrifices": [
    {
      "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
      "description": "What is given up, including a time quantity",
      "impact": "Personal time + experience + opportunity cost"
    }
  ],
  "keyUncertainties": [
    {
      "question": "Critical unknown that could affect success",
      "importance": 0-100
    }
  ],
  "suggestedMilestones": [
    {
      "uncertaintyIndex": 0,
      "title": "Milestone name",
      "purpose": "Why this milestone exists",
      "expectedLearning": "What we'll learn from completing it"
    }
  ]
}

Counts: exactly 3 sacrifices, 3-5 uncertainties, exactly 3 milestones.
Each milestone links to an uncertainty by index (0, 1, or 2).

Every sacrifice must include all three:
- Personal time: hours per week, or total days, of the user's own time
- Experience: the concrete stretch of life they will live through or give up
- Opportunity cost: the specific thing they will no longer be able to do
A sacrifice that skips any of the three is invalid.`;

  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.4,
    messages: [
      { role: "system", content: withOutputLanguage(ANALYSIS_SYSTEM_PROMPT, locale) },
      { role: "user", content: withOutputLanguage(prompt, locale) },
    ],
  });

  const parsed = parseJsonContent(response.content) as {
    title?: string;
    goal?: string;
    clarifiedGoal?: string;
    successCriteria?: string;
    constraints?: string;
    willingSacrifices?: Array<{
      category?: string;
      description?: string;
      impact?: string;
    }>;
    keyUncertainties?: Array<{ question?: string; importance?: number }>;
    suggestedMilestones?: Array<{
      uncertaintyIndex?: number;
      title?: string;
      purpose?: string;
      expectedLearning?: string;
    }>;
    recommendedDeadline?: string;
    userDeadline?: string;
  };

  // Generate IDs and link structures
  const uncertainties = (parsed.keyUncertainties ?? []).map((u) => ({
    tempId: randomUUID(),
    question: (u.question ?? "").trim(),
    importance: u.importance || 70,
  })).filter((u) => u.question.length > 0);

  const milestones = (parsed.suggestedMilestones ?? []).map((m) => {
    const linkedUncertainty = uncertainties[m.uncertaintyIndex || 0] ?? uncertainties[0];
    return {
      tempId: randomUUID(),
      uncertaintyTempId: linkedUncertainty?.tempId ?? "",
      title: (m.title ?? "").trim(),
      purpose: (m.purpose ?? "").trim(),
      expectedLearning: (m.expectedLearning ?? "").trim(),
    };
  }).filter((m) => m.title.length > 0 && m.uncertaintyTempId.length > 0).slice(0, 3);

  const sacrifices: Sacrifice[] = (parsed.willingSacrifices ?? []).map((s) => ({
    id: randomUUID(),
    category: (s.category as SacrificeCategory) || "OTHER",
    description: (s.description ?? "").trim(),
    impact: (s.impact ?? "").trim(),
    aiGenerated: true,
    userModified: false,
  })).filter((s) => s.description.length > 0).slice(0, 3);

  return {
    title: (parsed.title ?? "").trim(),
    goal: (parsed.goal ?? "").trim(),
    clarifiedGoal: (parsed.clarifiedGoal ?? parsed.goal ?? "").trim(),
    successCriteria: (parsed.successCriteria ?? "").trim(),
    constraints: (parsed.constraints ?? "").trim(),
    willingSacrifices: sacrifices,
    keyUncertainties: uncertainties,
    suggestedMilestones: milestones,
    recommendedDeadline: asIsoDate(parsed.recommendedDeadline) ?? defaultRecommendedDate(),
    userDeadline: asIsoDate(parsed.userDeadline),
  };
}

function asIsoDate(value: unknown): string | null {
  const match = String(value ?? "").trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const time = Date.parse(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(time)) return null;
  return match[1];
}

function defaultRecommendedDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 21);
  return date.toISOString().slice(0, 10);
}

/**
 * Quick analysis for updates (milestone changes, uncertainty additions, etc.)
 */
export async function analyzeUpdate(
  userInput: string,
  context: {
    projectGoal: string;
    currentMilestones: string[];
    currentUncertainties: string[];
  },
  locale: Locale = "zh",
): Promise<{
  intent: "update_milestone" | "add_uncertainty" | "adjust_sacrifice" | "general";
  changes: any;
  reasoning: string;
}> {
  const prompt = `Current project context:
Goal: ${context.projectGoal}
Milestones: ${context.currentMilestones.join(", ")}
Uncertainties: ${context.currentUncertainties.join(", ")}

User said: "${userInput}"

What does the user want to do? Return JSON:
{
  "intent": "update_milestone|add_uncertainty|adjust_sacrifice|general",
  "changes": {
    // Specific changes based on intent
  },
  "reasoning": "Why you interpreted it this way"
}`;

  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.4,
    messages: [
      { role: "system", content: withOutputLanguage(ANALYSIS_SYSTEM_PROMPT, locale) },
      { role: "user", content: withOutputLanguage(prompt, locale) },
    ],
  });

  return parseJsonContent(response.content) as {
    intent: "update_milestone" | "add_uncertainty" | "adjust_sacrifice" | "general";
    changes: unknown;
    reasoning: string;
  };
}
