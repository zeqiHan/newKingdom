"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCopy } from "@/components/locale-provider";
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
  const copy = useCopy();
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
        {copy("gateNeedsUncertainty")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-black/50 dark:text-white/50">
        {copy("gateLead")}
      </p>
      {lockedByActiveDecision ? (
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("gateLocked")}
        </p>
      ) : (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="border border-black/30 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/30"
        >
          {pending ? copy("evaluating") : copy("runGate")}
        </button>
      )}
      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
