import Link from "next/link";
import { listProjects } from "@/lib/db/queries";
import { enumLabel, makeCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/locale.server";
import { createProjectAction } from "./actions";
import { ConversationCreatePanel } from "./conversation-create-panel";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const locale = await getLocale();
  const copy = makeCopy(locale);
  const projectList = await listProjects();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy("projectsTitle")}</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          {copy("projectsLead")}
        </p>
      </div>

      <ConversationCreatePanel />

      <details className="border border-black/10 p-4 text-sm dark:border-white/10">
        <summary className="cursor-pointer font-medium">
          {copy("orManualForm")}
        </summary>
        <form action={createProjectAction} className="mt-3 space-y-3">
          <label className="block space-y-1">
            <span>{copy("title")}</span>
            <input
              name="title"
              required
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("goal")}</span>
            <textarea
              name="goal"
              required
              rows={3}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("successCriteria")}</span>
            <textarea
              name="success_criteria"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("constraints")}</span>
            <textarea
              name="constraints"
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="block space-y-1">
            <span>{copy("userDeadline")}</span>
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
            {copy("createEmptyProject")}
          </button>
        </form>
      </details>

      {projectList.length === 0 ? (
        <section className="border border-dashed border-black/20 p-6 dark:border-white/20">
          <p className="text-sm">{copy("noProjects")}</p>
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
                {enumLabel(locale, "project", project.status)}
                {project.user_deadline
                  ? copy("userDeadlineInline", { date: project.user_deadline })
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
