"use server";

import { redirect } from "next/navigation";
import { analyzeDeadlineChange } from "@/lib/decision-engine";
import {
  createMilestone,
  createUncertainty,
  getProject,
  listMilestonesForProject,
  recordJudgmentEvent,
  updateProjectUserDeadline,
} from "@/lib/db/queries";

export async function updateProjectDeadlineAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const user_deadline = String(formData.get("user_deadline") ?? "");

  const project = await getProject(project_id);
  if (!project) redirect(`/projects/${project_id}`);

  const previous = project.user_deadline;
  const next = user_deadline || null;

  const updated = await updateProjectUserDeadline(project_id, next);

  const milestones = await listMilestonesForProject(project_id);
  let analysisPayload: Record<string, unknown> = {
    previous,
    next,
  };

  try {
    const analysis = await analyzeDeadlineChange({
      projectTitle: project.title,
      projectGoal: project.goal,
      previousUserDeadline: previous,
      newUserDeadline: next,
      systemRecommendedDeadline: project.recommended_deadline,
      milestones: milestones.map((m) => ({
        title: m.title,
        deadline: m.deadline,
        status: m.status,
      })),
    });
    analysisPayload = { ...analysisPayload, analysis };
  } catch (err) {
    console.error("Deadline analysis failed:", err);
    analysisPayload = {
      ...analysisPayload,
      analysis_error: err instanceof Error ? err.message : "analysis failed",
    };
  }

  await recordJudgmentEvent({
    project_id: updated.id,
    event_type: "DEADLINE_CHANGED",
    payload: analysisPayload,
  });

  redirect(`/projects/${project_id}?deadline_updated=1`);
}

export async function createUncertaintyAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const question = String(formData.get("question") ?? "");
  const importance = Number(formData.get("importance") ?? 50);
  const current_confidence = Number(formData.get("current_confidence") ?? 0);

  await createUncertainty({
    project_id,
    question,
    importance,
    current_confidence,
  });

  redirect(`/projects/${project_id}`);
}

export async function createMilestoneAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const uncertainty_id = String(formData.get("uncertainty_id") ?? "");
  const title = String(formData.get("title") ?? "");
  const purpose = String(formData.get("purpose") ?? "");
  const expected_learning = String(formData.get("expected_learning") ?? "");
  const deadline = String(formData.get("deadline") ?? "");

  const milestone = await createMilestone({
    project_id,
    uncertainty_id,
    title,
    purpose,
    expected_learning,
    deadline: deadline || null,
  });

  redirect(`/milestones/${milestone.id}`);
}
