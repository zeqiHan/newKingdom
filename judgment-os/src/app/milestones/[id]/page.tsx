import Link from "next/link";
import { notFound } from "next/navigation";
import { getMilestoneWorkspace } from "@/lib/db/queries";
import type { BeliefUpdate } from "@/lib/db/types";
import { createEvidenceAction, reviewBeliefUpdateAction } from "./actions";

export const dynamic = "force-dynamic";

type MilestonePageProps = {
  params: Promise<{ id: string }>;
};

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

const EVIDENCE_TYPE: Record<string, string> = {
  FACT: "事实",
  ASSUMPTION: "假设",
  INFERENCE: "推断",
  OPINION: "意见",
};

const EVIDENCE_USER_STATUS: Record<string, string> = {
  UNREVIEWED: "未审阅",
  ACCEPTED: "已接受",
  CHALLENGED: "已质疑",
  CORRECTED: "已修正",
};

const SUPPORT_LABEL: Record<string, string> = {
  SUPPORTS: "支持",
  CHALLENGES: "挑战",
  MIXED: "混合",
  NEUTRAL: "中性",
};

const DECISION_STATUS: Record<string, string> = {
  OPEN: "开放",
  PROVISIONAL: "临时",
  FROZEN: "已冻结",
  REOPENED: "已重开",
};

function BeliefUpdateBlock({
  update,
  milestoneId,
}: {
  update: BeliefUpdate;
  milestoneId: string;
}) {
  return (
    <div className="mt-3 space-y-2 border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
      <p className="font-medium text-sm">AI 信念更新（提案）</p>
      <p>
        AI 类型：{EVIDENCE_TYPE[update.evidence_type] ?? update.evidence_type}
        {" · 强度 "}
        {update.evidence_strength}
        {" · "}
        {SUPPORT_LABEL[update.supports_or_challenges] ??
          update.supports_or_challenges}
      </p>
      <p>
        <span className="font-medium">信念变化：</span>
        {update.belief_update}
      </p>
      <div>
        <p className="font-medium">仍未知：</p>
        <ul className="list-disc pl-4">
          {update.remaining_unknowns.map((u, i) => (
            <li key={i}>{u}</li>
          ))}
        </ul>
      </div>
      <p>
        <span className="font-medium">建议下一步实验：</span>
        {update.recommended_next_experiment}
      </p>
      <p className="text-black/50 dark:text-white/50">
        信心 {update.prior_confidence} → 建议 {update.suggested_confidence}
        {" · 审阅状态 "}
        {EVIDENCE_USER_STATUS[update.user_review_status] ??
          update.user_review_status}
      </p>
      {update.user_correction ? (
        <p>
          <span className="font-medium">你的修正说明：</span>
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
            接受
          </button>
        </form>
        <form action={reviewBeliefUpdateAction} className="flex flex-wrap gap-1">
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="belief_update_id" value={update.id} />
          <input type="hidden" name="status" value="CHALLENGED" />
          <input
            name="user_correction"
            placeholder="质疑理由"
            className="border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
          />
          <button
            type="submit"
            className="border border-black/30 px-2 py-0.5 dark:border-white/30"
          >
            质疑
          </button>
        </form>
      </div>

      <details className="pt-1">
        <summary className="cursor-pointer">修正 AI 解释</summary>
        <form action={reviewBeliefUpdateAction} className="mt-2 space-y-2">
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="belief_update_id" value={update.id} />
          <input type="hidden" name="status" value="CORRECTED" />
          <label className="block space-y-1">
            修正后的信念更新
            <textarea
              name="corrected_belief_update"
              rows={2}
              defaultValue={update.belief_update}
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            仍未知（每行一条）
            <textarea
              name="corrected_remaining_unknowns"
              rows={3}
              defaultValue={update.remaining_unknowns.join("\n")}
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            修正后建议信心
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
            修正说明
            <input
              name="user_correction"
              className="w-full border border-black/20 bg-transparent px-1 py-0.5 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-2 py-0.5 dark:border-white/30"
          >
            保存修正
          </button>
        </form>
      </details>
    </div>
  );
}

export default async function MilestonePage({ params }: MilestonePageProps) {
  const { id } = await params;
  const workspace = await getMilestoneWorkspace(id);
  if (!workspace) notFound();

  const {
    milestone,
    project,
    uncertainty,
    evidence,
    beliefUpdatesByEvidenceId,
    decisions,
    feedback,
  } = workspace;
  const decision = decisions[0] ?? null;

  const latestBelief = Object.values(beliefUpdatesByEvidenceId).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  )[0];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs tracking-wide text-black/40 dark:text-white/40">
          <Link href="/projects" className="hover:underline">
            项目
          </Link>
          {" / "}
          <Link href={`/projects/${project.id}`} className="hover:underline">
            {project.title}
          </Link>
          {" / "}
          里程碑
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {milestone.title}
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {milestone.purpose}
        </p>
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          状态：{MILESTONE_STATUS[milestone.status] ?? milestone.status}
          {milestone.deadline ? ` · 截止日期 ${milestone.deadline}` : ""}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          不确定性
        </h2>
        <p className="text-sm text-black/50 dark:text-white/50">
          我们想学到什么？
        </p>
        <p className="text-sm">
          {uncertainty?.question ?? "—（未关联不确定性）"}
        </p>
        <p className="text-xs text-black/40 dark:text-white/40">
          预期学习：{milestone.expected_learning || "—"}
          {uncertainty
            ? ` · 当前信心 ${uncertainty.current_confidence}`
            : ""}
        </p>
        {!uncertainty ? (
          <p className="text-xs text-black/50 dark:text-white/50">
            未关联不确定性时，添加证据不会触发信念更新分析。
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          已知证据
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          来源 ≠ 事实。AI 提出信念更新；你可接受、质疑或修正。
        </p>
        {evidence.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">暂无。</p>
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
                      {EVIDENCE_TYPE[item.type] ?? item.type}
                    </span>
                    {" · "}
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {EVIDENCE_USER_STATUS[item.user_status] ??
                        item.user_status}
                      {" · 信心 "}
                      {item.confidence}
                    </span>
                  </p>
                  <p className="mt-1">{item.claim}</p>
                  {item.source ? (
                    <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                      来源：{item.source}
                    </p>
                  ) : null}
                  {update ? (
                    <BeliefUpdateBlock
                      update={update}
                      milestoneId={milestone.id}
                    />
                  ) : (
                    <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                      尚无 AI 信念更新（可能分析失败或未关联不确定性）。
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
          <p className="font-medium">添加证据</p>
          <p className="text-xs text-black/50 dark:text-white/50">
            保存后 Decision Engine 会分析其对不确定性的信念影响（需已关联不确定性）。
          </p>
          <input type="hidden" name="milestone_id" value={milestone.id} />
          <label className="block space-y-1">
            <span>陈述</span>
            <textarea
              name="claim"
              required
              rows={3}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>类型</span>
            <select
              name="type"
              defaultValue="FACT"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="FACT">事实</option>
              <option value="ASSUMPTION">假设</option>
              <option value="INFERENCE">推断</option>
              <option value="OPINION">意见</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span>来源</span>
            <input
              name="source"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>信心（0–100）</span>
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
            保存证据并分析信念
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          未知项
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
          决策
        </h2>
        {!decision ? (
          <p className="text-sm text-black/50 dark:text-white/50">暂无决策。</p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>{decision.question}</p>
            <ul className="space-y-1">
              {decision.options.map((opt) => {
                const selected = decision.selected_option?.id === opt.id;
                return (
                  <li key={opt.id}>
                    {selected ? "→ " : "  "}
                    {opt.label}
                    {selected ? "（已选）" : ""}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-black/40 dark:text-white/40">
              状态：{DECISION_STATUS[decision.status] ?? decision.status}
              {" · 信心 "}
              {decision.confidence}
            </p>
            <p>
              <span className="font-medium">理由：</span>
              {decision.reasoning}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          权衡 / 下一步实验
        </h2>
        {latestBelief?.recommended_next_experiment ? (
          <p className="text-sm">
            <span className="font-medium">基于最新证据的建议实验：</span>
            {latestBelief.recommended_next_experiment}
          </p>
        ) : null}
        {feedback[0] ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">预期：</span>
              {feedback[0].expected_outcome}
            </p>
            <p>
              <span className="font-medium">实际：</span>
              {feedback[0].actual_outcome}
            </p>
            <p>
              <span className="font-medium">学习：</span>
              {feedback[0].learning}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40">
              信心 {feedback[0].confidence_before ?? "—"} →{" "}
              {feedback[0].confidence_after ?? "—"}
            </p>
          </div>
        ) : !latestBelief ? (
          <p className="text-sm">
            下一步：执行行动，再记录反馈。尚无反馈。
          </p>
        ) : null}
      </section>
    </div>
  );
}
