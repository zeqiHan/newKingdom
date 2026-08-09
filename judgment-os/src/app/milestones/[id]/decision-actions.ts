"use server";

import { redirect } from "next/navigation";
import { evaluateDecisionGate } from "@/lib/decision-engine";
import {
  confirmDecisionChoice,
  getDecision,
  getEvidence,
  getMilestoneWorkspace,
  recordJudgmentEvent,
  reopenDecision,
  saveDecisionFromGate,
  updateMilestoneStatus,
} from "@/lib/db/queries";

export type RunDecisionGateResult =
  | { ok: true; decisionId: string }
  | { ok: false; error: string };

export async function runDecisionGateAction(
  milestoneId: string,
): Promise<RunDecisionGateResult> {
  try {
    const workspace = await getMilestoneWorkspace(milestoneId);
    if (!workspace) return { ok: false, error: "里程碑不存在。" };
    const { milestone, project, uncertainty, evidence, beliefUpdatesByEvidenceId, decisions } =
      workspace;

    if (!uncertainty) {
      return {
        ok: false,
        error: "未关联不确定性，无法运行 Decision Gate。",
      };
    }

    const active = decisions.find(
      (d) =>
        d.status === "PROVISIONAL" ||
        d.status === "FROZEN",
    );
    if (active) {
      return {
        ok: false,
        error:
          "已有临时/冻结决策。请先「重开决策」，再运行 Decision Gate。",
      };
    }

    const beliefUpdates = Object.values(beliefUpdatesByEvidenceId).sort((a, b) =>
      a.created_at < b.created_at ? -1 : 1,
    );

    const beliefPayload = await Promise.all(
      beliefUpdates.map(async (u) => {
        const ev = await getEvidence(u.evidence_id);
        return {
          evidenceClaim: ev?.claim ?? "(证据)",
          evidenceType: u.evidence_type,
          supportsOrChallenges: u.supports_or_challenges,
          beliefUpdate: u.belief_update,
          remainingUnknowns: u.remaining_unknowns,
          suggestedConfidence: u.suggested_confidence,
          userReviewStatus: u.user_review_status,
        };
      }),
    );

    const evaluation = await evaluateDecisionGate({
      projectTitle: project.title,
      projectGoal: project.goal,
      successCriteria: project.success_criteria,
      constraints: project.constraints,
      userDeadline: project.user_deadline,
      uncertaintyQuestion: uncertainty.question,
      uncertaintyConfidence: uncertainty.current_confidence,
      milestoneTitle: milestone.title,
      milestonePurpose: milestone.purpose,
      milestoneExpectedLearning: milestone.expected_learning,
      evidence: evidence.map((e) => ({
        claim: e.claim,
        type: e.type,
        source: e.source,
        confidence: e.confidence,
        userStatus: e.user_status,
      })),
      beliefUpdates: beliefPayload,
    });

    const decision = await saveDecisionFromGate({
      project_id: project.id,
      milestone_id: milestone.id,
      uncertainty_id: uncertainty.id,
      evaluation,
      evidence_at_time: evidence.map((e) => ({
        id: e.id,
        claim: e.claim,
        type: e.type,
        source: e.source,
        confidence: e.confidence,
        user_status: e.user_status,
      })),
      confidence_at_time: uncertainty.current_confidence,
      deadline_at_time: milestone.deadline ?? project.user_deadline,
    });

    await recordJudgmentEvent({
      project_id: project.id,
      milestone_id: milestone.id,
      decision_id: decision.id,
      uncertainty_id: uncertainty.id,
      event_type: "DECISION_GATE_CHANGED",
      payload: {
        recommendation: evaluation.recommendation,
        why: evaluation.why,
      },
    });

    if (evaluation.recommendation === "KEEP_RESEARCHING") {
      await updateMilestoneStatus(milestone.id, "RESEARCHING");
    } else {
      await updateMilestoneStatus(milestone.id, "READY_TO_DECIDE");
    }

    return { ok: true, decisionId: decision.id };
  } catch (err) {
    console.error("Decision Gate failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Decision Gate 失败。",
    };
  }
}

export async function confirmDecisionChoiceAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const decision_id = String(formData.get("decision_id") ?? "");
  const option_id = String(formData.get("option_id") ?? "");
  const statusRaw = String(formData.get("status") ?? "PROVISIONAL");
  const user_choice_note = String(formData.get("user_choice_note") ?? "");

  const status =
    statusRaw === "FROZEN" ? ("FROZEN" as const) : ("PROVISIONAL" as const);

  if (!decision_id || !option_id) {
    redirect(`/milestones/${milestone_id}`);
  }

  const existing = await getDecision(decision_id);
  if (!existing) redirect(`/milestones/${milestone_id}`);
  if (existing.status === "FROZEN") {
    // Must reopen first — Human Agency, but freeze is intentional lock until reopen.
    redirect(`/milestones/${milestone_id}`);
  }

  const updated = await confirmDecisionChoice({
    decision_id,
    option_id,
    status,
    user_choice_note: user_choice_note || null,
  });

  await recordJudgmentEvent({
    project_id: updated.project_id,
    milestone_id,
    decision_id,
    event_type: status === "FROZEN" ? "DECISION_FROZEN" : "DECISION_CREATED",
    payload: {
      selected_option: updated.selected_option,
      status,
      user_choice_note: updated.user_choice_note,
      ai_recommendation: updated.ai_recommendation,
    },
  });

  await updateMilestoneStatus(
    milestone_id,
    status === "FROZEN" ? "DECIDED" : "READY_TO_DECIDE",
  );

  redirect(`/milestones/${milestone_id}`);
}

export async function reopenDecisionAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const decision_id = String(formData.get("decision_id") ?? "");

  if (decision_id) {
    const updated = await reopenDecision(decision_id);
    await recordJudgmentEvent({
      project_id: updated.project_id,
      milestone_id,
      decision_id,
      event_type: "DECISION_REOPENED",
      payload: { history_len: updated.history.length },
    });
    await updateMilestoneStatus(milestone_id, "READY_TO_DECIDE");
  }

  redirect(`/milestones/${milestone_id}`);
}
