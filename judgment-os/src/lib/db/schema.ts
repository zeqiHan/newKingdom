import { randomUUID } from "crypto";
import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Local chassis schema (SQLite / libsql).
 * Canonical Postgres shape lives in db/schema.sql — keep fields aligned.
 */

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  title: text("title").notNull(),
  goal: text("goal").notNull().default(""),
  successCriteria: text("success_criteria").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  userDeadline: text("user_deadline"),
  recommendedDeadline: text("recommended_deadline"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const uncertainties = sqliteTable("uncertainties", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  importance: integer("importance").notNull().default(0),
  currentConfidence: integer("current_confidence").notNull().default(0),
  status: text("status").notNull().default("OPEN"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const milestones = sqliteTable("milestones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  uncertaintyId: text("uncertainty_id").references(() => uncertainties.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  purpose: text("purpose").notNull().default(""),
  expectedLearning: text("expected_learning").notNull().default(""),
  status: text("status").notNull().default("PROPOSED"),
  deadline: text("deadline"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const evidence = sqliteTable("evidence", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  claim: text("claim").notNull(),
  type: text("type").notNull(),
  source: text("source"),
  confidence: integer("confidence").notNull().default(0),
  userStatus: text("user_status").notNull().default("UNREVIEWED"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * AI belief update for one evidence item, cumulative on an uncertainty.
 * AI proposes; human can accept / challenge / correct.
 */
export const beliefUpdates = sqliteTable("belief_updates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  evidenceId: text("evidence_id")
    .notNull()
    .references(() => evidence.id, { onDelete: "cascade" }),
  uncertaintyId: text("uncertainty_id")
    .notNull()
    .references(() => uncertainties.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  evidenceType: text("evidence_type").notNull(),
  evidenceStrength: integer("evidence_strength").notNull().default(0),
  supportsOrChallenges: text("supports_or_challenges").notNull(),
  beliefUpdate: text("belief_update").notNull().default(""),
  remainingUnknowns: text("remaining_unknowns", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  recommendedNextExperiment: text("recommended_next_experiment")
    .notNull()
    .default(""),
  priorConfidence: integer("prior_confidence").notNull().default(0),
  suggestedConfidence: integer("suggested_confidence").notNull().default(0),
  userReviewStatus: text("user_review_status").notNull().default("UNREVIEWED"),
  userCorrection: text("user_correction"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const decisions = sqliteTable("decisions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: text("options", { mode: "json" })
    .$type<{ id: string; label: string; description?: string }[]>()
    .notNull()
    .default([]),
  selectedOption: text("selected_option", { mode: "json" }).$type<{
    id: string;
    label: string;
    description?: string;
  } | null>(),
  reasoning: text("reasoning").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  status: text("status").notNull().default("OPEN"),
  evidenceAtTime: text("evidence_at_time", { mode: "json" })
    .$type<unknown[]>()
    .notNull()
    .default([]),
  unknownsAtTime: text("unknowns_at_time", { mode: "json" })
    .$type<unknown[]>()
    .notNull()
    .default([]),
  confidenceAtTime: integer("confidence_at_time"),
  deadlineAtTime: text("deadline_at_time"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const feedback = sqliteTable("feedback", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  milestoneId: text("milestone_id")
    .notNull()
    .references(() => milestones.id, { onDelete: "cascade" }),
  decisionId: text("decision_id").references(() => decisions.id, {
    onDelete: "set null",
  }),
  expectedOutcome: text("expected_outcome").notNull().default(""),
  actualOutcome: text("actual_outcome").notNull().default(""),
  learning: text("learning").notNull().default(""),
  confidenceBefore: integer("confidence_before"),
  confidenceAfter: integer("confidence_after"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
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
