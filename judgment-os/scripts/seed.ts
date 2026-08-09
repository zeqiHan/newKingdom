/**
 * Seed one manually authored project that travels the full data model.
 * No AI — fixed IDs so screens are stable for local demo.
 *
 * Run: npm run db:seed
 */
import { eq } from "drizzle-orm";
import { getReadyDb } from "../src/lib/db/client";
import {
  decisions,
  evidence,
  feedback,
  milestones,
  projects,
  uncertainties,
} from "../src/lib/db/schema";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const U1_ID = "22222222-2222-2222-2222-222222222221";
const U2_ID = "22222222-2222-2222-2222-222222222222";
const M1_ID = "33333333-3333-3333-3333-333333333331";
const M2_ID = "33333333-3333-3333-3333-333333333332";
const E1_ID = "44444444-4444-4444-4444-444444444441";
const E2_ID = "44444444-4444-4444-4444-444444444442";
const E3_ID = "44444444-4444-4444-4444-444444444443";
const D1_ID = "55555555-5555-5555-5555-555555555551";
const F1_ID = "66666666-6666-6666-6666-666666666661";

async function seed() {
  const db = await getReadyDb();

  // Clear related rows for idempotent re-seed of this project only.
  await db.delete(feedback).where(eq(feedback.milestoneId, M1_ID));
  await db.delete(feedback).where(eq(feedback.milestoneId, M2_ID));
  await db.delete(decisions).where(eq(decisions.projectId, PROJECT_ID));
  await db.delete(evidence).where(eq(evidence.milestoneId, M1_ID));
  await db.delete(evidence).where(eq(evidence.milestoneId, M2_ID));
  await db.delete(milestones).where(eq(milestones.projectId, PROJECT_ID));
  await db.delete(uncertainties).where(eq(uncertainties.projectId, PROJECT_ID));
  await db.delete(projects).where(eq(projects.id, PROJECT_ID));

  await db.insert(projects).values({
    id: PROJECT_ID,
    title: "JudgmentOS MVP — Dogfood",
    goal: "In two weeks, ship a JudgmentOS MVP that I myself use on one real project.",
    successCriteria:
      "One full loop runs: goal → uncertainties → milestones → evidence → decision → feedback.",
    constraints: "No AI features in v0 chassis. Local DB only. Three screens max.",
    userDeadline: "2026-08-22",
    recommendedDeadline: "2026-08-26",
    status: "ACTIVE",
  });

  await db.insert(uncertainties).values([
    {
      id: U1_ID,
      projectId: PROJECT_ID,
      question:
        "Is the real user pain Decision Management, or just another productivity tool?",
      importance: 95,
      currentConfidence: 40,
      status: "OPEN",
    },
    {
      id: U2_ID,
      projectId: PROJECT_ID,
      question:
        "Can a non-AI chassis carry the Judgment loop far enough to learn from reality?",
      importance: 80,
      currentConfidence: 55,
      status: "OPEN",
    },
  ]);

  await db.insert(milestones).values([
    {
      id: M1_ID,
      projectId: PROJECT_ID,
      uncertaintyId: U1_ID,
      title: "Dogfood JudgmentOS on one real project for 7 days",
      purpose: "Reduce uncertainty about whether decision points are the real bottleneck.",
      expectedLearning:
        "Whether blockers show up at decision points (vs task execution).",
      status: "LEARNING_CAPTURED",
      deadline: "2026-08-15",
    },
    {
      id: M2_ID,
      projectId: PROJECT_ID,
      uncertaintyId: U2_ID,
      title: "Wire DB + three screens with one seeded project",
      purpose: "Prove the software structure can hold Project→Feedback without AI.",
      expectedLearning:
        "Whether the chassis can surface uncertainties, milestones, evidence, decisions, and feedback.",
      status: "ACTION_RUNNING",
      deadline: "2026-08-10",
    },
  ]);

  await db.insert(evidence).values([
    {
      id: E1_ID,
      milestoneId: M1_ID,
      claim:
        "During dogfooding, two of three stalls happened before choosing a direction, not while executing tasks.",
      type: "FACT",
      source: "Personal project log, 2026-08-07",
      confidence: 70,
      userStatus: "ACCEPTED",
    },
    {
      id: E2_ID,
      milestoneId: M1_ID,
      claim:
        "Users will prefer JudgmentOS over Notion/Todo apps once they see tradeoffs.",
      type: "ASSUMPTION",
      source: "Founder hypothesis",
      confidence: 35,
      userStatus: "CHALLENGED",
    },
    {
      id: E3_ID,
      milestoneId: M1_ID,
      claim:
        "If stalls cluster at decision points, Decision Management is the product, not task tracking.",
      type: "INFERENCE",
      source: "Derived from E1",
      confidence: 60,
      userStatus: "ACCEPTED",
    },
  ]);

  const optionA = {
    id: "opt-a",
    label: "Continue as Decision Management product",
    description: "Keep Judgment loop as the core; ignore todo-feature pressure.",
  };
  const optionB = {
    id: "opt-b",
    label: "Pivot toward general productivity",
    description: "Add tasks/calendar; soften judgment framing.",
  };

  await db.insert(decisions).values({
    id: D1_ID,
    projectId: PROJECT_ID,
    milestoneId: M1_ID,
    question: "What product category should JudgmentOS commit to for MVP?",
    options: [optionA, optionB],
    selectedOption: optionA,
    reasoning:
      "Dogfood stalls clustered at decision points. Category should match the observed pain, not a broader productivity surface.",
    confidence: 65,
    status: "PROVISIONAL",
    evidenceAtTime: [
      { id: E1_ID, type: "FACT" },
      { id: E3_ID, type: "INFERENCE" },
    ],
    unknownsAtTime: [
      "Willingness to pay still untested.",
      "Whether strangers hit the same decision stalls.",
    ],
    confidenceAtTime: 65,
    deadlineAtTime: "2026-08-15",
  });

  await db.insert(feedback).values({
    id: F1_ID,
    milestoneId: M1_ID,
    decisionId: D1_ID,
    expectedOutcome:
      "Treating the product as Decision Management keeps the next week focused on the Judgment loop.",
    actualOutcome:
      "Focus held. Chassis work prioritized over AI features. One full data loop is now being wired.",
    learning:
      "Judgment wrong would still be useful — we would have learned the pain was elsewhere. Here the provisional decision survived first contact with reality.",
    confidenceBefore: 40,
    confidenceAfter: 65,
  });

  console.log("Seeded project:");
  console.log(`  /projects`);
  console.log(`  /projects/${PROJECT_ID}`);
  console.log(`  /milestones/${M1_ID}`);
  console.log(`  /milestones/${M2_ID}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
