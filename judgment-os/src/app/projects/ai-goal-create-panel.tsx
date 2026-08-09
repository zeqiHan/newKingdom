"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type {
  GoalProposal,
  ProposedMilestone,
  ProposedUncertainty,
} from "@/lib/decision-engine";
import {
  confirmGoalProposalAction,
  proposeGoalAction,
} from "./ai-actions";

function newTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AiGoalCreatePanel() {
  const router = useRouter();
  const [rawGoal, setRawGoal] = useState("");
  const [proposal, setProposal] = useState<GoalProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uncertaintyOptions = useMemo(
    () => proposal?.keyUncertainties ?? [],
    [proposal],
  );

  function analyze() {
    setError(null);
    startTransition(async () => {
      const result = await proposeGoalAction(rawGoal);
      if (!result.ok) {
        setError(result.error);
        setProposal(null);
        return;
      }
      setProposal(result.proposal);
    });
  }

  function confirm() {
    if (!proposal) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmGoalProposalAction(proposal);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/projects/${result.projectId}`);
      router.refresh();
    });
  }

  function updateUncertainty(
    tempId: string,
    patch: Partial<ProposedUncertainty>,
  ) {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        keyUncertainties: prev.keyUncertainties.map((u) =>
          u.tempId === tempId ? { ...u, ...patch } : u,
        ),
      };
    });
  }

  function deleteUncertainty(tempId: string) {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        keyUncertainties: prev.keyUncertainties.filter(
          (u) => u.tempId !== tempId,
        ),
        suggestedMilestones: prev.suggestedMilestones.filter(
          (m) => m.uncertaintyTempId !== tempId,
        ),
      };
    });
  }

  function addUncertainty() {
    setProposal((prev) => {
      if (!prev) return prev;
      const next: ProposedUncertainty = {
        tempId: newTempId(),
        question: "",
        importance: 50,
      };
      return {
        ...prev,
        keyUncertainties: [...prev.keyUncertainties, next],
      };
    });
  }

  function updateMilestone(
    tempId: string,
    patch: Partial<ProposedMilestone>,
  ) {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        suggestedMilestones: prev.suggestedMilestones.map((m) =>
          m.tempId === tempId ? { ...m, ...patch } : m,
        ),
      };
    });
  }

  function deleteMilestone(tempId: string) {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        suggestedMilestones: prev.suggestedMilestones.filter(
          (m) => m.tempId !== tempId,
        ),
      };
    });
  }

  function addMilestone() {
    setProposal((prev) => {
      if (!prev) return prev;
      const first = prev.keyUncertainties[0];
      if (!first) return prev;
      const next: ProposedMilestone = {
        tempId: newTempId(),
        uncertaintyTempId: first.tempId,
        title: "",
        purpose: "",
        expectedLearning: "",
      };
      return {
        ...prev,
        suggestedMilestones: [...prev.suggestedMilestones, next],
      };
    });
  }

  return (
    <section className="space-y-4 border border-black/10 p-4 dark:border-white/10">
      <div>
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          用 AI 创建项目
        </h2>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          AI 提出建议，由你审阅确认。里程碑用来减少不确定性——不是任务清单。
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span>原始目标</span>
        <textarea
          value={rawGoal}
          onChange={(e) => setRawGoal(e.target.value)}
          rows={4}
          className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
          placeholder="两周内做出一个我自己真正会使用的 JudgmentOS MVP……"
          disabled={pending}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={pending || !rawGoal.trim()}
          className="border border-black/30 px-3 py-1 disabled:opacity-40 dark:border-white/30"
        >
          {pending && !proposal ? "分析中…" : "用 AI 分析"}
        </button>
        {proposal ? (
          <button
            type="button"
            onClick={() => {
              setProposal(null);
              setError(null);
            }}
            disabled={pending}
            className="border border-black/20 px-3 py-1 dark:border-white/20"
          >
            重置提案
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}

      {proposal ? (
        <div className="space-y-6 border-t border-black/10 pt-4 dark:border-white/10">
          <p className="text-xs text-black/50 dark:text-white/50">
            当前仅为提案——确认前不会写入数据库。
          </p>

          <label className="block space-y-1 text-sm">
            <span>标题</span>
            <input
              value={proposal.title}
              onChange={(e) =>
                setProposal({ ...proposal, title: e.target.value })
              }
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span>澄清后的目标</span>
            <textarea
              value={proposal.clarifiedGoal}
              onChange={(e) =>
                setProposal({ ...proposal, clarifiedGoal: e.target.value })
              }
              rows={3}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span>成功标准</span>
            <textarea
              value={proposal.successCriteria}
              onChange={(e) =>
                setProposal({ ...proposal, successCriteria: e.target.value })
              }
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span>约束条件</span>
            <textarea
              value={proposal.constraints}
              onChange={(e) =>
                setProposal({ ...proposal, constraints: e.target.value })
              }
              rows={2}
              className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">关键不确定性</h3>
              <button
                type="button"
                onClick={addUncertainty}
                className="border border-black/20 px-2 py-0.5 text-xs dark:border-white/20"
              >
                添加
              </button>
            </div>
            {proposal.keyUncertainties.map((u, index) => (
              <div
                key={u.tempId}
                className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <p className="text-xs text-black/40 dark:text-white/40">
                  U{index + 1}
                </p>
                <textarea
                  value={u.question}
                  onChange={(e) =>
                    updateUncertainty(u.tempId, { question: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                  placeholder="我们关键地不知道什么？"
                />
                <label className="block space-y-1 text-xs">
                  重要性
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={u.importance}
                    onChange={(e) =>
                      updateUncertainty(u.tempId, {
                        importance: Number(e.target.value),
                      })
                    }
                    className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => deleteUncertainty(u.tempId)}
                  className="text-xs underline"
                >
                  删除该不确定性（及其关联里程碑）
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">建议里程碑</h3>
              <button
                type="button"
                onClick={addMilestone}
                disabled={uncertaintyOptions.length === 0}
                className="border border-black/20 px-2 py-0.5 text-xs disabled:opacity-40 dark:border-white/20"
              >
                添加
              </button>
            </div>
            <p className="text-xs text-black/50 dark:text-white/50">
              每个里程碑必须绑定一个不确定性，并写明预期学习。不是实现任务。
            </p>
            {proposal.suggestedMilestones.map((m, index) => (
              <div
                key={m.tempId}
                className="space-y-2 border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <p className="text-xs text-black/40 dark:text-white/40">
                  M{index + 1}
                </p>
                <label className="block space-y-1 text-xs">
                  关联不确定性
                  <select
                    value={m.uncertaintyTempId}
                    onChange={(e) =>
                      updateMilestone(m.tempId, {
                        uncertaintyTempId: e.target.value,
                      })
                    }
                    className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                  >
                    {uncertaintyOptions.map((u, uIndex) => (
                      <option key={u.tempId} value={u.tempId}>
                        U{uIndex + 1}: {u.question.slice(0, 80) || "（空）"}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  value={m.title}
                  onChange={(e) =>
                    updateMilestone(m.tempId, { title: e.target.value })
                  }
                  placeholder="里程碑标题（学习行动）"
                  className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                />
                <textarea
                  value={m.purpose}
                  onChange={(e) =>
                    updateMilestone(m.tempId, { purpose: e.target.value })
                  }
                  rows={2}
                  placeholder="目的——减少哪个不确定性"
                  className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                />
                <textarea
                  value={m.expectedLearning}
                  onChange={(e) =>
                    updateMilestone(m.tempId, {
                      expectedLearning: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="预期学习（必填）"
                  className="w-full border border-black/20 bg-transparent px-2 py-1 dark:border-white/20"
                />
                <button
                  type="button"
                  onClick={() => deleteMilestone(m.tempId)}
                  className="text-xs underline"
                >
                  删除里程碑
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="border border-black/40 px-3 py-1 disabled:opacity-40 dark:border-white/40"
          >
            {pending ? "保存中…" : "确认并创建项目"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
