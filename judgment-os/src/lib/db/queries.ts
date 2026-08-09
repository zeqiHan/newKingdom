import { asc, desc, eq } from "drizzle-orm";
import { getReadyDb } from "./client";
import {
  beliefUpdates,
  decisions,
  evidence,
  feedback,
  milestones,
  projects,
  uncertainties,
} from "./schema";
import type {
  BeliefUpdate,
  BeliefUpdateReviewStatus,
  Decision,
  DecisionOption,
  Evidence,
  EvidenceType,
  Feedback,
  Milestone,
  Project,
  SupportsOrChallenges,
  Uncertainty,
} from "./types";
import type {
  BeliefUpdateAnalysis,
  DecisionGateEvaluation,
} from "@/lib/decision-engine";

function mapProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    success_criteria: row.successCriteria,
    constraints: row.constraints,
    user_deadline: row.userDeadline,
    recommended_deadline: row.recommendedDeadline,
    status: row.status as Project["status"],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapUncertainty(row: typeof uncertainties.$inferSelect): Uncertainty {
  return {
    id: row.id,
    project_id: row.projectId,
    question: row.question,
    importance: row.importance,
    current_confidence: row.currentConfidence,
    status: row.status as Uncertainty["status"],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapMilestone(row: typeof milestones.$inferSelect): Milestone {
  return {
    id: row.id,
    project_id: row.projectId,
    uncertainty_id: row.uncertaintyId,
    title: row.title,
    purpose: row.purpose,
    expected_learning: row.expectedLearning,
    status: row.status as Milestone["status"],
    deadline: row.deadline,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapEvidence(row: typeof evidence.$inferSelect): Evidence {
  return {
    id: row.id,
    milestone_id: row.milestoneId,
    claim: row.claim,
    type: row.type as Evidence["type"],
    source: row.source,
    confidence: row.confidence,
    user_status: row.userStatus as Evidence["user_status"],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapDecision(row: typeof decisions.$inferSelect): Decision {
  return {
    id: row.id,
    project_id: row.projectId,
    milestone_id: row.milestoneId,
    uncertainty_id: row.uncertaintyId ?? null,
    question: row.question,
    options: (row.options ?? []) as DecisionOption[],
    selected_option: (row.selectedOption ?? null) as DecisionOption | null,
    reasoning: row.reasoning,
    confidence: row.confidence,
    status: row.status as Decision["status"],
    evidence_at_time: (row.evidenceAtTime ?? []) as unknown[],
    unknowns_at_time: (row.unknownsAtTime ?? []) as unknown[],
    confidence_at_time: row.confidenceAtTime,
    deadline_at_time: row.deadlineAtTime,
    gate_recommendation: (row.gateRecommendation ??
      null) as Decision["gate_recommendation"],
    gate_why: row.gateWhy ?? "",
    blocked_decision: row.blockedDecision ?? "",
    tradeoffs: (row.tradeoffs ?? []) as string[],
    cost_of_waiting: row.costOfWaiting ?? "",
    cost_of_being_wrong: row.costOfBeingWrong ?? "",
    value_of_more_info: row.valueOfMoreInfo ?? "",
    reversibility: row.reversibility ?? "",
    would_info_change_action: row.wouldInfoChangeAction ?? "",
    ai_recommendation: (row.aiRecommendation ??
      null) as Decision["ai_recommendation"],
    user_choice_note: row.userChoiceNote ?? null,
    history: (row.history ?? []) as Decision["history"],
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapFeedback(row: typeof feedback.$inferSelect): Feedback {
  return {
    id: row.id,
    milestone_id: row.milestoneId,
    decision_id: row.decisionId,
    expected_outcome: row.expectedOutcome,
    actual_outcome: row.actualOutcome,
    learning: row.learning,
    confidence_before: row.confidenceBefore,
    confidence_after: row.confidenceAfter,
    created_at: row.createdAt,
  };
}

function mapBeliefUpdate(row: typeof beliefUpdates.$inferSelect): BeliefUpdate {
  return {
    id: row.id,
    evidence_id: row.evidenceId,
    uncertainty_id: row.uncertaintyId,
    milestone_id: row.milestoneId,
    evidence_type: row.evidenceType as EvidenceType,
    evidence_strength: row.evidenceStrength,
    supports_or_challenges: row.supportsOrChallenges as SupportsOrChallenges,
    belief_update: row.beliefUpdate,
    remaining_unknowns: (row.remainingUnknowns ?? []) as string[],
    recommended_next_experiment: row.recommendedNextExperiment,
    prior_confidence: row.priorConfidence,
    suggested_confidence: row.suggestedConfidence,
    user_review_status: row.userReviewStatus as BeliefUpdateReviewStatus,
    user_correction: row.userCorrection,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function listProjects(): Promise<Project[]> {
  const db = await getReadyDb();
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return rows.map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getReadyDb();
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ? mapProject(rows[0]) : null;
}

export type CreateProjectInput = {
  title: string;
  goal: string;
  success_criteria?: string;
  constraints?: string;
  user_deadline?: string | null;
};

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const db = await getReadyDb();
  const title = input.title.trim();
  const goal = input.goal.trim();
  if (!title) throw new Error("标题不能为空。");
  if (!goal) throw new Error("目标不能为空。");

  const rows = await db
    .insert(projects)
    .values({
      title,
      goal,
      successCriteria: input.success_criteria?.trim() ?? "",
      constraints: input.constraints?.trim() ?? "",
      userDeadline: input.user_deadline?.trim() || null,
      recommendedDeadline: null,
      status: "ACTIVE",
    })
    .returning();

  return mapProject(rows[0]);
}

export type ConfirmedProposalInput = {
  title: string;
  clarified_goal: string;
  success_criteria?: string;
  constraints?: string;
  uncertainties: Array<{
    temp_id: string;
    question: string;
    importance: number;
  }>;
  milestones: Array<{
    uncertainty_temp_id: string;
    title: string;
    purpose: string;
    expected_learning: string;
  }>;
};

/**
 * Persist a human-confirmed Goal proposal:
 * Project + Uncertainties + Milestones (each milestone tied to an uncertainty).
 */
export async function createProjectFromProposal(
  input: ConfirmedProposalInput,
): Promise<Project> {
  const project = await createProject({
    title: input.title,
    goal: input.clarified_goal,
    success_criteria: input.success_criteria,
    constraints: input.constraints,
  });

  const uncertaintyIdByTemp = new Map<string, string>();

  for (const u of input.uncertainties) {
    const created = await createUncertainty({
      project_id: project.id,
      question: u.question,
      importance: u.importance,
      current_confidence: 0,
    });
    uncertaintyIdByTemp.set(u.temp_id, created.id);
  }

  for (const m of input.milestones) {
    const uncertaintyId = uncertaintyIdByTemp.get(m.uncertainty_temp_id);
    if (!uncertaintyId) {
      throw new Error(
        `里程碑「${m.title}」引用了未知的不确定性。`,
      );
    }
    await createMilestone({
      project_id: project.id,
      uncertainty_id: uncertaintyId,
      title: m.title,
      purpose: m.purpose,
      expected_learning: m.expected_learning,
    });
  }

  return project;
}

export type CreateUncertaintyInput = {
  project_id: string;
  question: string;
  importance?: number;
  current_confidence?: number;
};

export async function createUncertainty(
  input: CreateUncertaintyInput,
): Promise<Uncertainty> {
  const db = await getReadyDb();
  const question = input.question.trim();
  if (!question) throw new Error("问题不能为空。");

  const project = await getProject(input.project_id);
  if (!project) throw new Error("未找到项目。");

  const importance = clampInt(input.importance ?? 50, 0, 100);
  const currentConfidence = clampInt(input.current_confidence ?? 0, 0, 100);

  const rows = await db
    .insert(uncertainties)
    .values({
      projectId: input.project_id,
      question,
      importance,
      currentConfidence,
      status: "OPEN",
    })
    .returning();

  return mapUncertainty(rows[0]);
}

export type CreateMilestoneInput = {
  project_id: string;
  uncertainty_id: string;
  title: string;
  purpose?: string;
  expected_learning?: string;
  deadline?: string | null;
};

export async function createMilestone(
  input: CreateMilestoneInput,
): Promise<Milestone> {
  const db = await getReadyDb();
  const title = input.title.trim();
  if (!title) throw new Error("标题不能为空。");
  if (!input.uncertainty_id) throw new Error("必须选择不确定性。");

  const project = await getProject(input.project_id);
  if (!project) throw new Error("未找到项目。");

  const uncertainty = await getUncertainty(input.uncertainty_id);
  if (!uncertainty || uncertainty.project_id !== input.project_id) {
    throw new Error("该不确定性不属于此项目。");
  }

  const rows = await db
    .insert(milestones)
    .values({
      projectId: input.project_id,
      uncertaintyId: input.uncertainty_id,
      title,
      purpose: input.purpose?.trim() ?? "",
      expectedLearning: input.expected_learning?.trim() ?? "",
      deadline: input.deadline?.trim() || null,
      status: "PROPOSED",
    })
    .returning();

  return mapMilestone(rows[0]);
}

export type CreateEvidenceInput = {
  milestone_id: string;
  claim: string;
  type: Evidence["type"];
  source?: string | null;
  confidence?: number;
};

export async function createEvidence(
  input: CreateEvidenceInput,
): Promise<Evidence> {
  const db = await getReadyDb();
  const claim = input.claim.trim();
  if (!claim) throw new Error("陈述不能为空。");

  const allowed: Evidence["type"][] = [
    "FACT",
    "ASSUMPTION",
    "INFERENCE",
    "OPINION",
  ];
  if (!allowed.includes(input.type)) {
    throw new Error("证据类型无效。");
  }

  const milestone = await getMilestone(input.milestone_id);
  if (!milestone) throw new Error("未找到里程碑。");

  const rows = await db
    .insert(evidence)
    .values({
      milestoneId: input.milestone_id,
      claim,
      type: input.type,
      source: input.source?.trim() || null,
      confidence: clampInt(input.confidence ?? 50, 0, 100),
      userStatus: "UNREVIEWED",
    })
    .returning();

  return mapEvidence(rows[0]);
}

export async function listBeliefUpdatesForUncertainty(
  uncertaintyId: string,
): Promise<BeliefUpdate[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(beliefUpdates)
    .where(eq(beliefUpdates.uncertaintyId, uncertaintyId))
    .orderBy(asc(beliefUpdates.createdAt));
  return rows.map(mapBeliefUpdate);
}

export async function listBeliefUpdatesForMilestone(
  milestoneId: string,
): Promise<BeliefUpdate[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(beliefUpdates)
    .where(eq(beliefUpdates.milestoneId, milestoneId))
    .orderBy(asc(beliefUpdates.createdAt));
  return rows.map(mapBeliefUpdate);
}

export async function getBeliefUpdateByEvidenceId(
  evidenceId: string,
): Promise<BeliefUpdate | null> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(beliefUpdates)
    .where(eq(beliefUpdates.evidenceId, evidenceId))
    .limit(1);
  return rows[0] ? mapBeliefUpdate(rows[0]) : null;
}

export async function saveBeliefUpdate(input: {
  evidence_id: string;
  uncertainty_id: string;
  milestone_id: string;
  analysis: BeliefUpdateAnalysis;
  prior_confidence: number;
}): Promise<BeliefUpdate> {
  const db = await getReadyDb();
  const rows = await db
    .insert(beliefUpdates)
    .values({
      evidenceId: input.evidence_id,
      uncertaintyId: input.uncertainty_id,
      milestoneId: input.milestone_id,
      evidenceType: input.analysis.evidenceType,
      evidenceStrength: input.analysis.evidenceStrength,
      supportsOrChallenges: input.analysis.supportsOrChallenges,
      beliefUpdate: input.analysis.beliefUpdate,
      remainingUnknowns: input.analysis.remainingUnknowns,
      recommendedNextExperiment: input.analysis.recommendedNextExperiment,
      priorConfidence: input.prior_confidence,
      suggestedConfidence: input.analysis.suggestedConfidence,
      userReviewStatus: "UNREVIEWED",
      userCorrection: null,
    })
    .returning();

  // Provisional confidence update — AI proposes; human may challenge later.
  await db
    .update(uncertainties)
    .set({
      currentConfidence: input.analysis.suggestedConfidence,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(uncertainties.id, input.uncertainty_id));

  return mapBeliefUpdate(rows[0]);
}

export async function reviewBeliefUpdate(input: {
  belief_update_id: string;
  status: BeliefUpdateReviewStatus;
  user_correction?: string | null;
  corrected_belief_update?: string | null;
  corrected_remaining_unknowns?: string[] | null;
  corrected_suggested_confidence?: number | null;
}): Promise<BeliefUpdate> {
  const db = await getReadyDb();
  const existing = await db
    .select()
    .from(beliefUpdates)
    .where(eq(beliefUpdates.id, input.belief_update_id))
    .limit(1);
  if (!existing[0]) throw new Error("未找到信念更新。");

  const row = existing[0];
  const nextBelief =
    input.corrected_belief_update?.trim() || row.beliefUpdate;
  const nextUnknowns =
    input.corrected_remaining_unknowns ??
    ((row.remainingUnknowns ?? []) as string[]);
  const nextConfidence =
    input.corrected_suggested_confidence != null
      ? clampInt(input.corrected_suggested_confidence, 0, 100)
      : row.suggestedConfidence;

  const updated = await db
    .update(beliefUpdates)
    .set({
      userReviewStatus: input.status,
      userCorrection: input.user_correction?.trim() || null,
      beliefUpdate: nextBelief,
      remainingUnknowns: nextUnknowns,
      suggestedConfidence: nextConfidence,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(beliefUpdates.id, input.belief_update_id))
    .returning();

  if (input.status === "ACCEPTED" || input.status === "CORRECTED") {
    await db
      .update(uncertainties)
      .set({
        currentConfidence: nextConfidence,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(uncertainties.id, row.uncertaintyId));
  }

  if (input.status === "CHALLENGED") {
    // Revert provisional confidence to prior when human challenges AI.
    await db
      .update(uncertainties)
      .set({
        currentConfidence: row.priorConfidence,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(uncertainties.id, row.uncertaintyId));
  }

  // Mirror review onto evidence user_status for Evidence Rule consistency.
  const evidenceStatus =
    input.status === "ACCEPTED"
      ? "ACCEPTED"
      : input.status === "CHALLENGED"
        ? "CHALLENGED"
        : input.status === "CORRECTED"
          ? "CORRECTED"
          : "UNREVIEWED";
  await db
    .update(evidence)
    .set({
      userStatus: evidenceStatus,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(evidence.id, row.evidenceId));

  return mapBeliefUpdate(updated[0]);
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export async function listUncertaintiesForProject(
  projectId: string,
): Promise<Uncertainty[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(uncertainties)
    .where(eq(uncertainties.projectId, projectId))
    .orderBy(desc(uncertainties.importance));
  return rows.map(mapUncertainty);
}

export async function listMilestonesForProject(
  projectId: string,
): Promise<Milestone[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.createdAt));
  return rows.map(mapMilestone);
}

export async function getMilestone(id: string): Promise<Milestone | null> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .limit(1);
  return rows[0] ? mapMilestone(rows[0]) : null;
}

export async function getUncertainty(
  id: string,
): Promise<Uncertainty | null> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(uncertainties)
    .where(eq(uncertainties.id, id))
    .limit(1);
  return rows[0] ? mapUncertainty(rows[0]) : null;
}

export async function listEvidenceForMilestone(
  milestoneId: string,
): Promise<Evidence[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(evidence)
    .where(eq(evidence.milestoneId, milestoneId))
    .orderBy(asc(evidence.createdAt));
  return rows.map(mapEvidence);
}

export async function getEvidence(id: string): Promise<Evidence | null> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(evidence)
    .where(eq(evidence.id, id))
    .limit(1);
  return rows[0] ? mapEvidence(rows[0]) : null;
}

export async function listDecisionsForMilestone(
  milestoneId: string,
): Promise<Decision[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.milestoneId, milestoneId))
    .orderBy(desc(decisions.createdAt));
  return rows.map(mapDecision);
}

export async function getDecision(id: string): Promise<Decision | null> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, id))
    .limit(1);
  return rows[0] ? mapDecision(rows[0]) : null;
}

export async function updateMilestoneStatus(
  milestoneId: string,
  status: Milestone["status"],
): Promise<Milestone | null> {
  const db = await getReadyDb();
  const rows = await db
    .update(milestones)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(milestones.id, milestoneId))
    .returning();
  return rows[0] ? mapMilestone(rows[0]) : null;
}

/**
 * Persist Decision Gate evaluation as OPEN (AI recommends; human has not chosen).
 * Updates an existing OPEN/REOPENED row on this milestone; otherwise inserts.
 */
export async function saveDecisionFromGate(input: {
  project_id: string;
  milestone_id: string;
  uncertainty_id: string | null;
  evaluation: DecisionGateEvaluation;
  evidence_at_time: unknown[];
  confidence_at_time: number | null;
  deadline_at_time: string | null;
}): Promise<Decision> {
  const db = await getReadyDb();
  const e = input.evaluation;
  const existingList = await listDecisionsForMilestone(input.milestone_id);
  const target = existingList.find(
    (d) => d.status === "OPEN" || d.status === "REOPENED",
  );

  const values = {
    projectId: input.project_id,
    milestoneId: input.milestone_id,
    uncertaintyId: input.uncertainty_id,
    question: e.blockedDecision,
    options: e.options.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      bestEvidence: o.bestEvidence,
    })),
    selectedOption: null as DecisionOption | null,
    reasoning: e.why,
    confidence: input.confidence_at_time ?? 0,
    status: "OPEN" as const,
    evidenceAtTime: input.evidence_at_time,
    unknownsAtTime: e.remainingUnknowns,
    confidenceAtTime: input.confidence_at_time,
    deadlineAtTime: input.deadline_at_time,
    gateRecommendation: e.recommendation,
    gateWhy: e.why,
    blockedDecision: e.blockedDecision,
    tradeoffs: e.tradeoffs,
    costOfWaiting: e.costOfWaiting,
    costOfBeingWrong: e.costOfBeingWrong,
    valueOfMoreInfo: e.valueOfMoreInfo,
    reversibility: e.reversibility,
    wouldInfoChangeAction: e.wouldInfoChangeAction,
    aiRecommendation: e.aiRecommendation,
    userChoiceNote: null as string | null,
    updatedAt: new Date().toISOString(),
  };

  if (target) {
    const rows = await db
      .update(decisions)
      .set({
        ...values,
        // Preserve reopen history; clear prior selection on new gate.
        history: target.history,
      })
      .where(eq(decisions.id, target.id))
      .returning();
    return mapDecision(rows[0]);
  }

  const rows = await db
    .insert(decisions)
    .values({
      ...values,
      history: [],
    })
    .returning();

  return mapDecision(rows[0]);
}

export async function confirmDecisionChoice(input: {
  decision_id: string;
  option_id: string;
  /** Human may choose PROVISIONAL or FROZEN regardless of AI gate. */
  status: "PROVISIONAL" | "FROZEN";
  user_choice_note?: string | null;
}): Promise<Decision> {
  const db = await getReadyDb();
  const existing = await getDecision(input.decision_id);
  if (!existing) throw new Error("Decision not found.");

  const option =
    existing.options.find((o) => o.id === input.option_id) ?? null;
  if (!option) throw new Error("Selected option not found on this decision.");

  const rows = await db
    .update(decisions)
    .set({
      selectedOption: option,
      status: input.status,
      userChoiceNote: input.user_choice_note?.trim() || null,
      // Keep AI why; append human note into reasoning for auditability.
      reasoning: [
        existing.gate_why || existing.reasoning,
        input.user_choice_note?.trim()
          ? `用户选择说明：${input.user_choice_note.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(decisions.id, input.decision_id))
    .returning();

  return mapDecision(rows[0]);
}

/**
 * Reopen a decision: mark REOPENED and append a history snapshot.
 * Original choice + reasoning remain in history and on the row until a new gate run.
 */
export async function reopenDecision(
  decisionId: string,
): Promise<Decision> {
  const db = await getReadyDb();
  const existing = await getDecision(decisionId);
  if (!existing) throw new Error("Decision not found.");

  const snapshot: Decision["history"][number] = {
    at: new Date().toISOString(),
    status: existing.status,
    selected_option: existing.selected_option,
    reasoning: existing.reasoning,
    gate_recommendation: existing.gate_recommendation,
    gate_why: existing.gate_why,
    ai_recommendation: existing.ai_recommendation,
    user_choice_note: existing.user_choice_note,
    evidence_at_time: existing.evidence_at_time,
    unknowns_at_time: existing.unknowns_at_time,
  };

  const rows = await db
    .update(decisions)
    .set({
      status: "REOPENED",
      history: [...existing.history, snapshot],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(decisions.id, decisionId))
    .returning();

  return mapDecision(rows[0]);
}

export async function listFeedbackForMilestone(
  milestoneId: string,
): Promise<Feedback[]> {
  const db = await getReadyDb();
  const rows = await db
    .select()
    .from(feedback)
    .where(eq(feedback.milestoneId, milestoneId))
    .orderBy(desc(feedback.createdAt));
  return rows.map(mapFeedback);
}

export type ProjectDetail = {
  project: Project;
  uncertainties: Uncertainty[];
  milestones: Milestone[];
};

export async function getProjectDetail(
  id: string,
): Promise<ProjectDetail | null> {
  const project = await getProject(id);
  if (!project) return null;
  const [u, m] = await Promise.all([
    listUncertaintiesForProject(id),
    listMilestonesForProject(id),
  ]);
  return { project, uncertainties: u, milestones: m };
}

export type MilestoneWorkspace = {
  milestone: Milestone;
  project: Project;
  uncertainty: Uncertainty | null;
  evidence: Evidence[];
  beliefUpdatesByEvidenceId: Record<string, BeliefUpdate>;
  decisions: Decision[];
  feedback: Feedback[];
};

export async function getMilestoneWorkspace(
  id: string,
): Promise<MilestoneWorkspace | null> {
  const milestone = await getMilestone(id);
  if (!milestone) return null;

  const project = await getProject(milestone.project_id);
  if (!project) return null;

  const uncertainty = milestone.uncertainty_id
    ? await getUncertainty(milestone.uncertainty_id)
    : null;

  const [ev, dec, fb, updates] = await Promise.all([
    listEvidenceForMilestone(id),
    listDecisionsForMilestone(id),
    listFeedbackForMilestone(id),
    listBeliefUpdatesForMilestone(id),
  ]);

  const beliefUpdatesByEvidenceId: Record<string, BeliefUpdate> = {};
  for (const u of updates) {
    beliefUpdatesByEvidenceId[u.evidence_id] = u;
  }

  return {
    milestone,
    project,
    uncertainty,
    evidence: ev,
    beliefUpdatesByEvidenceId,
    decisions: dec,
    feedback: fb,
  };
}
