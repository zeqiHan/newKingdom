import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLatestDeadlineChangeEvent,
  getProjectDetail,
} from "@/lib/db/queries";
import type { DeadlineChangeAnalysis } from "@/lib/decision-engine";
import {
  createMilestoneAction,
  createUncertaintyAction,
  updateProjectDeadlineAction,
} from "./actions";
import {
  proposeReplanAction,
  reviewPlanProposalAction,
} from "./replan-actions";

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

const MILESTONE_STATUS: Record<string, string> = {
  PROPOSED: "已提出",
  RESEARCHING: "调研中",
  READY_TO_DECIDE: "可决策",
  DECIDED: "已决策",
  ACTION_RUNNING: "行动中",
  FEEDBACK_REQUIRED: "待反馈",
  LEARNING_CAPTURED: "已捕获学习",
  ARCHIVED: "已归档",
};

const UNCERTAINTY_STATUS: Record<string, string> = {
  OPEN: "开放",
  REDUCED: "已降低",
  RESOLVED: "已解决",
  ARCHIVED: "已归档",
};

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id } = await params;
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
            项目
          </Link>
          {" / "}
          详情
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {project.title}
        </h1>
        <p className="mt-3 text-sm">{project.goal}</p>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          成功标准：{project.success_criteria || "—"}
        </p>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          约束条件：{project.constraints || "—"}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          截止日期
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-black/40 dark:text-white/40">用户</p>
            <p>{project.user_deadline ? toDateInputValue(project.user_deadline) : "—"}</p>
          </div>
          <div>
            <p className="text-black/40 dark:text-white/40">系统建议</p>
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
              修改用户截止日期
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
            保存
          </button>
          <p className="w-full text-xs text-black/40 dark:text-white/40">
            清空日期后保存即可移除截止日期。保存时系统会分析压缩/改期的利弊（不替你决定）。
          </p>
        </form>
        {sp.deadline_updated === "1" || deadlineAnalysis ? (
          <div className="space-y-2 border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
            <p className="font-medium text-sm">时间引擎分析</p>
            {deadlineAnalysis ? (
              <>
                <p>{deadlineAnalysis.summary}</p>
                {deadlineAnalysis.benefitsOfCompression.length > 0 ? (
                  <div>
                    <p className="font-medium">压缩收益：</p>
                    <ul className="list-disc pl-4">
                      {deadlineAnalysis.benefitsOfCompression.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {deadlineAnalysis.costs.length > 0 ? (
                  <div>
                    <p className="font-medium">代价：</p>
                    <ul className="list-disc pl-4">
                      {deadlineAnalysis.costs.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p>
                  <span className="font-medium">信息损失：</span>
                  {deadlineAnalysis.expectedInformationLoss}
                </p>
                <p>
                  <span className="font-medium">决策风险：</span>
                  {deadlineAnalysis.decisionRisk}
                </p>
                {deadlineAnalysis.recommendedTimelineDisadvantages.length >
                0 ? (
                  <div>
                    <p className="font-medium">更长建议时间线的劣势：</p>
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
              <p>已保存截止日期变更（分析暂不可用）。</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          关键不确定性
        </h2>
        {uncertainties.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">暂无。</p>
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
                  信心 {u.current_confidence} ·{" "}
                  {UNCERTAINTY_STATUS[u.status] ?? u.status}
                </p>
              </li>
            ))}
          </ol>
        )}

        <form
          action={createUncertaintyAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <p className="font-medium">添加不确定性</p>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            <span>问题</span>
            <textarea
              name="question"
              required
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              placeholder="什么必须为真？我们现在不知道什么？"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span>重要性（0–100）</span>
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
              <span>信心（0–100）</span>
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
            添加不确定性
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          里程碑
        </h2>
        {milestones.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">暂无。</p>
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
                  状态：{MILESTONE_STATUS[m.status] ?? m.status}
                  {m.deadline
                    ? ` · 截止 ${toDateInputValue(m.deadline)}`
                    : " · 截止 —"}
                </p>
                <p className="mt-2 text-xs">
                  预期学习：{m.expected_learning || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form
          action={createMilestoneAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <p className="font-medium">创建里程碑</p>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            <span>关联不确定性</span>
            <select
              name="uncertainty_id"
              required
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              defaultValue=""
            >
              <option value="" disabled>
                {uncertainties.length === 0
                  ? "请先添加不确定性"
                  : "选择不确定性"}
              </option>
              {uncertainties.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.question}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span>标题</span>
            <input
              name="title"
              required
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>目的</span>
            <textarea
              name="purpose"
              rows={2}
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>预期学习</span>
            <textarea
              name="expected_learning"
              rows={2}
              disabled={uncertainties.length === 0}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              placeholder="为什么这个里程碑值得存在？"
            />
          </label>
          <label className="block space-y-1">
            <span>截止日期</span>
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
            创建里程碑
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          动态重规划
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          AI 可提案增删改里程碑/不确定性或重开决策；必须由你接受、修改说明或拒绝。不会静默改写计划。
        </p>
        <form
          action={proposeReplanAction}
          className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block space-y-1">
            触发说明
            <input
              name="trigger_note"
              defaultValue="手动请求评估当前计划是否仍最优"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            请求 AI 重规划提案
          </button>
        </form>

        {pendingProposals.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            暂无待审提案
            {planProposals.length > 0
              ? `（历史 ${planProposals.length} 条）`
              : ""}
            。
          </p>
        ) : (
          <ul className="space-y-4">
            {pendingProposals.map((p) => (
              <li
                key={p.id}
                className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <p className="text-xs text-black/40 dark:text-white/40">
                  触发：{p.trigger_kind} · {p.created_at.slice(0, 19)}
                </p>
                <p>
                  <span className="font-medium">发生了什么：</span>
                  {p.what_changed}
                </p>
                <p>
                  <span className="font-medium">为何可能不再最优：</span>
                  {p.why_not_optimal}
                </p>
                <div>
                  <p className="font-medium">提案改动：</p>
                  {p.proposed_changes.length === 0 ? (
                    <p className="text-xs">（无具体改动 — 可能建议维持原计划）</p>
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
                  <span className="font-medium">预期收益：</span>
                  {p.expected_benefit}
                </p>
                <p className="text-xs">
                  <span className="font-medium">代价/风险：</span>
                  {p.tradeoff_risk}
                </p>
                <p className="text-xs">
                  <span className="font-medium">新未知：</span>
                  {p.new_unknown}
                </p>
                <form
                  action={reviewPlanProposalAction}
                  className="space-y-2 border-t border-black/10 pt-2 dark:border-white/10"
                >
                  <input type="hidden" name="project_id" value={project.id} />
                  <input type="hidden" name="proposal_id" value={p.id} />
                  <label className="block space-y-1 text-xs">
                    你的说明（拒绝/修改时建议填写）
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
                      接受并应用
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="MODIFY"
                      className="border border-black/30 px-2 py-0.5 dark:border-white/30"
                    >
                      带说明后应用
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="REJECT"
                      className="border border-black/30 px-2 py-0.5 dark:border-white/30"
                    >
                      拒绝（保留历史）
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
