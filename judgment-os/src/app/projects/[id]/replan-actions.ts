"use server";

import { redirect } from "next/navigation";
import { proposeReplan } from "@/lib/decision-engine";
import {
  appendMilestoneNote,
  createMilestone,
  createPlanProposal,
  createUncertainty,
  getPlanProposal,
  getProjectDetail,
  listFeedbackForMilestone,
  recordJudgmentEvent,
  reopenDecision,
  setPlanProposalStatus,
  updateMilestoneStatus,
  updateUncertaintyStatus,
} from "@/lib/db/queries";

export async function proposeReplanAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const trigger_note = String(formData.get("trigger_note") ?? "手动请求重规划");
  const milestone_id = String(formData.get("milestone_id") ?? "") || null;

  const detail = await getProjectDetail(project_id);
  if (!detail) redirect(`/projects/${project_id}`);

  let recentLearning: string | null = null;
  if (milestone_id) {
    const fb = await listFeedbackForMilestone(milestone_id);
    recentLearning = fb[0]?.learning ?? null;
  } else if (detail.milestones[0]) {
    const fb = await listFeedbackForMilestone(detail.milestones[0].id);
    recentLearning = fb[0]?.learning ?? null;
  }

  const proposal = await proposeReplan({
    projectTitle: detail.project.title,
    projectGoal: detail.project.goal,
    userDeadline: detail.project.user_deadline,
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
    recentFeedbackLearning: recentLearning,
    triggerNote: trigger_note,
  });

  const saved = await createPlanProposal({
    project_id,
    milestone_id,
    trigger_kind: "MANUAL",
    proposal: {
      whatChanged: proposal.whatChanged,
      whyNotOptimal: proposal.whyNotOptimal,
      proposedChanges: proposal.proposedChanges,
      expectedBenefit: proposal.expectedBenefit,
      tradeoffRisk: proposal.tradeoffRisk,
      newUnknown: proposal.newUnknown,
    },
  });

  await recordJudgmentEvent({
    project_id,
    milestone_id,
    event_type: "PLAN_REVISED",
    payload: {
      proposal_id: saved.id,
      status: "PENDING",
      change_count: saved.proposed_changes.length,
    },
  });

  redirect(`/projects/${project_id}`);
}

export async function reviewPlanProposalAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const proposal_id = String(formData.get("proposal_id") ?? "");
  const decision = String(formData.get("decision") ?? "REJECT");
  const user_note = String(formData.get("user_note") ?? "");

  const proposal = await getPlanProposal(proposal_id);
  if (!proposal || proposal.project_id !== project_id) {
    redirect(`/projects/${project_id}`);
  }

  if (proposal.status !== "PENDING") {
    redirect(`/projects/${project_id}`);
  }

  if (decision === "REJECT") {
    await setPlanProposalStatus({
      id: proposal_id,
      status: "REJECTED",
      user_note: user_note || null,
    });
    await recordJudgmentEvent({
      project_id,
      event_type: "PLAN_REVISED",
      payload: {
        proposal_id,
        status: "REJECTED",
        user_note: user_note || null,
      },
    });
    redirect(`/projects/${project_id}`);
  }

  const status =
    decision === "MODIFY" ? ("MODIFIED" as const) : ("ACCEPTED" as const);

  // Apply proposed changes only on ACCEPT / MODIFY (human ownership).
  const detail = await getProjectDetail(project_id);
  if (!detail) redirect(`/projects/${project_id}`);

  for (const change of proposal.proposed_changes) {
    try {
      if (change.type === "ADD_UNCERTAINTY") {
        await createUncertainty({
          project_id,
          question: change.title || change.detail,
          importance: 70,
          current_confidence: 20,
        });
      } else if (change.type === "CLOSE_UNCERTAINTY" && change.targetId) {
        await updateUncertaintyStatus(change.targetId, "RESOLVED");
      } else if (change.type === "ADD_MILESTONE") {
        const u =
          detail.uncertainties.find((x) => x.status === "OPEN") ??
          detail.uncertainties[0];
        if (u) {
          await createMilestone({
            project_id,
            uncertainty_id: u.id,
            title: change.title,
            purpose: change.detail,
            expected_learning: change.detail,
          });
        }
      } else if (change.type === "REMOVE_MILESTONE" && change.targetId) {
        await updateMilestoneStatus(change.targetId, "ARCHIVED");
      } else if (change.type === "MODIFY_MILESTONE" && change.targetId) {
        await appendMilestoneNote(change.targetId, change.detail || change.title);
      } else if (change.type === "REOPEN_DECISION" && change.targetId) {
        await reopenDecision(change.targetId);
      }
    } catch (err) {
      console.error("Apply plan change failed:", change, err);
    }
  }

  await setPlanProposalStatus({
    id: proposal_id,
    status,
    user_note: user_note || null,
  });

  await recordJudgmentEvent({
    project_id,
    event_type: "PLAN_REVISED",
    payload: {
      proposal_id,
      status,
      user_note: user_note || null,
      applied: proposal.proposed_changes.length,
    },
  });

  redirect(`/projects/${project_id}`);
}
