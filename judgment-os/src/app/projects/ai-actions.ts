"use server";

import {
  proposeGoalFromRaw,
  validateGoalProposal,
  type GoalProposal,
} from "@/lib/decision-engine";
import { createProjectFromProposal } from "@/lib/db/queries";

export type ProposeGoalResult =
  | { ok: true; proposal: GoalProposal }
  | { ok: false; error: string };

export async function proposeGoalAction(
  rawGoal: string,
): Promise<ProposeGoalResult> {
  try {
    const proposal = await proposeGoalFromRaw(rawGoal);
    return { ok: true, proposal };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "分析目标失败。";
    return { ok: false, error: message };
  }
}

export type ConfirmProposalResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function confirmGoalProposalAction(
  proposal: GoalProposal,
): Promise<ConfirmProposalResult> {
  try {
    const validated = validateGoalProposal(proposal);
    const project = await createProjectFromProposal({
      title: validated.title,
      clarified_goal: validated.clarifiedGoal,
      success_criteria: validated.successCriteria,
      constraints: validated.constraints,
      uncertainties: validated.keyUncertainties.map((u) => ({
        temp_id: u.tempId,
        question: u.question,
        importance: u.importance,
      })),
      milestones: validated.suggestedMilestones.map((m) => ({
        uncertainty_temp_id: m.uncertaintyTempId,
        title: m.title,
        purpose: m.purpose,
        expected_learning: m.expectedLearning,
      })),
    });
    return { ok: true, projectId: project.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "保存提案失败。";
    return { ok: false, error: message };
  }
}
