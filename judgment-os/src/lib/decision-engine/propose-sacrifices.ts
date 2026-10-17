/**
 * Sacrifice Proposal Engine
 * 
 * Core principle: You must sacrifice something to gain something.
 * 
 * This module generates sacrifice declarations at two levels:
 * 1. Project level - what you're willing to sacrifice from the start
 * 2. Action level - what this specific action will require you to sacrifice
 */

import { randomUUID } from "crypto";
import { getLlmProvider } from "@/lib/llm";
import type { Locale } from "@/lib/i18n";
import type { Sacrifice, SacrificeCategory } from "../db/schema";
import { withOutputLanguage } from "./output-language";

const CATEGORIES: SacrificeCategory[] = [
  "TIME",
  "QUALITY",
  "SCOPE",
  "RESOURCE",
  "RISK",
  "OTHER",
];

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (!match) throw new Error("模型未返回合法 JSON。");
    return JSON.parse(match[0]);
  }
}

function asCategory(value: unknown): SacrificeCategory {
  return CATEGORIES.includes(value as SacrificeCategory)
    ? (value as SacrificeCategory)
    : "OTHER";
}

async function requestSacrifices(prompt: string, locale: Locale): Promise<Sacrifice[]> {
  const llm = getLlmProvider();
  const response = await llm.chat({
    json: true,
    temperature: 0.4,
    messages: [
      { role: "system", content: withOutputLanguage(SACRIFICE_SYSTEM_PROMPT, locale) },
      { role: "user", content: withOutputLanguage(prompt, locale) },
    ],
  });

  const parsed = parseJsonContent(response.content) as {
    sacrifices?: unknown;
  } | unknown[];
  const sacrificesArray = Array.isArray(parsed)
    ? parsed
    : (parsed.sacrifices ?? parsed);

  if (!Array.isArray(sacrificesArray) || sacrificesArray.length === 0) {
    throw new Error("模型未返回可用的牺牲声明。");
  }

  const sacrifices = sacrificesArray.slice(0, 3).map((s) => {
    const item = s as { category?: string; description?: string; impact?: string };
    return {
      id: randomUUID(),
      category: asCategory(item.category),
      description: (item.description ?? "").trim(),
      impact: (item.impact ?? "").trim(),
      aiGenerated: true,
      userModified: false,
    };
  }).filter((s) => s.description.length > 0);

  if (sacrifices.length === 0) {
    throw new Error("模型未返回可用的牺牲声明。");
  }
  return sacrifices;
}

export type ProposeProjectSacrificesInput = {
  goal: string;
  successCriteria: string;
  constraints: string;
  userDeadline?: string;
  recommendedDeadline?: string;
};

export type ProposeActionSacrificesInput = {
  projectGoal: string;
  projectSacrifices: Sacrifice[];
  actionText: string;
  hypothesis: string;
  expectedOutcome: string;
  deadline?: string;
};

const SACRIFICE_SYSTEM_PROMPT = `You are a judgment advisor in JudgmentOS - a system that builds judgment, not just decisions.

Your role is to help users understand what they must sacrifice to achieve their goals.

Core principles:
- Every gain requires a sacrifice
- Tradeoffs must be made explicit, never hidden
- AI advises but never decides for the user
- Clearly distinguish fact from inference from opinion

When proposing sacrifices:
1. Be specific and concrete - not vague or abstract
2. Return exactly 3 sacrifices. Never more.
3. Categories: TIME, QUALITY, SCOPE, RESOURCE, RISK, OTHER
4. Every sacrifice must state all three:
   - Personal time: hours per week, or total days, of the user's own time
   - Experience: the concrete stretch of life they will live through or give up
   - Opportunity cost: the specific thing they will no longer be able to do
5. A sacrifice that skips any of the three is invalid

Remember: Your job is to expose reality, not to sugarcoat it.`;

/**
 * Generate 3 sacrifice options for a project at creation time
 */
export async function proposeProjectSacrifices(
  input: ProposeProjectSacrificesInput,
  locale: Locale = "zh",
): Promise<Sacrifice[]> {
  const { goal, successCriteria, constraints, userDeadline, recommendedDeadline } = input;

  const timeContext = userDeadline
    ? `User deadline: ${userDeadline}${recommendedDeadline ? ` (recommended: ${recommendedDeadline})` : ""}`
    : "No specific deadline set";

  const prompt = `A user is starting a project with these parameters:

GOAL: ${goal}

SUCCESS CRITERIA: ${successCriteria}

CONSTRAINTS: ${constraints}

TIME: ${timeContext}

Generate exactly 3 sacrifice options that the user must choose from to pursue this goal.

Each sacrifice should:
- Be a real, concrete tradeoff (not abstract or vague)
- Cover different categories when possible
- Be realistic - not all catastrophic, not all trivial
- State personal time as a quantity, the experience lived through or given up, and the opportunity cost

Return JSON with exactly 3 sacrifices in this format:
{
  "sacrifices": [
    {
      "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
      "description": "What is given up, with the time quantity",
      "impact": "Personal time, experience, and opportunity cost, each stated"
    }
  ]
}

Think about common project tradeoffs:
- Rushing means lower quality or technical debt
- High quality means longer timeline or more resources
- Tight budget means reduced scope or features
- Reduced risk means slower progress or more research
- Broader scope means less depth or longer timeline

Return only the JSON object.`;

  return requestSacrifices(prompt, locale);
}

/**
 * Generate 3 sacrifice options for a specific action/experiment
 */
export async function proposeActionSacrifices(
  input: ProposeActionSacrificesInput,
  locale: Locale = "zh",
): Promise<Sacrifice[]> {
  const {
    projectGoal,
    projectSacrifices,
    actionText,
    hypothesis,
    expectedOutcome,
    deadline,
  } = input;

  const projectSacrificesText = projectSacrifices.length > 0
    ? projectSacrifices.map(s => `- ${s.category}: ${s.description}`).join("\n")
    : "No project-level sacrifices declared yet";

  const prompt = `A user is planning an action within their project.

PROJECT GOAL: ${projectGoal}

PROJECT-LEVEL SACRIFICES ALREADY ACCEPTED:
${projectSacrificesText}

PLANNED ACTION: ${actionText}

HYPOTHESIS: ${hypothesis}

EXPECTED OUTCOME: ${expectedOutcome}

${deadline ? `DEADLINE: ${deadline}` : "No specific deadline"}

Generate exactly 3 sacrifice options that THIS SPECIFIC ACTION will require.

These should be:
- Specific to THIS action (not repeating project-level sacrifices)
- Real consequences of taking this action now
- Different from each other in nature
- Exactly 3
- Each one states personal time as a quantity, the experience lived through or given up, and the opportunity cost

Think about:
- What resources will this action consume?
- What opportunities will be closed off?
- What risks will be taken on?
- What quality/speed tradeoffs are implicit?
- What won't get done because of this action?

Return JSON with exactly 3 sacrifices in this format:
{
  "sacrifices": [
    {
      "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
      "description": "What will be sacrificed by taking this action",
      "impact": "The concrete effect this will have"
    }
  ]
}

Return only the JSON object.`;

  return requestSacrifices(prompt, locale);
}
