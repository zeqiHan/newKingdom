"use server";

import { redirect } from "next/navigation";
import {
  createMilestone,
  createUncertainty,
  updateProjectUserDeadline,
} from "@/lib/db/queries";

export async function updateProjectDeadlineAction(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const user_deadline = String(formData.get("user_deadline") ?? "");

  await updateProjectUserDeadline(project_id, user_deadline || null);
  redirect(`/projects/${project_id}`);
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
