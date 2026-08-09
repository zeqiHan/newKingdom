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

const GATE_LABEL: Record<string, string> = {
  KEEP_RESEARCHING: "继续调研",
  MAKE_PROVISIONAL_DECISION: "可做临时决定",
  READY_TO_FREEZE: "可冻结决定",
};

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

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

function DecisionGateResult({
  decision,
  milestoneId,
}: {
  decision: Decision;
  milestoneId: string;
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
            Decision Gate：{GATE_LABEL[gate] ?? gate}
          </p>
          <p>
            <span className="font-medium">WHY：</span>
            {decision.gate_why || decision.reasoning}
          </p>
          {decision.blocked_decision ? (
            <p>
              <span className="font-medium">被阻塞的决策：</span>
              {decision.blocked_decision}
            </p>
          ) : null}
          <p>
            <span className="font-medium">再收集信息的价值：</span>
            {decision.value_of_more_info || "—"}
          </p>
          <p>
            <span className="font-medium">等待代价：</span>
            {decision.cost_of_waiting || "—"}
          </p>
          <p>
            <span className="font-medium">做错代价：</span>
            {decision.cost_of_being_wrong || "—"}
          </p>
          <p>
            <span className="font-medium">可逆性：</span>
            {decision.reversibility || "—"}
          </p>
          <p>
            <span className="font-medium">额外信息是否可能改变行动：</span>
            {decision.would_info_change_action || "—"}
          </p>
        </div>
      ) : null}

      <div>
        <p className="font-medium">当前选项</p>
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
                  {selected ? "（你的选择）" : ""}
                  {aiPick ? " · AI 推荐" : ""}
                </p>
                {opt.description ? (
                  <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                    {opt.description}
                  </p>
                ) : null}
                {opt.bestEvidence && opt.bestEvidence.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">支持证据：</p>
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
                    <p className="font-medium">反对/削弱证据：</p>
                    <ul className="list-disc pl-4">
                      {opt.contradictingEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.assumptions && opt.assumptions.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">假设：</p>
                    <ul className="list-disc pl-4">
                      {opt.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.benefits && opt.benefits.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">收益：</p>
                    <ul className="list-disc pl-4">
                      {opt.benefits.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.downsides && opt.downsides.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">代价：</p>
                    <ul className="list-disc pl-4">
                      {opt.downsides.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {opt.importantUnknowns && opt.importantUnknowns.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <p className="font-medium">对该选项仍未知：</p>
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
          <p className="font-medium">关键权衡</p>
          <ul className="mt-1 list-disc pl-5">
            {decision.tradeoffs.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.unknowns_at_time.length > 0 ? (
        <div>
          <p className="font-medium">仍未知</p>
          <ul className="mt-1 list-disc pl-5">
            {decision.unknowns_at_time.map((u, i) => (
              <li key={i}>{String(u)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.ai_recommendation ? (
        <div className="border border-dashed border-black/20 p-3 text-xs dark:border-white/20">
          <p className="font-medium text-sm">AI 推荐（论据，不是命令）</p>
          <p className="mt-1">
            {decision.ai_recommendation.label
              ? `倾向：${decision.ai_recommendation.label}`
              : "倾向：继续调研 / 暂不锁定选项"}
          </p>
          <p className="mt-1">{decision.ai_recommendation.reasoning}</p>
        </div>
      ) : null}

      <p className="text-xs text-black/40 dark:text-white/40">
        状态：{DECISION_STATUS[decision.status] ?? decision.status}
        {decision.user_choice_note
          ? ` · 你的说明：${decision.user_choice_note}`
          : ""}
      </p>

      {canChoose ? (
        <form
          action={confirmDecisionChoiceAction}
          className="space-y-2 border border-black/10 p-3 dark:border-white/10"
        >
          <p className="font-medium">由你选择（可覆盖 AI）</p>
          <input type="hidden" name="milestone_id" value={milestoneId} />
          <input type="hidden" name="decision_id" value={decision.id} />
          <label className="block space-y-1">
            选项
            <select
              name="option_id"
              required
              defaultValue={decision.ai_recommendation?.optionId ?? ""}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="" disabled>
                选择一项
              </option>
              {decision.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            决定强度
            <select
              name="status"
              defaultValue={
                gate === "READY_TO_FREEZE" ? "FROZEN" : "PROVISIONAL"
              }
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            >
              <option value="PROVISIONAL">临时决定（可修订）</option>
              <option value="FROZEN">冻结决定</option>
            </select>
          </label>
          <label className="block space-y-1">
            你的理由（可选）
            <textarea
              name="user_choice_note"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <p className="text-xs text-black/50 dark:text-white/50">
            即使 AI 建议继续调研，你仍可主动做出临时/冻结决定；代价已在上方显式列出。
          </p>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            确认我的选择
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
            重开决策
          </button>
        </form>
      ) : null}

      {decision.history.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs">
            历史版本（{decision.history.length}）
          </summary>
          <ul className="mt-2 space-y-2 text-xs text-black/60 dark:text-white/60">
            {decision.history.map((h, i) => (
              <li
                key={i}
                className="border border-black/10 p-2 dark:border-white/10"
              >
                <p>
                  {h.at} · {DECISION_STATUS[h.status] ?? h.status}
                  {h.selected_option
                    ? ` · 曾选 ${h.selected_option.label}`
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
          {milestone.deadline
            ? ` · 截止日期 ${toDateInputValue(milestone.deadline)}`
            : " · 截止日期 —"}
        </p>
        <form
          action={updateMilestoneDeadlineAction}
          className="mt-3 flex flex-wrap items-end gap-2 border border-black/10 p-3 text-sm dark:border-white/10"
        >
          <input type="hidden" name="milestone_id" value={milestone.id} />
          <label className="space-y-1">
            <span className="block text-xs text-black/50 dark:text-white/50">
              修改截止日期
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
            保存
          </button>
          <p className="w-full text-xs text-black/40 dark:text-white/40">
            清空日期后保存即可移除截止日期。
          </p>
        </form>
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

        {uncertainty ? (
          <form
            action={runWebResearchAction}
            className="space-y-2 border border-dashed border-black/20 p-3 text-sm dark:border-white/20"
          >
            <p className="font-medium">AI 网络调研（服务本不确定性）</p>
            <p className="text-xs text-black/50 dark:text-white/50">
              搜索 → 提取声称 → 分类/强度 → 信念更新。来源所说 ≠ 事实为真；每条保留来源，你可质疑/修正。
            </p>
            <input type="hidden" name="milestone_id" value={milestone.id} />
            <label className="block space-y-1">
              研究问题
              <textarea
                name="research_question"
                required
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder="例如：知识工作者是否会为决策工具付费？有哪些公开信号？"
              />
            </label>
            <button
              type="submit"
              className="border border-black/30 px-3 py-1 dark:border-white/30"
            >
              运行有限调研（最多 3 条声称）
            </button>
          </form>
        ) : null}
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
          决策 · Decision Gate
        </h2>
        <DecisionGatePanel
          milestoneId={milestone.id}
          hasUncertainty={Boolean(uncertainty)}
          lockedByActiveDecision={lockedByActiveDecision}
        />
        {!decision ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            暂无决策。有证据与信念更新后，可运行 Decision Gate。
          </p>
        ) : (
          <DecisionGateResult
            decision={decision}
            milestoneId={milestone.id}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          行动 / 实验
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          决策之后，用可检验的现实互动产生信息——不是「完成项目」。
        </p>
        {experiment ? (
          <div className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10">
            <p>
              <span className="font-medium">行动：</span>
              {experiment.action_text}
            </p>
            <p>
              <span className="font-medium">假设：</span>
              {experiment.hypothesis || "—"}
            </p>
            <p>
              <span className="font-medium">预期结果：</span>
              {experiment.expected_outcome || "—"}
            </p>
            <p>
              <span className="font-medium">期望证据：</span>
              {experiment.evidence_expected || "—"}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40">
              状态：{experiment.status}
              {experiment.deadline
                ? ` · 截止 ${toDateInputValue(experiment.deadline)}`
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">
            暂无实验。
          </p>
        )}
        {canStartExperiment ? (
          <form
            action={createExperimentAction}
            className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
          >
            <p className="font-medium">记录实验 / 行动</p>
            <input type="hidden" name="milestone_id" value={milestone.id} />
            <input
              type="hidden"
              name="decision_id"
              value={decision?.id ?? ""}
            />
            <label className="block space-y-1">
              行动描述
              <textarea
                name="action_text"
                required
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder="例如：向 10 位潜在用户报价 ¥199/年"
              />
            </label>
            <label className="block space-y-1">
              假设
              <textarea
                name="hypothesis"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              预期结果
              <textarea
                name="expected_outcome"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                placeholder="例如：至少 2 人真实付款"
              />
            </label>
            <label className="block space-y-1">
              期望收集的证据
              <textarea
                name="evidence_expected"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              截止日期（可选）
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
              开始实验
            </button>
          </form>
        ) : (
          <p className="text-xs text-black/50 dark:text-white/50">
            先做出临时或冻结决策后，才能登记实验。
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          现实反馈 / 学习
        </h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          现实 &gt; 推理。反馈可支持、削弱或推翻先前决策。
        </p>
        {feedback[0] ? (
          <div className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10">
            <p>
              <span className="font-medium">预期：</span>
              {feedback[0].expected_outcome}
            </p>
            <p>
              <span className="font-medium">实际：</span>
              {feedback[0].actual_outcome}
            </p>
            <p>
              <span className="font-medium">差异：</span>
              {feedback[0].difference || "—"}
            </p>
            <p>
              <span className="font-medium">学习：</span>
              {feedback[0].learning}
            </p>
            {feedback[0].ai_analysis ? (
              <p className="text-xs">
                <span className="font-medium">AI 分析：</span>
                {feedback[0].ai_analysis}
              </p>
            ) : null}
            <p className="text-xs text-black/40 dark:text-white/40">
              对决策影响：{feedback[0].decision_impact}
              {feedback[0].suggest_reopen ? " · AI 建议重开决策" : ""}
              {" · 信心 "}
              {feedback[0].confidence_before ?? "—"} →{" "}
              {feedback[0].confidence_after ?? "—"}
            </p>
            {feedback[0].assumptions_weakened.length > 0 ? (
              <div className="text-xs">
                <p className="font-medium">被削弱的假设：</p>
                <ul className="list-disc pl-4">
                  {feedback[0].assumptions_weakened.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {feedback[0].new_uncertainties.length > 0 ? (
              <div className="text-xs">
                <p className="font-medium">新不确定性：</p>
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
            <p className="font-medium">记录现实反馈</p>
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
              预期（可改）
              <textarea
                name="expected_outcome"
                rows={2}
                defaultValue={experiment.expected_outcome}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              实际结果
              <textarea
                name="actual_outcome"
                required
                rows={3}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="block space-y-1">
              你的学习（可选；可覆盖 AI）
              <textarea
                name="user_learning"
                rows={2}
                className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="reopen_decision" value="1" />
              同时重开相关决策（保留历史）
            </label>
            <button
              type="submit"
              className="border border-black/30 px-3 py-1 dark:border-white/30"
            >
              保存反馈并标记学习已捕获
            </button>
          </form>
        ) : !feedback[0] ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {latestBelief?.recommended_next_experiment
              ? `建议实验：${latestBelief.recommended_next_experiment}`
              : "先登记实验，再回来记录现实结果。"}
          </p>
        ) : null}
      </section>
    </div>
  );
}
