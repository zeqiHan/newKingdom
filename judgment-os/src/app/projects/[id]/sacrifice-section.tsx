"use client";

/**
 * Project Sacrifice Section
 * 
 * Displays and manages project-level sacrifice declarations
 */

import { useState } from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { enumLabel } from "@/lib/i18n";
import type { Sacrifice } from "@/lib/db/schema";
import { SacrificeDeclaration } from "@/components/sacrifice-declaration";
import {
  generateProjectSacrifices,
  acceptProjectSacrifices,
  updateProjectSacrifice,
  addCustomProjectSacrifice,
} from "@/app/projects/sacrifice-actions";

type SacrificeSectionProps = {
  projectId: string;
  projectGoal: string;
  successCriteria: string;
  constraints: string;
  userDeadline: string | null;
  recommendedDeadline: string | null;
  sacrifices: Sacrifice[];
  sacrificesAcceptedAt: string | null;
};

export function SacrificeSection({
  projectId,
  projectGoal,
  successCriteria,
  constraints,
  userDeadline,
  recommendedDeadline,
  sacrifices: initialSacrifices,
  sacrificesAcceptedAt,
}: SacrificeSectionProps) {
  const copy = useCopy();
  const [sacrifices, setSacrifices] = useState<Sacrifice[]>(initialSacrifices);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const hasSacrifices = sacrifices.length > 0;
  const isAccepted = !!sacrificesAcceptedAt;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateProjectSacrifices(projectId);
      if (result.error) {
        setError(result.error);
      } else if (result.sacrifices) {
        setSacrifices(result.sacrifices);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (acceptedSacrifices: Sacrifice[]) => {
    const result = await acceptProjectSacrifices(projectId, acceptedSacrifices);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  };

  const handleModify = async (
    sacrificeId: string,
    updates: Partial<Sacrifice>
  ) => {
    const result = await updateProjectSacrifice(projectId, sacrificeId, updates);
    if (result.error) {
      setError(result.error);
    } else {
      setSacrifices((prev) =>
        prev.map((s) =>
          s.id === sacrificeId ? { ...s, ...updates, userModified: true } : s
        )
      );
    }
  };

  const handleAddCustom = async (sacrifice: Omit<Sacrifice, "id" | "aiGenerated" | "userModified">) => {
    const result = await addCustomProjectSacrifice(projectId, sacrifice);
    if (result.error) {
      setError(result.error);
    } else if (result.sacrifice) {
      setSacrifices((prev) => [...prev, result.sacrifice!]);
      setShowCustomForm(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium tracking-wide text-black/50 dark:text-white/50">
        {copy("sacrificeHeading")}
      </h2>

      <div className="border border-black/10 p-4 dark:border-white/10 space-y-4">
        {!hasSacrifices && !isGenerating && (
          <div className="text-center py-6">
            <p className="text-sm text-black/60 dark:text-white/60 mb-4">
              {copy("mustSacrifice")}
            </p>
            <button
              onClick={handleGenerate}
              className="border border-black/30 px-4 py-2 dark:border-white/30 hover:bg-black/5 dark:hover:bg-white/5"
            >
              {copy("generateSacrifices")}
            </button>
          </div>
        )}

        {isGenerating && (
          <p className="text-sm text-black/50 dark:text-white/50">
            {copy("generatingSacrifices")}
          </p>
        )}

        {hasSacrifices && (
          <SacrificeDeclaration
            sacrifices={sacrifices}
            onAccept={handleAccept}
            onModify={handleModify}
            onAddCustom={() => setShowCustomForm(true)}
            isAccepted={isAccepted}
            level="project"
          />
        )}

        {showCustomForm && (
          <CustomSacrificeForm
            onSubmit={handleAddCustom}
            onCancel={() => setShowCustomForm(false)}
          />
        )}

        {error && (
          <p className="text-sm text-red-700 dark:text-red-400">
            {copy("errorPrefix", { message: error })}
          </p>
        )}

        {!hasSacrifices && (
          <div className="text-xs text-black/40 dark:text-white/40 space-y-1">
            <p>
              <strong>{copy("whySacrifice")}</strong>
            </p>
            <p>{copy("whySacrificeBody")}</p>
            <p>{copy("whySacrificeAi")}</p>
            <p>{copy("whySacrificeReview")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

type CustomSacrificeFormProps = {
  onSubmit: (sacrifice: Omit<Sacrifice, "id" | "aiGenerated" | "userModified">) => Promise<void>;
  onCancel: () => void;
};

function CustomSacrificeForm({ onSubmit, onCancel }: CustomSacrificeFormProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [category, setCategory] = useState<Sacrifice["category"]>("OTHER");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        category,
        description,
        impact,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-black/20 p-4 space-y-3 dark:border-white/20">
      <h4 className="font-medium text-sm">{copy("addCustomSacrifice")}</h4>
      
      <label className="block space-y-1">
        <span className="text-xs">{copy("category")}</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Sacrifice["category"])}
          className="w-full border border-black/20 bg-transparent px-2 py-1 text-sm dark:border-white/20"
        >
          {(["TIME", "QUALITY", "SCOPE", "RESOURCE", "RISK", "OTHER"] as const).map((code) => (
            <option key={code} value={code}>
              {enumLabel(locale, "sacrifice", code)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs">{copy("whatSacrificed")}</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder={copy("sacrificePlaceholder")}
          className="w-full border border-black/20 bg-transparent px-2 py-1 text-sm dark:border-white/20"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs">{copy("impact")}</span>
        <textarea
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          required
          rows={3}
          placeholder={copy("impactPlaceholder")}
          className="w-full border border-black/20 bg-transparent px-2 py-1 text-sm dark:border-white/20"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="border border-black/30 px-3 py-1 text-sm dark:border-white/30 disabled:opacity-50"
        >
          {isSubmitting ? copy("adding") : copy("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-black/30 px-3 py-1 text-sm dark:border-white/30"
        >
          {copy("cancel")}
        </button>
      </div>
    </form>
  );
}
