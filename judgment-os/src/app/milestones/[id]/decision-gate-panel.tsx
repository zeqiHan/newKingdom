"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runDecisionGateAction } from "./decision-actions";

export function DecisionGatePanel({
  milestoneId,
  hasUncertainty,
  lockedByActiveDecision,
}: {
  milestoneId: string;
  hasUncertainty: boolean;
  /** True when a PROVISIONAL/FROZEN decision exists (must reopen first). */
  lockedByActiveDecision: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await runDecisionGateAction(milestoneId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!hasUncertainty) {
    return (
      <p className="text-xs text-black/50 dark:text-white/50">
        未关联不确定性时无法运行 Decision Gate。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-black/50 dark:text-white/50">
        Belief Update → Decision Gate。AI 只推荐；你做最终选择。不使用任意信心阈值，也不要求确定性。
      </p>
      {lockedByActiveDecision ? (
        <p className="text-xs text-black/50 dark:text-white/50">
          当前已有临时/冻结决策。若要重新评估，请先「重开决策」。
        </p>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="border border-black/30 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/30"
        >
          {pending ? "评估中…" : "运行 Decision Gate"}
        </button>
      )}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
