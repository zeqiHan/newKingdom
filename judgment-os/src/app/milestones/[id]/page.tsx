import Link from "next/link";
import { notFound } from "next/navigation";
import { getMilestoneWorkspace } from "@/lib/db/queries";
import type { BeliefUpdate, Decision } from "@/lib/db/types";
import {
  createEvidenceAction,
  reviewBeliefUpdateAction,
  updateMilestoneDeadlineAction,
} from "./actions";
import {
  confirmDecisionChoiceAction,
  reopenDecisionAction,
} from "./decision-actions";
import { DecisionGatePanel } from "./decision-gate-panel";
import {
  captureFeedbackAction,
  createExperimentAction,
} from "./reality-actions";
import { runWebResearchAction } from "./research-actions";
import { enumLabel, makeCopy, type Copy, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/locale.server";

export const dynamic = "force-dynamic";

type MilestonePageProps = {
  params: Promise<{ id: string }>;
};

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function BeliefUpdateBlock({
  update,
  milestoneId,
  copy,
  locale,
}: {
  update: BeliefUpdate;
  milestoneId: string;
  copy: Copy;
  locale: Locale;
}) {
  return (
    <div className="mt-3 space-y-2 border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
      <p className="font-medium text-sm">{copy("beliefProposal")}</p>
      <p>
        {copy("aiTypeLine", {
          type: enumLabel(locale, "evidenceType", update.evidence_type),
          strength: update.evidence_strength,
          support: enumLabel(locale, "support", update.supports_or_challenges),
        })}
      </p>
      <p>
        <span className="font-medium">{copy("beliefChange")}</span>
        {update.belief_update}
      </p>
      <div>
        <p className="font-medium">{copy("stillUnknown")}</p>
        <ul className="list-disc pl-4">
          {update.remaining_unknowns.map((u, i) => (
            <li key={i}>{u}</li>
          ))}
        </ul>
      </div>
      <p>
        <span className="font-medium">{copy("nextExperiment")}</span>
        {update.recommended_next_experiment}
      </p>
      <p className="text-black/50 dark:text-white/50">
        {copy("confidenceSuggest", {
          prior: update.prior_confidence,
          suggested: update.suggested_confidence,
          status: enumLabel(locale, "evidenceReview", update.user_review_status),
        })}
      </p>
      {update.user_correction ? (
        <p>
          <span className="font-medium">{copy("yourCorrection")}</span>
          {update.user_correction}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <form action={reviewBeliefUpdateAction}>
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="belief_update_id" value={update.id} />
          <input type="hidden" name="status" value="ACCEPTED" />
          <button
            type="submit"
            className="border border-black/30 px-2 py-0.5 dark:border-white/30"
          >
            {copy("accept")}
          </button>
        </form>
        <form action={reviewBeliefUpdateAction} className="flex flex-wrap gap-1">
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="belief_update_id" value={update.id} />
          <input type="hidden" name="status" value="CHALLENGED" />
          <input
            name="user_correction"
            placeholder={copy("challengeReason")}
            className="border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
          />
          <button
            type="submit"
            className="border border-black/30 px-2 py-0.5 dark:border-white/30"
          >
            {copy("challenge")}
          </button>
        </form>
      </div>

      <details className="pt-1">
        <summary className="cursor-pointer">{copy("correctAi")}</summary>
        <form action={reviewBeliefUpdateAction} className="mt-2 space-y-2">
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="belief_update_id" value={update.id} />
          <input type="hidden" name="status" value="CORRECTED" />
          <label className="block space-y-1">
            {copy("correctedBelief")}
            <textarea
              name="corrected_belief_update"
              rows={2}
              defaultValue={update.belief_update}
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            {copy("unknownsPerLine")}
            <textarea
              name="corrected_remaining_unknowns"
              rows={3}
              defaultValue={update.remaining_unknowns.join("\n")}
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            {copy("correctedConfidence")}
            <input
              name="corrected_suggested_confidence"
              type="number"
              min={0}
              max={100}
              defaultValue={update.suggested_confidence}
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            {copy("correctionNote")}
            <input
              name="user_correction"
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-2 py-0.5 dark:border-white/30"
          >
            {copy("saveCorrection")}
          </button>
        </form>
      </details>
    </div>
  );
}

function DecisionGateResult({
  decision,
  milestoneId,
  copy,
  locale,
}: {
  decision: Decision;
  milestoneId: string;
  copy: Copy;
  locale: Locale;
}) {
  const canChoose =
    decision.status === "OPEN" || decision.status === "REOPENED";
  const canReopen =
    decision.status === "PROVISIONAL" || decision.status === "FROZEN";
  const gate = decision.gate_recommendation;

  return (
    <div className="space-y-4 text-sm">
      {gate ? (
        <div className="space-y-2 border border-black/10 p-3 dark:border-white/10">
          <p className="font-medium">
            {copy("gateLine", { gate: enumLabel(locale, "gate", gate) })}
          </p>
          <p>
            <span className="font-medium">WHY：</span>
            {decision.gate_why || decision.reasoning}
          </p>
          {decision.blocked_decision ? (
            <p>
              <span className="font-medium">{copy("blockedDecision")}</span>
              {decision.blocked_decision}
            </p>
          ) : null}
          <p>
            <span className="font-medium">{copy("valueOfInfo")}</span>
            {decision.value_of_more_info || "—"}
          </p>
          <p>
            <span className="font-medium">{copy("costOfWaiting")}</span>
            {decision.cost_of_waiting || "—"}
          </p>
          <p>
            <span className="font-medium">{copy("costOfWrong")}</span>
            {decision.cost_of_being_wrong || "—"}
          </p>
          <p>
            <span className="font-medium">{copy("reversibility")}</span>
            {decision.reversibility || "—"}
          </p>
          <p>
            <span className="font-medium">{copy("wouldInfoChange")}</span>
            {decision.would_info_change_action || "—"}
          </p>
        </div>
      ) : null}

      <div>
        <p className="font-medium">{copy("currentOptions")}</p>
        <ul className="mt-2 space-y-3">
          {decision.options.map((opt) => {
            const selected = decision.selected_option?.id === opt.id;
            const aiPick = decision.ai_recommendation?.optionId === opt.id;
            return (
              <li
                key={opt.id}
                className="border border-black/10 p-3 dark:border-white/10"
              >
                <p>
                  {selected ? "→ " : ""}
                  <span className="font-medium">{opt.label}</span>
                  {selected ? copy("yourChoice") : ""}
                  {aiPick ? copy("aiPick") : ""}
                </p>
                {opt.description ? (
                  <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                    {opt.description}
                  </p>
                ) : null}
                {opt.bestEvidence && opt.bestEvidence.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("supportingEvidence")}</p>
                    <ul className="list-disc pl-4">
                      {opt.bestEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.contradictingEvidence &&
                opt.contradictingEvidence.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("contradictingEvidence")}</p>
                    <ul className="list-disc pl-4">
                      {opt.contradictingEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.assumptions && opt.assumptions.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("assumptions")}</p>
                    <ul className="list-disc pl-4">
                      {opt.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.benefits && opt.benefits.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("benefits")}</p>
                    <ul className="list-disc pl-4">
                      {opt.benefits.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.downsides && opt.downsides.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("downsides")}</p>
                    <ul className="list-disc pl-4">
                      {opt.downsides.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.importantUnknowns && opt.importantUnknowns.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">{copy("unknownForOption")}</p>
                    <ul className="list-disc pl-4">
                      {opt.importantUnknowns.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {decision.tradeoffs.length > 0 ? (
        <div>
          <p className="font-medium">{copy("keyTradeoffs")}</p>
          <ul className="mt-1 list-disc pl-5">
            {decision.tradeoffs.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.unknowns_at_time.length > 0 ? (
        <div>
          <p className="font-medium">{copy("stillUnknown")}</p>
          <ul className="mt-1 list-disc pl-5">
            {decision.unknowns_at_time.map((u, i) => (
              <li key={i}>{String(u)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.ai_recommendation ? (
        <div className="border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
          <p className="font-medium text-sm">{copy("aiRecommendation")}</p>
          <p className="mt-1">
            {decision.ai_recommendation.label
              ? copy("leanLabel", { label: decision.ai_recommendation.label })
              : copy("leanResearch")}
          </p>
          <p className="mt-1">{decision.ai_recommendation.reasoning}</p>
        </div>
      ) : null}

      <p className="text-xs text-black/40 dark:text-white/40">
        {copy("statusLine", {
          status: enumLabel(locale, "decision", decision.status),
          note: decision.user_choice_note
            ? copy("yourNoteInline", { note: decision.user_choice_note })
            : "",
        })}
      </p>

      {canChoose ? (
        <form
          action={confirmDecisionChoiceAction}
          className="space-y-2 border border-black/10 p-3 dark:border-white/10"
        >
          <p className="font-medium">{copy("youChoose")}</p>
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="decision_id" value={decision.id} />
          <label className="block space-y-1">
            {copy("option")}
            <select
              name="option_id"
              required
              defaultValue={decision.ai_recommendation?.optionId ?? ""}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="" disabled>
                {copy("chooseOne")}
              </option>
              {decision.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            {copy("decisionStrength")}
            <select
              name="status"
              defaultValue={
                gate === "READY_TO_FREEZE" ? "FROZEN" : "PROVISIONAL"
              }
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="PROVISIONAL">{copy("provisionalChoice")}</option>
              <option value="FROZEN">{copy("frozenChoice")}</option>
            </select>
          </label>
          <label className="block space-y-1">
            {copy("yourReasonOptional")}
            <textarea
              name="user_choice_note"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <p className="text-xs text-black/50 dark:text-white/50">
            {copy("youCanDecideAnyway")}
          </p>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            {copy("confirmChoice")}
          </button>
        </form>
      ) : null}

      {canReopen ? (
        <form action={reopenDecisionAction}>
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="decision_id" value={decision.id} />
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 text-sm dark:border-white/30"
          >
            {copy("reopenDecision")}
          </button>
        </form>
      ) : null}

      {decision.history.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs">
            {copy("historyVersions", { n: decision.history.length })}
          </summary>
          <ul className="mt-2 space-y-2 text-xs text-black/60 dark:text-white/60">
            {decision.history.map((h, i) => (
              <li
                key={i}
                className="border border-black/10 p-2 dark:border-white/10"
              >
                <p>
                  {h.at} · {enumLabel(locale, "decision", h.status)}
                  {h.selected_option
                    ? copy("historyPicked", { label: h.selected_option.label })
                    : ""}
                </p>
                <p className="mt-1">{h.reasoning}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export default async function MilestonePage({ params }: MilestonePageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const copy = makeCopy(locale);
  const workspace = await getMilestoneWorkspace(id);
  if (!workspace) notFound();

  const {
    milestone,
    project,
    uncertainty,
    evidence,
    beliefUpdatesByEvidenceId,
    decisions,
    experiments,
    feedback,
  } = workspace;
  const decision = decisions[0] ?? null;
  const experiment = experiments[0] ?? null;
  const lockedByActiveDecision = decisions.some(
    (d) => d.status === "PROVISIONAL" || d.status === "FROZEN",
  );
  const canStartExperiment =
    decision &&
    (decision.status === "PROVISIONAL" || decision.status === "FROZEN");

  const latestBelief = Object.values(beliefUpdatesByEvidenceId).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs tracking-wide text-black/40 dark:text-white/40">
          <Link href="/projects" className="hover:underline">
            {copy("projectsTitle")}
          </Link>
          {" / "}
          <Link href={`/projects/${project.id}`} className="hover:underline">
            {project.title}
          </Link>
          {" / "}
          {copy("milestoneCrumb")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {milestone.title}
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {milestone.purpose}
        </p>
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {copy("statusDeadline", {
            status: enumLabel(locale, "milestone", milestone.status),
            deadline: milestone.deadline
              ? copy("deadlineOn", { date: toDateInputValue(milestone.deadline) })
              : copy("deadlineEmpty"),
          })}
        </p>
        <form
          action={updateMilestoneDeadlineAction}
          className="mt-3 flex flex-wrap items-end gap-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <input type="hidden" name="milestone_id" value={milestone.id} />
          <label className="space-y-1">
            <span className="block text-xs text-black/50 dark:text-white/50">
              {copy("changeDeadline")}
            </span>
            <input
              name="deadline"
              type="date"
              defaultValue={toDateInputValue(milestone.deadline)}
              className="border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            {copy("save")}
          </button>
          <p className="w-full text-xs text-black/40 dark:text-white/40">
            {copy("clearDeadlineOnly")}
          </p>
        </form>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("uncertainty")}
        </h2>
        <p className="text-sm text-black/50 dark:text-white/50">
          {copy("whatWeWantToLearn")}
        </p>
        <p className="text-sm">
          {uncertainty?.question ?? copy("noLinkedUncertainty")}
        </p>
        <p className="text-xs text-black/40 dark:text-white/40">
          {copy("expectedAndConfidence", {
            learning: milestone.expected_learning || "—",
            confidence: uncertainty
              ? copy("currentConfidence", { n: uncertainty.current_confidence })
              : "",
          })}
        </p>
        {!uncertainty ? (
          <p className="text-xs text-black/50 dark:text-white/50">
            {copy("noUncertaintyNoBelief")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("knownEvidence")}
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("sourceIsNotFact")}
        </p>
        {evidence.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">{copy("noneYet")}</p>
        ) : (
          <ul className="space-y-4 text-sm">
            {evidence.map((item) => {
              const update = beliefUpdatesByEvidenceId[item.id];
              return (
                <li
                  key={item.id}
                  className="border border-black/10 p-3 dark:border-white/10"
                >
                  <p>
                    <span className="font-medium">
                      {enumLabel(locale, "evidenceType", item.type)}
                    </span>
                    {" · "}
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {enumLabel(locale, "evidenceReview", item.user_status)}
                      {copy("confidenceBits", { n: item.confidence })}
                    </span>
                  </p>
                  <p className="mt-1">{item.claim}</p>
                  {item.source ? (
                    <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                      {copy("sourceLine", { source: item.source })}
                    </p>
                  ) : null}
                  {update ? (
                    <BeliefUpdateBlock
                      update={update}
                      milestoneId={milestone.id}
                      copy={copy}
                      locale={locale}
                    />
                  ) : (
                    <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                      {copy("noBeliefYet")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form
          action={createEvidenceAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <p className="font-medium">{copy("addEvidence")}</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            {copy("evidenceHint")}
          </p>
          <input type="hidden" name="milestone_id" value={milestone.id} />
          <label className="block space-y-1">
            <span>{copy("claim")}</span>
            <textarea
              name="claim"
              required
              rows={3}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("type")}</span>
            <select
              name="type"
              defaultValue="FACT"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="FACT">{enumLabel(locale, "evidenceType", "FACT")}</option>
              <option value="ASSUMPTION">{enumLabel(locale, "evidenceType", "ASSUMPTION")}</option>
              <option value="INFERENCE">{enumLabel(locale, "evidenceType", "INFERENCE")}</option>
              <option value="OPINION">{enumLabel(locale, "evidenceType", "OPINION")}</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span>{copy("source")}</span>
            <input
              name="source"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("confidenceRange")}</span>
            <input
              name="confidence"
              type="number"
              min={0}
              max={100}
              defaultValue={50}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            {copy("saveEvidence")}
          </button>
        </form>

        {uncertainty ? (
          <form
            action={runWebResearchAction}
            className="space-y-2 border border-dashed border-black/20 p-3 text-sm dark:border-white/20"
          >
            <p className="font-medium">{copy("webResearch")}</p>
            <p className="text-xs text-black/50 dark:text-white/50">
              {copy("webResearchLead")}
            </p>
            <input type="hidden" name="milestone_id" value={milestone.id} />
            <label className="block space-y-1">
              {copy("researchQuestion")}
              <textarea
                name="research_question"
                required
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder={copy("researchPlaceholder")}
              />
            </label>
            <button
              type="submit"
              className="border border-black/30 px-3 py-1 dark:border-white/30"
            >
              {copy("runResearch")}
            </button>
          </form>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("unknowns")}
        </h2>
        {latestBelief && latestBelief.remaining_unknowns.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {latestBelief.remaining_unknowns.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        ) : decision && decision.unknowns_at_time.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {decision.unknowns_at_time.map((u, i) => (
              <li key={i}>{String(u)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">—</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("decisionGate")}
        </h2>
        <DecisionGatePanel
          milestoneId={milestone.id}
          hasUncertainty={Boolean(uncertainty)}
          lockedByActiveDecision={lockedByActiveDecision}
        />
        {!decision ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {copy("noDecisionYet")}
          </p>
        ) : (
          <DecisionGateResult
            decision={decision}
            milestoneId={milestone.id}
            copy={copy}
            locale={locale}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("actionExperiment")}
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("actionLead")}
        </p>
        {experiment ? (
          <div className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10">
            <p>
              <span className="font-medium">{copy("actionLabel")}</span>
              {experiment.action_text}
            </p>
            <p>
              <span className="font-medium">{copy("hypothesisLabel")}</span>
              {experiment.hypothesis || "—"}
            </p>
            <p>
              <span className="font-medium">{copy("expectedOutcomeLabel")}</span>
              {experiment.expected_outcome || "—"}
            </p>
            <p>
              <span className="font-medium">{copy("evidenceExpectedLabel")}</span>
              {experiment.evidence_expected || "—"}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40">
              {copy("experimentStatus", {
                status: enumLabel(locale, "experiment", experiment.status),
                deadline: experiment.deadline
                  ? copy("experimentDue", { date: toDateInputValue(experiment.deadline) })
                  : "",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            {copy("noExperiment")}
          </p>
        )}
        {canStartExperiment ? (
          <form
            action={createExperimentAction}
            className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
          >
            <p className="font-medium">{copy("recordExperiment")}</p>
            <input type="hidden" name="milestone_id" value={milestone.id} />
            <input
              type="hidden"
              name="decision_id"
              value={decision?.id ?? ""}
            />
            <label className="block space-y-1">
              {copy("actionDescription")}
              <textarea
                name="action_text"
                required
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder={copy("actionPlaceholder")}
              />
            </label>
            <label className="block space-y-1">
              {copy("hypothesis")}
              <textarea
                name="hypothesis"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              {copy("expectedOutcome")}
              <textarea
                name="expected_outcome"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder={copy("expectedOutcomePlaceholder")}
              />
            </label>
            <label className="block space-y-1">
              {copy("evidenceToCollect")}
              <textarea
                name="evidence_expected"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              {copy("deadlineOptional")}
              <input
                name="deadline"
                type="date"
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <button
              type="submit"
              className="border border-black/30 px-3 py-1 dark:border-white/30"
            >
              {copy("startExperiment")}
            </button>
          </form>
        ) : (
          <p className="text-xs text-black/50 dark:text-white/50">
            {copy("decideBeforeExperiment")}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("realityLearning")}
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("realityLead")}
        </p>
        {feedback[0] ? (
          <div className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10">
            <p>
              <span className="font-medium">{copy("expectedLabel")}</span>
              {feedback[0].expected_outcome}
            </p>
            <p>
              <span className="font-medium">{copy("actualLabel")}</span>
              {feedback[0].actual_outcome}
            </p>
            <p>
              <span className="font-medium">{copy("differenceLabel")}</span>
              {feedback[0].difference || "—"}
            </p>
            <p>
              <span className="font-medium">{copy("learningLabel")}</span>
              {feedback[0].learning}
            </p>
            {feedback[0].ai_analysis ? (
              <p className="text-xs">
                <span className="font-medium">{copy("aiAnalysis")}</span>
                {feedback[0].ai_analysis}
              </p>
            ) : null}
            <p className="text-xs text-black/40 dark:text-white/40">
              {copy("decisionImpact", {
                impact: feedback[0].decision_impact,
                reopen: feedback[0].suggest_reopen ? copy("suggestReopen") : "",
                before: feedback[0].confidence_before ?? "—",
                after: feedback[0].confidence_after ?? "—",
              })}
            </p>
            {feedback[0].assumptions_weakened.length > 0 ? (
              <div className="text-xs">
                <p className="font-medium">{copy("weakenedAssumptions")}</p>
                <ul className="list-disc pl-4">
                  {feedback[0].assumptions_weakened.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {feedback[0].new_uncertainties.length > 0 ? (
              <div className="text-xs">
                <p className="font-medium">{copy("newUncertainties")}</p>
                <ul className="list-disc pl-4">
                  {feedback[0].new_uncertainties.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {experiment && experiment.status !== "COMPLETED" ? (
          <form
            action={captureFeedbackAction}
            className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
          >
            <p className="font-medium">{copy("recordFeedback")}</p>
            <input type="hidden" name="milestone_id" value={milestone.id} />
            <input
              type="hidden"
              name="experiment_id"
              value={experiment.id}
            />
            <input
              type="hidden"
              name="decision_id"
              value={decision?.id ?? ""}
            />
            <label className="block space-y-1">
              {copy("expectedEditable")}
              <textarea
                name="expected_outcome"
                rows={2}
                defaultValue={experiment.expected_outcome}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              {copy("actualOutcome")}
              <textarea
                name="actual_outcome"
                required
                rows={3}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              {copy("yourLearning")}
              <textarea
                name="user_learning"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="reopen_decision" value="1" />
              {copy("reopenWithFeedback")}
            </label>
            <button
              type="submit"
              className="border border-black/30 px-3 py-1 dark:border-white/30"
            >
              {copy("saveFeedback")}
            </button>
          </form>
        ) : !feedback[0] ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {latestBelief?.recommended_next_experiment
              ? copy("suggestedExperiment", { text: latestBelief.recommended_next_experiment })
              : copy("recordRealityLater")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
