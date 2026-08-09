import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectDetail } from "@/lib/db/queries";
import {
  createMilestoneAction,
  createUncertaintyAction,
  updateProjectDeadlineAction,
} from "./actions";

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const { project, uncertainties, milestones } = detail;

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
            清空日期后保存即可移除截止日期。
          </p>
        </form>
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
    </div>
  );
}
