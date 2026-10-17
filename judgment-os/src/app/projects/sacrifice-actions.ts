"use server";

/**
 * Server actions for managing sacrifice declarations
 * 
 * Handles:
 * - Generating AI sacrifice proposals
 * - Accepting/modifying sacrifices
 * - Recording sacrifice decisions in judgment events
 */

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { projects, experiments, judgmentEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { 
  proposeProjectSacrifices, 
  proposeActionSacrifices,
  type ProposeProjectSacrificesInput,
  type ProposeActionSacrificesInput,
} from "@/lib/decision-engine/propose-sacrifices";
import type { Sacrifice } from "@/lib/db/schema";
import { randomUUID } from "crypto";
import { getLocale } from "@/lib/locale.server";

/**
 * Generate AI-proposed sacrifices for a project
 */
export async function generateProjectSacrifices(projectId: string) {
  const db = getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { error: "Project not found" };
  }

  const input: ProposeProjectSacrificesInput = {
    goal: project.goal,
    successCriteria: project.successCriteria,
    constraints: project.constraints,
    userDeadline: project.userDeadline || undefined,
    recommendedDeadline: project.recommendedDeadline || undefined,
  };

  try {
    const sacrifices = await proposeProjectSacrifices(input, await getLocale());

    await db
      .update(projects)
      .set({ 
        willingSacrifices: sacrifices,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId));

    await db.insert(judgmentEvents).values({
      projectId,
      eventType: "SACRIFICES_GENERATED",
      payload: { count: sacrifices.length, source: "AI" },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, sacrifices };
  } catch (error) {
    console.error("Failed to generate sacrifices:", error);
    return { error: "Failed to generate sacrifice proposals" };
  }
}

/**
 * Accept project sacrifices (possibly with user modifications)
 */
export async function acceptProjectSacrifices(
  projectId: string,
  sacrifices: Sacrifice[]
) {
  const db = getDb();
  const acceptedSacrifices = sacrifices.map((s) => ({
    ...s,
    acceptedAt: new Date().toISOString(),
  }));

  try {
    await db
      .update(projects)
      .set({
        willingSacrifices: acceptedSacrifices,
        sacrificesAcceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId));

    await db.insert(judgmentEvents).values({
      projectId,
      eventType: "SACRIFICES_ACCEPTED",
      payload: {
        sacrifices: acceptedSacrifices.map((s) => ({
          category: s.category,
          description: s.description,
          userModified: s.userModified,
        })),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to accept sacrifices:", error);
    return { error: "Failed to accept sacrifices" };
  }
}

/**
 * Update an existing sacrifice (marks as user-modified)
 */
export async function updateProjectSacrifice(
  projectId: string,
  sacrificeId: string,
  updates: Partial<Pick<Sacrifice, "description" | "impact" | "category">>
) {
  const db = getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { error: "Project not found" };
  }

  const sacrifices = (project.willingSacrifices as Sacrifice[]) || [];
  const updatedSacrifices = sacrifices.map((s) =>
    s.id === sacrificeId
      ? { ...s, ...updates, userModified: true }
      : s
  );

  try {
    await db
      .update(projects)
      .set({
        willingSacrifices: updatedSacrifices,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId));

    await db.insert(judgmentEvents).values({
      projectId,
      eventType: "SACRIFICE_MODIFIED",
      payload: { sacrificeId, updates },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update sacrifice:", error);
    return { error: "Failed to update sacrifice" };
  }
}

/**
 * Add a custom sacrifice (user-created, not AI-generated)
 */
export async function addCustomProjectSacrifice(
  projectId: string,
  sacrifice: Omit<Sacrifice, "id" | "aiGenerated" | "userModified">
) {
  const db = getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { error: "Project not found" };
  }

  const newSacrifice: Sacrifice = {
    ...sacrifice,
    id: randomUUID(),
    aiGenerated: false,
    userModified: false,
  };

  const sacrifices = (project.willingSacrifices as Sacrifice[]) || [];
  const updatedSacrifices = [...sacrifices, newSacrifice];

  try {
    await db
      .update(projects)
      .set({
        willingSacrifices: updatedSacrifices,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, projectId));

    await db.insert(judgmentEvents).values({
      projectId,
      eventType: "CUSTOM_SACRIFICE_ADDED",
      payload: { sacrifice: newSacrifice },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, sacrifice: newSacrifice };
  } catch (error) {
    console.error("Failed to add custom sacrifice:", error);
    return { error: "Failed to add custom sacrifice" };
  }
}

/**
 * Generate AI-proposed sacrifices for an experiment/action
 */
export async function generateExperimentSacrifices(
  experimentId: string,
  milestoneId: string
) {
  const db = getDb();
  const experiment = await db.query.experiments.findFirst({
    where: eq(experiments.id, experimentId),
  });

  if (!experiment) {
    return { error: "Experiment not found" };
  }

  const milestone = await db.query.milestones.findFirst({
    where: eq(experiments.milestoneId, milestoneId),
    with: { project: true },
  });

  if (!milestone) {
    return { error: "Milestone not found" };
  }

  const input: ProposeActionSacrificesInput = {
    projectGoal: milestone.project.goal,
    projectSacrifices: (milestone.project.willingSacrifices as Sacrifice[]) || [],
    actionText: experiment.actionText,
    hypothesis: experiment.hypothesis,
    expectedOutcome: experiment.expectedOutcome,
    deadline: experiment.deadline || undefined,
  };

  try {
    const sacrifices = await proposeActionSacrifices(input, await getLocale());

    await db
      .update(experiments)
      .set({
        requiredSacrifices: sacrifices,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(experiments.id, experimentId));

    await db.insert(judgmentEvents).values({
      projectId: milestone.project.id,
      milestoneId: milestone.id,
      eventType: "EXPERIMENT_SACRIFICES_GENERATED",
      payload: { experimentId, count: sacrifices.length },
    });

    revalidatePath(`/milestones/${milestoneId}`);
    return { success: true, sacrifices };
  } catch (error) {
    console.error("Failed to generate experiment sacrifices:", error);
    return { error: "Failed to generate sacrifice proposals" };
  }
}

/**
 * Accept experiment sacrifices
 */
export async function acceptExperimentSacrifices(
  experimentId: string,
  milestoneId: string,
  sacrifices: Sacrifice[]
) {
  const db = getDb();
  const acceptedSacrifices = sacrifices.map((s) => ({
    ...s,
    acceptedAt: new Date().toISOString(),
  }));

  try {
    const experiment = await db.query.experiments.findFirst({
      where: eq(experiments.id, experimentId),
      with: { milestone: { with: { project: true } } },
    });

    if (!experiment) {
      return { error: "Experiment not found" };
    }

    await db
      .update(experiments)
      .set({
        requiredSacrifices: acceptedSacrifices,
        sacrificesAcceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(experiments.id, experimentId));

    await db.insert(judgmentEvents).values({
      projectId: experiment.milestone.project.id,
      milestoneId: experiment.milestone.id,
      eventType: "EXPERIMENT_SACRIFICES_ACCEPTED",
      payload: {
        experimentId,
        sacrifices: acceptedSacrifices.map((s) => ({
          category: s.category,
          description: s.description,
        })),
      },
    });

    revalidatePath(`/milestones/${milestoneId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to accept experiment sacrifices:", error);
    return { error: "Failed to accept sacrifices" };
  }
}
