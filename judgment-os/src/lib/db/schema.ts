import { randomUUID } from "crypto";
import { relations, sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Postgres / Supabase schema (aligned with db/schema.sql).
 * Status fields stored as text for simpler inserts; DB may use enums.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
};

export const projects = pgTable("projects", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  goal: text("goal").notNull().default(""),
  successCriteria: text("success_criteria").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  userDeadline: timestamp("user_deadline", {
    withTimezone: true,
    mode: "string",
  }),
  recommendedDeadline: timestamp("recommended_deadline", {
    withTimezone: true,
    mode: "string",
  }),
  status: text("status").notNull().default("ACTIVE"),
  ...timestamps,
});

export const uncertainties = pgTable("uncertainties", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  importance: integer("importance").notNull().default(0),
  currentConfidence: integer("current_confidence").notNull().default(0),
  status: text("status").notNull().default("OPEN"),
  ...timestamps,
});

export const milestones = pgTable("milestones", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  uncertaintyId: uuid("uncertainty_id").references(() => uncertainties.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  purpose: text("purpose").notNull().default(""),
  expectedLearning: text("expected_learning").notNull().default(""),
  status: text("status").notNull().default("PROPOSED"),
  deadline: timestamp("deadline", { withTimezone: true, mode: "string" }),
  ...timestamps,
});

export const evidence = pgTable("evidence", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  claim: text("claim").notNull(),
  type: text("type").notNull(),
  source: text("source"),
  confidence: integer("confidence").notNull().default(0),
  userStatus: text("user_status").notNull().default("UNREVIEWED"),
  ...timestamps,
});

export const beliefUpdates = pgTable("belief_updates", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  evidenceId: uuid("evidence_id")
    .notNull()
    .references(() => evidence.id, { onDelete: "cascade" }),
  uncertaintyId: uuid("uncertainty_id")
    .notNull()
    .references(() => uncertainties.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  evidenceType: text("evidence_type").notNull(),
  evidenceStrength: integer("evidence_strength").notNull().default(0),
  supportsOrChallenges: text("supports_or_challenges").notNull(),
  beliefUpdate: text("belief_update").notNull().default(""),
  remainingUnknowns: jsonb("remaining_unknowns")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  recommendedNextExperiment: text("recommended_next_experiment")
    .notNull()
    .default(""),
  priorConfidence: integer("prior_confidence").notNull().default(0),
  suggestedConfidence: integer("suggested_confidence").notNull().default(0),
  userReviewStatus: text("user_review_status").notNull().default("UNREVIEWED"),
  userCorrection: text("user_correction"),
  ...timestamps,
});

export const decisions = pgTable("decisions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  uncertaintyId: uuid("uncertainty_id").references(() => uncertainties.id, {
    onDelete: "set null",
  }),
  question: text("question").notNull(),
  options: jsonb("options")
    .$type<
      {
        id: string;
        label: string;
        description?: string;
        bestEvidence?: string[];
      }[]
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  selectedOption: jsonb("selected_option").$type<{
    id: string;
    label: string;
    description?: string;
    bestEvidence?: string[];
  } | null>(),
  reasoning: text("reasoning").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  status: text("status").notNull().default("OPEN"),
  evidenceAtTime: jsonb("evidence_at_time")
    .$type<unknown[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  unknownsAtTime: jsonb("unknowns_at_time")
    .$type<unknown[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  confidenceAtTime: integer("confidence_at_time"),
  deadlineAtTime: timestamp("deadline_at_time", {
    withTimezone: true,
    mode: "string",
  }),
  /** Decision Gate fields */
  gateRecommendation: text("gate_recommendation"),
  gateWhy: text("gate_why").notNull().default(""),
  blockedDecision: text("blocked_decision").notNull().default(""),
  tradeoffs: jsonb("tradeoffs")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  costOfWaiting: text("cost_of_waiting").notNull().default(""),
  costOfBeingWrong: text("cost_of_being_wrong").notNull().default(""),
  valueOfMoreInfo: text("value_of_more_info").notNull().default(""),
  reversibility: text("reversibility").notNull().default(""),
  wouldInfoChangeAction: text("would_info_change_action")
    .notNull()
    .default(""),
  aiRecommendation: jsonb("ai_recommendation").$type<{
    optionId: string | null;
    label: string | null;
    reasoning: string;
  } | null>(),
  userChoiceNote: text("user_choice_note"),
  history: jsonb("history")
    .$type<unknown[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  ...timestamps,
});

export const feedback = pgTable("feedback", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  milestoneId: uuid("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  decisionId: uuid("decision_id").references(() => decisions.id, {
    onDelete: "set null",
  }),
  expectedOutcome: text("expected_outcome").notNull().default(""),
  actualOutcome: text("actual_outcome").notNull().default(""),
  learning: text("learning").notNull().default(""),
  confidenceBefore: integer("confidence_before"),
  confidenceAfter: integer("confidence_after"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  uncertainties: many(uncertainties),
  milestones: many(milestones),
  decisions: many(decisions),
}));

export const uncertaintiesRelations = relations(
  uncertainties,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [uncertainties.projectId],
      references: [projects.id],
    }),
    milestones: many(milestones),
    beliefUpdates: many(beliefUpdates),
  }),
);

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  uncertainty: one(uncertainties, {
    fields: [milestones.uncertaintyId],
    references: [uncertainties.id],
  }),
  evidence: many(evidence),
  decisions: many(decisions),
  feedback: many(feedback),
  beliefUpdates: many(beliefUpdates),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  milestone: one(milestones, {
    fields: [evidence.milestoneId],
    references: [milestones.id],
  }),
  beliefUpdate: one(beliefUpdates, {
    fields: [evidence.id],
    references: [beliefUpdates.evidenceId],
  }),
}));

export const beliefUpdatesRelations = relations(beliefUpdates, ({ one }) => ({
  evidence: one(evidence, {
    fields: [beliefUpdates.evidenceId],
    references: [evidence.id],
  }),
  uncertainty: one(uncertainties, {
    fields: [beliefUpdates.uncertaintyId],
    references: [uncertainties.id],
  }),
  milestone: one(milestones, {
    fields: [beliefUpdates.milestoneId],
    references: [milestones.id],
  }),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  project: one(projects, {
    fields: [decisions.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [decisions.milestoneId],
    references: [milestones.id],
  }),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  milestone: one(milestones, {
    fields: [feedback.milestoneId],
    references: [milestones.id],
  }),
  decision: one(decisions, {
    fields: [feedback.decisionId],
    references: [decisions.id],
  }),
}));
