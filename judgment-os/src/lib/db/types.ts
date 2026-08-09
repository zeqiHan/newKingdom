/**
 * JudgmentOS domain types — mirrors db/schema.sql
 * No AI types yet.
 */

export type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type UncertaintyStatus = "OPEN" | "REDUCED" | "RESOLVED" | "ARCHIVED";

/** No DONE — endpoint is LEARNING_CAPTURED. */
export type MilestoneStatus =
  | "PROPOSED"
  | "RESEARCHING"
  | "READY_TO_DECIDE"
  | "DECIDED"
  | "ACTION_RUNNING"
  | "FEEDBACK_REQUIRED"
  | "LEARNING_CAPTURED"
  | "ARCHIVED";

export type EvidenceType = "FACT" | "ASSUMPTION" | "INFERENCE" | "OPINION";

export type EvidenceUserStatus =
  | "UNREVIEWED"
  | "ACCEPTED"
  | "CHALLENGED"
  | "CORRECTED";

export type SupportsOrChallenges =
  | "SUPPORTS"
  | "CHALLENGES"
  | "MIXED"
  | "NEUTRAL";

export type BeliefUpdateReviewStatus =
  | "UNREVIEWED"
  | "ACCEPTED"
  | "CHALLENGED"
  | "CORRECTED";

export type DecisionStatus = "OPEN" | "PROVISIONAL" | "FROZEN" | "REOPENED";

export type GateRecommendation =
  | "KEEP_RESEARCHING"
  | "MAKE_PROVISIONAL_DECISION"
  | "READY_TO_FREEZE";

export interface Project {
  id: string;
  title: string;
  goal: string;
  success_criteria: string;
  constraints: string;
  user_deadline: string | null;
  recommended_deadline: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Uncertainty {
  id: string;
  project_id: string;
  question: string;
  importance: number;
  current_confidence: number;
  status: UncertaintyStatus;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  uncertainty_id: string | null;
  title: string;
  purpose: string;
  expected_learning: string;
  status: MilestoneStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  milestone_id: string;
  claim: string;
  type: EvidenceType;
  source: string | null;
  confidence: number;
  user_status: EvidenceUserStatus;
  created_at: string;
  updated_at: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  bestEvidence?: string[];
}

export interface AiDecisionRecommendation {
  optionId: string | null;
  label: string | null;
  reasoning: string;
}

export interface DecisionHistoryEntry {
  at: string;
  status: DecisionStatus;
  selected_option: DecisionOption | null;
  reasoning: string;
  gate_recommendation: GateRecommendation | null;
  gate_why: string;
  ai_recommendation: AiDecisionRecommendation | null;
  user_choice_note: string | null;
  evidence_at_time: unknown[];
  unknowns_at_time: unknown[];
}

export interface Decision {
  id: string;
  project_id: string;
  milestone_id: string;
  uncertainty_id: string | null;
  question: string;
  options: DecisionOption[];
  selected_option: DecisionOption | null;
  reasoning: string;
  confidence: number;
  status: DecisionStatus;
  evidence_at_time: unknown[];
  unknowns_at_time: unknown[];
  confidence_at_time: number | null;
  deadline_at_time: string | null;
  gate_recommendation: GateRecommendation | null;
  gate_why: string;
  blocked_decision: string;
  tradeoffs: string[];
  cost_of_waiting: string;
  cost_of_being_wrong: string;
  value_of_more_info: string;
  reversibility: string;
  would_info_change_action: string;
  ai_recommendation: AiDecisionRecommendation | null;
  user_choice_note: string | null;
  history: DecisionHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  milestone_id: string;
  decision_id: string | null;
  expected_outcome: string;
  actual_outcome: string;
  learning: string;
  confidence_before: number | null;
  confidence_after: number | null;
  created_at: string;
}

export interface BeliefUpdate {
  id: string;
  evidence_id: string;
  uncertainty_id: string;
  milestone_id: string;
  evidence_type: EvidenceType;
  evidence_strength: number;
  supports_or_challenges: SupportsOrChallenges;
  belief_update: string;
  remaining_unknowns: string[];
  recommended_next_experiment: string;
  prior_confidence: number;
  suggested_confidence: number;
  user_review_status: BeliefUpdateReviewStatus;
  user_correction: string | null;
  created_at: string;
  updated_at: string;
}

/** Milestone state transitions for the Decision Engine (not wired yet). */
export const MILESTONE_FLOW: MilestoneStatus[] = [
  "PROPOSED",
  "RESEARCHING",
  "READY_TO_DECIDE",
  "DECIDED",
  "ACTION_RUNNING",
  "FEEDBACK_REQUIRED",
  "LEARNING_CAPTURED",
];
