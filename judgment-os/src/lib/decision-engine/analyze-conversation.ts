/**
 * Conversation Analysis Engine
 * 
 * Core principle: "如果使用过程像做作业一样，那么它就会没人使用。"
 * 
 * Users should just talk. AI extracts structure.
 */

import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { GoalProposal } from "./types";
import type { Sacrifice, SacrificeCategory } from "../db/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ANALYSIS_SYSTEM_PROMPT = `You are a judgment advisor in JudgmentOS.

Users will describe their project in natural language - sometimes messy, sometimes brief, sometimes detailed.

Your job: Extract ALL the structure they need, even if they didn't explicitly say it.

Extract:
1. Goal (what they want to achieve)
2. Title (short, clear project name)
3. Success Criteria (how to know if succeeded)
4. Constraints (limitations: time, resources, skills, etc.)
5. Willing Sacrifices (3 realistic tradeoffs they must accept)
6. Key Uncertainties (3-5 critical unknowns)
7. Suggested Milestones (3-5 learning-focused milestones)

Principles:
- Be concrete and specific, not vague
- Infer reasonable details from context
- Make uncertainties about real unknowns, not obvious tasks
- Make milestones about learning, not just doing
- Make sacrifices realistic, not catastrophic

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
};

/**
 * Analyze user's natural language input and extract full project structure
 */
export async function analyzeConversationInput(
  userInput: string
): Promise<ConversationAnalysis> {
  const prompt = `User said:

"${userInput}"

Extract complete project structure from this. Be specific and concrete.

Return JSON in this exact format:
{
  "title": "Short project name (3-7 words)",
  "goal": "Clear statement of what user wants to achieve",
  "clarifiedGoal": "More detailed/clarified version if needed, or same as goal",
  "successCriteria": "Concrete ways to know if project succeeded",
  "constraints": "Time, resource, skill, or other limitations",
  "willingSacrifices": [
    {
      "category": "TIME|QUALITY|SCOPE|RESOURCE|RISK|OTHER",
      "description": "What will be sacrificed",
      "impact": "Concrete consequences"
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

Make 3 sacrifices, 3-5 uncertainties, and 3-5 milestones.
Each milestone should link to an uncertainty by index (0, 1, 2, etc).`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content);

  // Generate IDs and link structures
  const uncertainties = parsed.keyUncertainties.map((u: any) => ({
    tempId: randomUUID(),
    question: u.question,
    importance: u.importance || 70,
  }));

  const milestones = parsed.suggestedMilestones.map((m: any) => {
    const linkedUncertainty = uncertainties[m.uncertaintyIndex || 0];
    return {
      tempId: randomUUID(),
      uncertaintyTempId: linkedUncertainty?.tempId || uncertainties[0].tempId,
      title: m.title,
      purpose: m.purpose,
      expectedLearning: m.expectedLearning,
    };
  });

  const sacrifices: Sacrifice[] = parsed.willingSacrifices.map((s: any) => ({
    id: randomUUID(),
    category: s.category as SacrificeCategory,
    description: s.description,
    impact: s.impact,
    aiGenerated: true,
    userModified: false,
  }));

  return {
    title: parsed.title,
    goal: parsed.goal,
    clarifiedGoal: parsed.clarifiedGoal || parsed.goal,
    successCriteria: parsed.successCriteria,
    constraints: parsed.constraints,
    willingSacrifices: sacrifices,
    keyUncertainties: uncertainties,
    suggestedMilestones: milestones,
  };
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
  }
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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content);
}
