import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { projects, uncertainties, milestones } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysis } = body;

    if (!analysis) {
      return NextResponse.json(
        { error: "Invalid analysis data" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Create project with sacrifices
    const [project] = await db
      .insert(projects)
      .values({
        title: analysis.title,
        goal: analysis.clarifiedGoal,
        successCriteria: analysis.successCriteria,
        constraints: analysis.constraints,
        willingSacrifices: (analysis.willingSacrifices ?? []).slice(0, 3),
        sacrificesAcceptedAt: null,
        userDeadline: analysis.userDeadline || null,
        recommendedDeadline: analysis.recommendedDeadline || null,
        status: "ACTIVE",
      })
      .returning();

    // Create uncertainties
    const uncertaintyMap = new Map<string, string>();
    for (const u of analysis.keyUncertainties) {
      const [inserted] = await db
        .insert(uncertainties)
        .values({
          projectId: project.id,
          question: u.question,
          importance: u.importance,
          currentConfidence: 20, // Default low confidence
          status: "OPEN",
        })
        .returning();
      uncertaintyMap.set(u.tempId, inserted.id);
    }

    // Create milestones
    for (const m of (analysis.suggestedMilestones ?? []).slice(0, 3)) {
      const uncertaintyId = uncertaintyMap.get(m.uncertaintyTempId);
      await db.insert(milestones).values({
        projectId: project.id,
        uncertaintyId: uncertaintyId || null,
        title: m.title,
        purpose: m.purpose,
        expectedLearning: m.expectedLearning,
        deadline: m.deadline || null,
        status: "PROPOSED",
      });
    }

    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
