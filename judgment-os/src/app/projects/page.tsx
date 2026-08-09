import Link from "next/link";
import { listProjects } from "@/lib/db/queries";
import { createProjectAction } from "./actions";
import { AiGoalCreatePanel } from "./ai-goal-create-panel";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "进行中",
  PAUSED: "已暂停",
  ARCHIVED: "已归档",
};

export default async function ProjectsPage() {
  const projectList = await listProjects();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">项目</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          AI 提出结构，由你确认。底盘 + 第一条垂直切片。
        </p>
      </div>

      <AiGoalCreatePanel />

      <details className="border border-black/10 p-4 text-sm dark:border-white/10">
        <summary className="cursor-pointer font-medium">
          手动创建（不用 AI）
        </summary>
        <form action={createProjectAction} className="mt-3 space-y-3">
          <label className="block space-y-1">
            <span>标题</span>
            <input
              name="title"
              required
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>目标</span>
            <textarea
              name="goal"
              required
              rows={3}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>成功标准</span>
            <textarea
              name="success_criteria"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>约束条件</span>
            <textarea
              name="constraints"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>用户截止日期</span>
            <input
              name="user_deadline"
              type="date"
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <button
            type="submit"
            className="border border-black/30 px-3 py-1 dark:border-white/30"
          >
            创建空项目
          </button>
        </form>
      </details>

      {projectList.length === 0 ? (
        <section className="border border-dashed border-black/20 p-6 dark:border-white/20">
          <p className="text-sm">暂无项目。</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {projectList.map((project) => (
            <li
              key={project.id}
              className="border border-black/10 p-4 dark:border-white/10"
            >
              <Link
                href={`/projects/${project.id}`}
                className="text-base font-medium underline-offset-2 hover:underline"
              >
                {project.title}
              </Link>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {project.goal}
              </p>
              <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                {STATUS_LABEL[project.status] ?? project.status}
                {project.user_deadline
                  ? ` · 用户截止日期 ${project.user_deadline}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
