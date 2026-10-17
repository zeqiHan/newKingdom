/**
 * Decision Engine types for the Goal → Uncertainties → Milestones proposal slice.
 */

export type ProposedUncertainty = {
  /** Client-stable id for linking milestones before persistence. */
  tempId: string;
  question: string;
  importance: number;
};

export type ProposedMilestone = {
  tempId: string;
  /** Must reference a ProposedUncertainty.tempId */
  uncertaintyTempId: string;
  title: string;
  purpose: string;
  /** Required — why this milestone exists (learning, not task completion). */
  expectedLearning: string;
  /** YYYY-MM-DD. The first milestone is never later than today+3. */
  deadline: string;
};

export type GoalProposal = {
  rawGoal: string;
  title: string;
  clarifiedGoal: string;
  successCriteria: string;
  constraints: string;
  /** YYYY-MM-DD. Always set by the model path. */
  recommendedDeadline?: string;
  keyUncertainties: ProposedUncertainty[];
  suggestedMilestones: ProposedMilestone[];
};
