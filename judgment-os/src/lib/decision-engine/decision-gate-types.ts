/**
 * Decision Gate (Belief Update → Decision Point).
 * AI advises; human owns the choice.
 */

export type GateRecommendation =
  | "KEEP_RESEARCHING"
  | "MAKE_PROVISIONAL_DECISION"
  | "READY_TO_FREEZE";

export type DecisionGateOption = {
  id: string;
  label: string;
  description: string;
  bestEvidence: string[];
  contradictingEvidence: string[];
  assumptions: string[];
  benefits: string[];
  downsides: string[];
  importantUnknowns: string[];
};

export type AiDecisionRecommendation = {
  /** Null when recommending KEEP_RESEARCHING (no option to pick yet). */
  optionId: string | null;
  label: string | null;
  reasoning: string;
};

export type DecisionGateEvaluation = {
  /** What decision is currently blocked by this uncertainty? */
  blockedDecision: string;
  recommendation: GateRecommendation;
  /** Why this gate outcome — must be explicit and non-numeric-threshold based. */
  why: string;
  options: DecisionGateOption[];
  tradeoffs: string[];
  remainingUnknowns: string[];
  costOfWaiting: string;
  costOfBeingWrong: string;
  /** Expected value of gathering more information (qualitative). */
  valueOfMoreInfo: string;
  /** Reversible vs expensive to reverse. */
  reversibility: string;
  /** Would additional information realistically change the next action? */
  wouldInfoChangeAction: string;
  aiRecommendation: AiDecisionRecommendation;
};

export type DecisionHistoryEntry = {
  at: string;
  status: string;
  selected_option: {
    id: string;
    label: string;
    description?: string;
    bestEvidence?: string[];
  } | null;
  reasoning: string;
  gate_recommendation: GateRecommendation | null;
  gate_why: string;
  ai_recommendation: AiDecisionRecommendation | null;
  user_choice_note: string | null;
  evidence_at_time: unknown[];
  unknowns_at_time: unknown[];
};
