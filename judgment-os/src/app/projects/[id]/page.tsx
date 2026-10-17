import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLatestDeadlineChangeEvent,
  getProjectDetail,
} from "@/lib/db/queries";
import type { DeadlineChangeAnalysis } from "@/lib/decision-engine";
import type { Sacrifice } from "@/lib/db/schema";
import {
  createMilestoneAction,
  createUncertaintyAction,
  updateProjectDeadlineAction,
} from "./actions";
import {
  proposeReplanAction,
  reviewPlanProposalAction,
} from "./replan-actions";
import { SacrificeSection } from "./sacrifice-section";
import { enumLabel, makeCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/locale.server";

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ deadline_updated?: string }>;
};

function importanceBar(importance: number): string {
  const blocks = Math.max(1, Math.round(importance / 10));
  return "█".repeat(blocks);
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const copy = makeCopy(locale);
  const sp = searchParams ? await searchParams : {};
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const { project, uncertainties, milestones } = detail;
  const planProposals = detail.planProposals;
  const pendingProposals = planProposals.filter((p) => p.status === "PENDING");
  const deadlineEvent = await getLatestDeadlineChangeEvent(id);
  const deadlineAnalysis = deadlineEvent?.payload?.analysis as
    | DeadlineChangeAnalysis
    | undefined;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs tracking-wide text-black/40 dark:text-white/40">
          <Link href="/projects" className="hover:underline">
            {copy("projectsTitle")}
          </Link>
          {" / "}
          {copy("detail")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {project.title}
        </h1>
        <p className="mt-3 text-sm">{project.goal}</p>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          {copy("successLine", { value: project.success_criteria || "—" })}
        </p>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {copy("constraintsLine", { value: project.constraints || "—" })}
        </p>
      </div>

      <SacrificeSection 
        projectId={project.id}
        projectGoal={project.goal}
        successCriteria={project.success_criteria}
        constraints={project.constraints}
        userDeadline={project.user_deadline}
        recommendedDeadline={project.recommended_deadline}
        sacrifices={(project.willing_sacrifices as Sacrifice[]) || []}
        sacrificesAcceptedAt={project.sacrifices_accepted_at}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("deadlines")}
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-black/40 dark:text-white/40">{copy("user")}</p>
            <p>{project.user_deadline ? toDateInputValue(project.user_deadline) : "—"}</p>
          </div>
          <div>
            <p className="text-black/40 dark:text-white/40">{copy("systemSuggestion")}</p>
            <p>
              {project.recommended_deadline
                ? toDateInputValue(project.recommended_deadline)
                : "—"}
            </p>
          </div>
        </div>
        <form
          action={updateProjectDeadlineAction}
          className="flex flex-wrap items-end gap-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <input type="hidden" name="project_id" value={project.id} />
          <label className="space-y-1">
            <span className="block text-xs text-black/50 dark:text-white/50">
              {copy("changeUserDeadline")}
            </span>
            <input
              name="user_deadline"
              type="date"
              defaultValue={toDateInputValue(project.user_deadline)}
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
            {copy("clearDeadlineHint")}
          </p>
        </form>
        {sp.deadline_updated === "1" || deadlineAnalysis ? (
          <div className="space-y-2 border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
            <p className="font-medium text-sm">{copy("timeEngine")}</p>
            {deadlineAnalysis ? (
              <>
                <p>{deadlineAnalysis.summary}</p>
                {deadlineAnalysis.benefitsOfCompression.length > 0 ? (
                  <div>
                    <p className="font-medium">{copy("compressionBenefits")}</p>
                    <ul className="list-disc pl-4">
                      {deadlineAnalysis.benefitsOfCompression.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {deadlineAnalysis.costs.length > 0 ? (
                  <div>
                    <p className="font-medium">{copy("costs")}</p>
                    <ul className="list-disc pl-4">
                      {deadlineAnalysis.costs.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p>
                  <span className="font-medium">{copy("informationLoss")}</span>
                  {deadlineAnalysis.expectedInformationLoss}
                </p>
                <p>
                  <span className="font-medium">{copy("decisionRisk")}</span>
                  {deadlineAnalysis.decisionRisk}
                </p>
                {deadlineAnalysis.recommendedTimelineDisadvantages.length >
                0 ? (
                  <div>
                    <p className="font-medium">{copy("longerTimelineDownsides")}</p>
                    <ul className="list-disc pl-4">
                      {deadlineAnalysis.recommendedTimelineDisadvantages.map(
                        (d, i) => (
                          <li key={i}>{d}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p>{copy("deadlineSavedNoAnalysis")}</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("keyUncertainties")}
        </h2>
        {uncertainties.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">{copy("noneYet")}</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {uncertainties.map((u, index) => (
              <li key={u.id}>
                <p>
                  {index + 1}. {importanceBar(u.importance)}{" "}
                  <span className="text-black/40 dark:text-white/40">
                    ({u.importance})
                  </span>
                </p>
                <p className="mt-1">{u.question}</p>
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  {copy("confidenceLine", {
                    confidence: u.current_confidence,
                    status: enumLabel(locale, "uncertainty", u.status),
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}

        <form
          action={createUncertaintyAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <p className="font-medium">{copy("addUncertainty")}</p>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            <span>{copy("question")}</span>
            <textarea
              name="question"
              required
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              placeholder={copy("questionPlaceholder")}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span>{copy("importanceRange")}</span>
              <input
                name="importance"
                type="number"
                min={0}
                max={100}
                defaultValue={70}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              <span>{copy("confidenceRange")}</span>
              <input
                name="current_confidence"
                type="number"
                min={0}
                max={100}
                defaultValue={20}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
          </div>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            {copy("addUncertainty")}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("milestones")}
        </h2>
        {milestones.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">{copy("noneYet")}</p>
        ) : (
          <ul className="space-y-4 text-sm">
            {milestones.map((m, index) => (
              <li
                key={m.id}
                className="border border-black/10 p-3 dark:border-white/10"
              >
                <Link
                  href={`/milestones/${m.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {index + 1}. {m.title}
                </Link>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {copy("milestoneStatusLine", {
                    status: enumLabel(locale, "milestone", m.status),
                    deadline: m.deadline
                      ? copy("milestoneDeadline", { date: toDateInputValue(m.deadline) })
                      : copy("milestoneNoDeadline"),
                  })}
                </p>
                <p className="mt-2 text-xs">
                  {copy("expectedLearningLine", { value: m.expected_learning || "—" })}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createMilestoneAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <p className="font-medium">{copy("createMilestone")}</p>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            <span>{copy("linkedUncertainty")}</span>
            <select
              name="uncertainty_id"
              required
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              defaultValue=""
            >
              <option value="" disabled>
                {uncertainties.length === 0
                  ? copy("addUncertaintyFirst")
                  : copy("chooseUncertainty")}
              </option>
              {uncertainties.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.question}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span>{copy("title")}</span>
            <input
              name="title"
              required
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("purpose")}</span>
            <textarea
              name="purpose"
              rows={2}
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("expectedLearning")}</span>
            <textarea
              name="expected_learning"
              rows={2}
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              placeholder={copy("whyMilestone")}
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("deadline")}</span>
            <input
              name="deadline"
              type="date"
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            disabled={uncertainties.length === 0}
            className="border border-black/30 px-3 py-1 disabled:opacity-40 dark:border-white/30"
          >
            {copy("createMilestone")}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("replan")}
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("replanLead")}
        </p>
        <form
          action={proposeReplanAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            {copy("triggerNote")}
            <input
              name="trigger_note"
              defaultValue={copy("triggerDefault")}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            {copy("requestReplan")}
          </button>
        </form>

        {pendingProposals.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {copy("noPendingProposals", {
              history:
                planProposals.length > 0
                  ? copy("proposalHistory", { n: planProposals.length })
                  : "",
            })}
          </p>
        ) : (
          <ul className="space-y-4">
            {pendingProposals.map((p) => (
              <li
                key={p.id}
                className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <p className="text-xs text-black/40 dark:text-white/40">
                  {copy("triggerMeta", { kind: p.trigger_kind, time: p.created_at.slice(0, 19) })}
                </p>
                <p>
                  <span className="font-medium">{copy("whatHappened")}</span>
                  {p.what_changed}
                </p>
                <p>
                  <span className="font-medium">{copy("whyNotOptimal")}</span>
                  {p.why_not_optimal}
                </p>
                <div>
                  <p className="font-medium">{copy("proposedChanges")}</p>
                  {p.proposed_changes.length === 0 ? (
                    <p className="text-xs">{copy("noConcreteChanges")}</p>
                  ) : (
                    <ul className="mt-1 list-disc pl-5 text-xs">
                      {p.proposed_changes.map((c, i) => (
                        <li key={i}>
                          [{c.type}] {c.title}
                          {c.detail ? ` — ${c.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs">
                  <span className="font-medium">{copy("expectedBenefit")}</span>
                  {p.expected_benefit}
                </p>
                <p className="text-xs">
                  <span className="font-medium">{copy("tradeoffRisk")}</span>
                  {p.tradeoff_risk}
                </p>
                <p className="text-xs">
                  <span className="font-medium">{copy("newUnknown")}</span>
                  {p.new_unknown}
                </p>
                <form
                  action={reviewPlanProposalAction}
                  className="space-y-2 border-t border-black/10 pt-2 dark:border-white/10"
                >
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="proposal_id" value={p.id} />
                  <label className="block space-y-1 text-xs">
                    {copy("yourNote")}
                    <input
                      name="user_note"
                      className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="ACCEPT"
                      className="border border-black/30 px-2 py-0.5 dark:border-white/30"
                    >
                      {copy("acceptAndApply")}
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="MODIFY"
                      className="border border-black/30 px-2 py-0.5 dark:border-white/30"
                    >
                      {copy("applyWithNote")}
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="REJECT"
                      className="border border-black/30 px-2 py-0.5 dark:border-white/30"
                    >
                      {copy("rejectKeepHistory")}
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
