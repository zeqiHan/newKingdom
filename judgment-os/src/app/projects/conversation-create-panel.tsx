"use client";

/**
 * Conversation-First Project Creation
 * 
 * Core principle: "如果使用过程像做作业一样，那么它就会没人使用。"
 * 
 * User types one message → AI fills everything → User refines (optional)
 */

import { useState } from "react";
import { useCopy } from "@/components/locale-provider";
import { ConversationInput, ConversationExamples } from "@/components/conversation-input";
import type { ConversationAnalysis } from "@/lib/decision-engine/analyze-conversation";
import type { Sacrifice } from "@/lib/db/schema";
import type { Copy } from "@/lib/i18n";

export function ConversationCreatePanel() {
  const copy = useCopy();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleAnalyze = async (message: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/projects/analyze-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: message }),
      });

      if (!response.ok) {
        throw new Error(copy("analyzeFailed"));
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy("analyzeFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!analysis) return;

    try {
      const response = await fetch("/api/projects/create-from-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      if (!response.ok) {
        throw new Error(copy("createFailed"));
      }

      const data = await response.json();
      window.location.href = `/projects/${data.projectId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : copy("createFailed"));
    }
  };

  const handleEdit = () => {
    setAnalysis(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
          {copy("conversationTitle")}
        </h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          {copy("conversationLead")}
        </p>
      </div>

      {!analysis ? (
        <>
          <ConversationInput
            placeholder={copy("conversationPlaceholder")}
            onSubmit={handleAnalyze}
            disabled={isAnalyzing}
            submitLabel={copy("analyzeAndCreate")}
          />

          <ConversationExamples onSelectExample={setInputValue} />

          {inputValue && (
            <p className="text-xs text-black/50 dark:text-white/50">
              {copy("exampleChosen")}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <ProjectAnalysisPreview analysis={analysis} copy={copy} />

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="border border-black/30 px-3 py-1 text-sm dark:border-white/30"
            >
              {copy("createProject")}
            </button>
            <button
              onClick={handleEdit}
              className="border border-black/30 px-3 py-1 text-sm dark:border-white/30"
            >
              {copy("reenter")}
            </button>
          </div>

          <p className="text-xs text-black/50 dark:text-white/50">
            {copy("createHint")}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function ProjectAnalysisPreview({
  analysis,
  copy,
}: {
  analysis: ConversationAnalysis;
  copy: Copy;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-3">
      {/* Summary Card */}
      <div className="border border-dashed border-black/20 p-3 dark:border-white/20">
        <div className="mb-3">
          <p className="text-xs text-black/40 dark:text-white/40">{copy("aiAnalyzed")}</p>
          <h3 className="mt-1 font-medium">{analysis.title}</h3>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {analysis.goal}
          </p>
        </div>

        <div className="mb-3 space-y-1 text-xs text-black/70 dark:text-white/70">
          <p>{copy("previewRecommended", { date: analysis.recommendedDeadline })}</p>
          {analysis.userDeadline ? (
            <p>{copy("previewUserDeadline", { date: analysis.userDeadline })}</p>
          ) : null}
          {analysis.suggestedMilestones.map((m, i) => (
            <p key={m.tempId}>
              {i + 1}. {m.title}
              {copy("milestoneDeadline", { date: m.deadline })}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-black/50 dark:text-white/50">{copy("sacrificeDecl")}</span>
            <p className="font-medium">{copy("countItems", { n: analysis.willingSacrifices.length })}</p>
          </div>
          <div>
            <span className="text-black/50 dark:text-white/50">{copy("uncertaintyShort")}</span>
            <p className="font-medium">{copy("countThings", { n: analysis.keyUncertainties.length })}</p>
          </div>
          <div>
            <span className="text-black/50 dark:text-white/50">{copy("milestones")}</span>
            <p className="font-medium">{copy("countThings", { n: analysis.suggestedMilestones.length })}</p>
          </div>
        </div>
      </div>

      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white text-left"
      >
        {showDetails ? copy("hideDetails") : copy("viewDetails")}
      </button>

      {/* Detailed View */}
      {showDetails && (
        <div className="space-y-4 border border-black/10 p-3 text-sm dark:border-white/10">
          <Section title={copy("goalsAndCriteria")}>
            <Field label={copy("goal")} value={analysis.goal} />
            <Field label={copy("successCriteria")} value={analysis.successCriteria} />
            <Field label={copy("constraints")} value={analysis.constraints} />
          </Section>

          <Section title={copy("sacrificeDecl")}>
            {analysis.willingSacrifices.map((s: Sacrifice) => (
              <div key={s.id}>
                <p>
                  <span className="text-xs text-black/40 dark:text-white/40">{s.category}</span>
                  {" "}
                  {s.description}
                </p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {s.impact}
                </p>
              </div>
            ))}
          </Section>

          <Section title={copy("keyUncertainties")}>
            {analysis.keyUncertainties.map((u, i) => (
              <div key={u.tempId} className="flex gap-2">
                <span className="text-black/40 dark:text-white/40">{i + 1}.</span>
                <div>
                  <p>{u.question}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {copy("importanceOf", { n: u.importance })}
                  </p>
                </div>
              </div>
            ))}
          </Section>

          <Section title={copy("milestones")}>
            {analysis.suggestedMilestones.map((m, i) => (
              <div key={m.tempId}>
                <p className="font-medium">
                  {i + 1}. {m.title}
                  {copy("milestoneDeadline", { date: m.deadline })}
                </p>
                <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                  {copy("expectedLearningOf", { text: m.expectedLearning })}
                </p>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-medium text-black/70 dark:text-white/70 mb-2">
        {title}
      </h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-black/50 dark:text-white/50">{label}:</span>
      <p className="text-black/80 dark:text-white/80">{value}</p>
    </div>
  );
}
