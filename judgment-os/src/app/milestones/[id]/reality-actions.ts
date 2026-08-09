"use server";

import { redirect } from "next/navigation";
import { analyzeFeedback, proposeReplan } from "@/lib/decision-engine";
import {
  createExperiment,
  createFeedbackRecord,
  createPlanProposal,
  getMilestoneWorkspace,
  getProjectDetail,
  recordJudgmentEvent,
  reopenDecision,
  updateExperimentStatus,
  updateMilestoneStatus,
  updateUncertaintyConfidence,
} from "@/lib/db/queries";

export async function createExperimentAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const decision_id = String(formData.get("decision_id") ?? "") || null;
  const action_text = String(formData.get("action_text") ?? "");
  const hypothesis = String(formData.get("hypothesis") ?? "");
  const expected_outcome = String(formData.get("expected_outcome") ?? "");
  const evidence_expected = String(formData.get("evidence_expected") ?? "");
  const deadline = String(formData.get("deadline") ?? "");

  const workspace = await getMilestoneWorkspace(milestone_id);
  if (!workspace) redirect(`/milestones/${milestone_id}`);

  const experiment = await createExperiment({
    milestone_id,
    decision_id,
    action_text,
    hypothesis,
    expected_outcome,
    evidence_expected,
    deadline: deadline || null,
    status: "RUNNING",
  });

  await updateMilestoneStatus(milestone_id, "ACTION_RUNNING");

  await recordJudgmentEvent({
    project_id: workspace.project.id,
    milestone_id,
    decision_id,
    event_type: "EXPERIMENT_STARTED",
    payload: {
      experiment_id: experiment.id,
      action_text: experiment.action_text,
      expected_outcome: experiment.expected_outcome,
    },
  });

  redirect(`/milestones/${milestone_id}`);
}

export async function captureFeedbackAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const experiment_id = String(formData.get("experiment_id") ?? "") || null;
  const decision_id = String(formData.get("decision_id") ?? "") || null;
  const expected_outcome = String(formData.get("expected_outcome") ?? "");
  const actual_outcome = String(formData.get("actual_outcome") ?? "");
  const user_learning = String(formData.get("user_learning") ?? "");
  const reopen = String(formData.get("reopen_decision") ?? "") === "1";

  const workspace = await getMilestoneWorkspace(milestone_id);
  if (!workspace) redirect(`/milestones/${milestone_id}`);

  const { project, uncertainty, decisions, experiments } = workspace;
  const decision =
    decisions.find((d) => d.id === decision_id) ?? decisions[0] ?? null;
  const experiment =
    experiments.find((e) => e.id === experiment_id) ?? experiments[0] ?? null;

  const expected =
    expected_outcome.trim() ||
    experiment?.expected_outcome ||
    "";
  const actual = actual_outcome.trim();
  if (!actual) {
    redirect(`/milestones/${milestone_id}`);
  }

  await updateMilestoneStatus(milestone_id, "FEEDBACK_REQUIRED");

  let analysis;
  try {
    analysis = await analyzeFeedback({
      uncertaintyQuestion:
        uncertainty?.question ?? "（未关联不确定性）",
      priorConfidence: uncertainty?.current_confidence ?? 0,
      decisionQuestion: decision?.question ?? null,
      selectedOptionLabel: decision?.selected_option?.label ?? null,
      experimentAction: experiment?.action_text ?? "（未记录实验）",
      hypothesis: experiment?.hypothesis ?? "",
      expectedOutcome: expected,
      actualOutcome: actual,
    });
  } catch (err) {
    console.error("Feedback analysis failed:", err);
    analysis = {
      difference: `预期：${expected}；实际：${actual}`,
      learning:
        user_learning.trim() ||
        "已记录现实结果；AI 分析失败，请人工补充学习。",
      assumptionsStrengthened: [] as string[],
      assumptionsWeakened: [] as string[],
      uncertaintiesReduced: [] as string[],
      newUncertainties: [] as string[],
      decisionImpact: "NEUTRAL" as const,
      suggestReopen: false,
      aiAnalysis: "AI 分析不可用；仅保存原始反馈。",
      suggestedConfidenceAfter: null as number | null,
    };
  }

  const learning = user_learning.trim() || analysis.learning;

  const created = await createFeedbackRecord({
    milestone_id,
    decision_id: decision?.id ?? null,
    experiment_id: experiment?.id ?? null,
    expected_outcome: expected,
    actual_outcome: actual,
    difference: analysis.difference,
    learning,
    confidence_before: uncertainty?.current_confidence ?? null,
    confidence_after: analysis.suggestedConfidenceAfter,
    assumptions_strengthened: analysis.assumptionsStrengthened,
    assumptions_weakened: analysis.assumptionsWeakened,
    uncertainties_reduced: analysis.uncertaintiesReduced,
    new_uncertainties: analysis.newUncertainties,
    decision_impact: analysis.decisionImpact,
    suggest_reopen: analysis.suggestReopen,
    ai_analysis: analysis.aiAnalysis,
  });

  if (experiment) {
    await updateExperimentStatus(experiment.id, "COMPLETED");
  }

  if (
    uncertainty &&
    analysis.suggestedConfidenceAfter != null
  ) {
    await updateUncertaintyConfidence(
      uncertainty.id,
      analysis.suggestedConfidenceAfter,
    );
  }

  await updateMilestoneStatus(milestone_id, "LEARNING_CAPTURED");

  await recordJudgmentEvent({
    project_id: project.id,
    milestone_id,
    decision_id: decision?.id ?? null,
    uncertainty_id: uncertainty?.id ?? null,
    event_type: "FEEDBACK_CAPTURED",
    payload: {
      feedback_id: created.id,
      decision_impact: created.decision_impact,
      suggest_reopen: created.suggest_reopen,
      learning: created.learning,
    },
  });

  if (
    reopen ||
    (analysis.suggestReopen &&
      decision &&
      (decision.status === "PROVISIONAL" || decision.status === "FROZEN"))
  ) {
    if (reopen && decision) {
      await reopenDecision(decision.id);
      await recordJudgmentEvent({
        project_id: project.id,
        milestone_id,
        decision_id: decision.id,
        event_type: "DECISION_REOPENED",
        payload: { reason: "feedback_triggered_by_user" },
      });
    }
  }

  // Dynamic Replanning: AI proposes; human must approve later.
  try {
    const detail = await getProjectDetail(project.id);
    if (detail) {
      const replan = await proposeReplan({
        projectTitle: project.title,
        projectGoal: project.goal,
        userDeadline: project.user_deadline,
        uncertainties: detail.uncertainties.map((u) => ({
          id: u.id,
          question: u.question,
          status: u.status,
        })),
        milestones: detail.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          expectedLearning: m.expected_learning,
        })),
        recentFeedbackLearning: learning,
        triggerNote: `现实反馈已捕获（影响=${created.decision_impact}）`,
      });
      const saved = await createPlanProposal({
        project_id: project.id,
        milestone_id,
        trigger_kind: "FEEDBACK",
        proposal: {
          whatChanged: replan.whatChanged,
          whyNotOptimal: replan.whyNotOptimal,
          proposedChanges: replan.proposedChanges,
          expectedBenefit: replan.expectedBenefit,
          tradeoffRisk: replan.tradeoffRisk,
          newUnknown: replan.newUnknown,
        },
      });
      await recordJudgmentEvent({
        project_id: project.id,
        milestone_id,
        event_type: "PLAN_REVISED",
        payload: {
          proposal_id: saved.id,
          status: "PENDING",
          trigger: "FEEDBACK",
        },
      });
    }
  } catch (err) {
    console.error("Auto replan proposal failed:", err);
  }

  redirect(`/milestones/${milestone_id}`);
}
