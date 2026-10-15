/**
 * Sacrifice Proposal Engine
 * 
 * Core principle: You must sacrifice something to gain something.
 * 
 * This module generates sacrifice declarations at two levels:
 * 1. Project level - what you're willing to sacrifice from the start
 * 2. Action level - what this specific action will require you to sacrifice
 */

import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { Sacrifice, SacrificeCategory } from "../db/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
2. Explain the real impact - what will actually be affected
3. Present 3 realistic options - not all doom or all trivial
4. Categories: TIME, QUALITY, SCOPE, RESOURCE, RISK, OTHER
5. Make users face the real cost of their choices

Remember: Your job is to expose reality, not to sugarcoat it.`;

/**
 * Generate 3 sacrifice options for a project at creation time
 */
export async function proposeProjectSacrifices(
  input: ProposeProjectSacrificesInput
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
- Explain the specific impact it will have
- Cover different categories when possible
- Be realistic - not all catastrophic, not all trivial

Return ONLY a JSON array of 3 sacrifices in this format:
[
  {
    "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
    "description": "What will be sacrificed (specific and clear)",
    "impact": "The real consequence of making this sacrifice (concrete effects)"
  }
]

Think about common project tradeoffs:
- Rushing means lower quality or technical debt
- High quality means longer timeline or more resources
- Tight budget means reduced scope or features
- Reduced risk means slower progress or more research
- Broader scope means less depth or longer timeline

Return only the JSON array, no other text.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SACRIFICE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  const sacrificesArray = parsed.sacrifices || parsed;

  if (!Array.isArray(sacrificesArray) || sacrificesArray.length !== 3) {
    throw new Error("Invalid sacrifice proposal format");
  }

  return sacrificesArray.map((s: any) => ({
    id: randomUUID(),
    category: s.category as SacrificeCategory,
    description: s.description,
    impact: s.impact,
    aiGenerated: true,
    userModified: false,
  }));
}

/**
 * Generate 3 sacrifice options for a specific action/experiment
 */
export async function proposeActionSacrifices(
  input: ProposeActionSacrificesInput
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
- Concrete and measurable when possible

Think about:
- What resources will this action consume?
- What opportunities will be closed off?
- What risks will be taken on?
- What quality/speed tradeoffs are implicit?
- What won't get done because of this action?

Return ONLY a JSON array of 3 sacrifices in this format:
[
  {
    "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
    "description": "What will be sacrificed by taking this action",
    "impact": "The concrete effect this will have"
  }
]

Return only the JSON array, no other text.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SACRIFICE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  const sacrificesArray = parsed.sacrifices || parsed;

  if (!Array.isArray(sacrificesArray) || sacrificesArray.length !== 3) {
    throw new Error("Invalid sacrifice proposal format");
  }

  return sacrificesArray.map((s: any) => ({
    id: randomUUID(),
    category: s.category as SacrificeCategory,
    description: s.description,
    impact: s.impact,
    aiGenerated: true,
    userModified: false,
  }));
}
