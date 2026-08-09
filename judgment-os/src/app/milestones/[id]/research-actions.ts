"use server";

import { redirect } from "next/navigation";
import {
  analyzeEvidenceBeliefUpdate,
  runWebResearch,
} from "@/lib/decision-engine";
import {
  createEvidence,
  getEvidence,
  getMilestoneWorkspace,
  listBeliefUpdatesForUncertainty,
  recordJudgmentEvent,
  saveBeliefUpdate,
} from "@/lib/db/queries";

/**
 * Feature 11: Research Question → Search → Claims → Evidence (+ belief update).
 * Sources preserved; source said ≠ truth.
 */
export async function runWebResearchAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const research_question = String(formData.get("research_question") ?? "");

  const workspace = await getMilestoneWorkspace(milestone_id);
  if (!workspace?.uncertainty) {
    redirect(`/milestones/${milestone_id}`);
  }

  const { milestone, project, uncertainty } = workspace;

  let bundle;
  try {
    bundle = await runWebResearch({
      researchQuestion: research_question,
      uncertaintyQuestion: uncertainty.question,
      milestoneTitle: milestone.title,
    });
  } catch (err) {
    console.error("Web research failed:", err);
    redirect(`/milestones/${milestone_id}?research_error=1`);
  }

  const priorUpdates = await listBeliefUpdatesForUncertainty(uncertainty.id);

  for (const claim of bundle.claims) {
    const created = await createEvidence({
      milestone_id,
      claim: `${claim.claim}\n\n[来源所说] ${claim.sourceSaid}${claim.notes ? `\n[注] ${claim.notes}` : ""}`,
      type: claim.evidenceType,
      source: `${claim.sourceTitle} | ${claim.sourceUrl}`,
      confidence: claim.evidenceStrength,
    });

    try {
      const priorBeliefUpdates = await Promise.all(
        priorUpdates.map(async (u) => {
          const ev = await getEvidence(u.evidence_id);
          return {
            evidenceClaim: ev?.claim ?? "(历史证据)",
            evidenceType: u.evidence_type,
            supportsOrChallenges: u.supports_or_challenges,
            beliefUpdate: u.belief_update,
            remainingUnknowns: u.remaining_unknowns,
            suggestedConfidence: u.suggested_confidence,
            userReviewStatus: u.user_review_status,
            userCorrection: u.user_correction,
          };
        }),
      );

      const analysis = await analyzeEvidenceBeliefUpdate({
        uncertaintyQuestion: uncertainty.question,
        priorConfidence: uncertainty.current_confidence,
        milestoneTitle: milestone.title,
        milestoneExpectedLearning: milestone.expected_learning,
        newEvidence: {
          claim: created.claim,
          userDeclaredType: created.type,
          source: created.source,
          userConfidence: created.confidence,
        },
        priorBeliefUpdates,
      });

      const saved = await saveBeliefUpdate({
        evidence_id: created.id,
        uncertainty_id: uncertainty.id,
        milestone_id,
        analysis,
        prior_confidence: uncertainty.current_confidence,
      });
      priorUpdates.unshift(saved);
    } catch (err) {
      console.error("Belief update after research failed:", err);
    }
  }

  await recordJudgmentEvent({
    project_id: project.id,
    milestone_id,
    uncertainty_id: uncertainty.id,
    event_type: "EVIDENCE_ADDED",
    payload: {
      via: "web_research",
      research_question: bundle.researchQuestion,
      keywords: bundle.keywords,
      claim_count: bundle.claims.length,
      provider: bundle.provider,
      combined_answer: bundle.combinedAnswer,
    },
  });

  redirect(`/milestones/${milestone_id}`);
}
