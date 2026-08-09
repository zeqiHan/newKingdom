"use server";

import { redirect } from "next/navigation";
import { createProject } from "@/lib/db/queries";

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const goal = String(formData.get("goal") ?? "");
  const success_criteria = String(formData.get("success_criteria") ?? "");
  const constraints = String(formData.get("constraints") ?? "");
  const user_deadline = String(formData.get("user_deadline") ?? "");

  const project = await createProject({
    title,
    goal,
    success_criteria,
    constraints,
    user_deadline: user_deadline || null,
  });

  redirect(`/projects/${project.id}`);
}
