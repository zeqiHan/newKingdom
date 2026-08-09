/**
 * Belief update produced by Decision Engine after new evidence.
 * Persisted for cumulative uncertainty updates. AI proposes; human reviews.
 */

export type SupportsOrChallenges =
  | "SUPPORTS"
  | "CHALLENGES"
  | "MIXED"
  | "NEUTRAL";

export type BeliefUpdateAnalysis = {
  evidenceType: "FACT" | "ASSUMPTION" | "INFERENCE" | "OPINION";
  evidenceStrength: number;
  supportsOrChallenges: SupportsOrChallenges;
  beliefUpdate: string;
  remainingUnknowns: string[];
  recommendedNextExperiment: string;
  suggestedConfidence: number;
};

export type BeliefUpdatePrior = {
  evidenceClaim: string;
  evidenceType: string;
  supportsOrChallenges: string;
  beliefUpdate: string;
  remainingUnknowns: string[];
  suggestedConfidence: number;
  userReviewStatus: string;
  userCorrection: string | null;
};
