"use server";

import { redirect } from "next/navigation";
import { analyzeEvidenceBeliefUpdate } from "@/lib/decision-engine";
import {
  createEvidence,
  getEvidence,
  getMilestone,
  getUncertainty,
  listBeliefUpdatesForUncertainty,
  reviewBeliefUpdate,
  saveBeliefUpdate,
  updateMilestoneDeadline,
} from "@/lib/db/queries";
import type { BeliefUpdateReviewStatus, Evidence } from "@/lib/db/types";

export async function updateMilestoneDeadlineAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const deadline = String(formData.get("deadline") ?? "");

  await updateMilestoneDeadline(milestone_id, deadline || null);
  redirect(`/milestones/${milestone_id}`);
}

export async function createEvidenceAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const claim = String(formData.get("claim") ?? "");
  const type = String(formData.get("type") ?? "FACT") as Evidence["type"];
  const source = String(formData.get("source") ?? "");
  const confidence = Number(formData.get("confidence") ?? 50);

  const created = await createEvidence({
    milestone_id,
    claim,
    type,
    source: source || null,
    confidence,
  });

  const milestone = await getMilestone(milestone_id);
  if (milestone?.uncertainty_id) {
    const uncertainty = await getUncertainty(milestone.uncertainty_id);
    if (uncertainty) {
      const priorUpdates = await listBeliefUpdatesForUncertainty(
        uncertainty.id,
      );

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

        await saveBeliefUpdate({
          evidence_id: created.id,
          uncertainty_id: uncertainty.id,
          milestone_id,
          analysis,
          prior_confidence: uncertainty.current_confidence,
        });
      } catch (err) {
        console.error("Belief update analysis failed:", err);
      }
    }
  }

  redirect(`/milestones/${milestone_id}`);
}

export async function reviewBeliefUpdateAction(formData: FormData) {
  const milestone_id = String(formData.get("milestone_id") ?? "");
  const belief_update_id = String(formData.get("belief_update_id") ?? "");
  const status = String(
    formData.get("status") ?? "UNREVIEWED",
  ) as BeliefUpdateReviewStatus;
  const user_correction = String(formData.get("user_correction") ?? "");
  const corrected_belief_update = String(
    formData.get("corrected_belief_update") ?? "",
  );
  const corrected_unknowns_raw = String(
    formData.get("corrected_remaining_unknowns") ?? "",
  );
  const corrected_confidence_raw = String(
    formData.get("corrected_suggested_confidence") ?? "",
  );

  const corrected_remaining_unknowns = corrected_unknowns_raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await reviewBeliefUpdate({
    belief_update_id,
    status,
    user_correction: user_correction || null,
    corrected_belief_update: corrected_belief_update || null,
    corrected_remaining_unknowns:
      status === "CORRECTED" ? corrected_remaining_unknowns : null,
    corrected_suggested_confidence:
      status === "CORRECTED" && corrected_confidence_raw !== ""
        ? Number(corrected_confidence_raw)
        : null,
  });

  redirect(`/milestones/${milestone_id}`);
}
