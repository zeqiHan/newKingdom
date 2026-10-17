"use client";

/**
 * Sacrifice Declaration Component
 * 
 * Displays and manages sacrifice declarations
 * Core principle: Make the cost visible. You must sacrifice something to gain something.
 */

import { useState } from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { enumLabel } from "@/lib/i18n";
import type { Sacrifice } from "@/lib/db/schema";

type SacrificeDeclarationProps = {
  sacrifices: Sacrifice[];
  onAccept: (sacrifices: Sacrifice[]) => Promise<void>;
  onModify: (sacrificeId: string, updates: Partial<Sacrifice>) => Promise<void>;
  onAddCustom?: () => void;
  isAccepted: boolean;
  level: "project" | "action";
  loading?: boolean;
};

const CATEGORY_CODES = ["TIME", "QUALITY", "SCOPE", "RESOURCE", "RISK", "OTHER"] as const;

const fieldClass =
  "w-full border border-black/20 bg-transparent px-2 py-1 text-sm dark:border-white/20";
const buttonClass =
  "border border-black/30 px-3 py-1 text-sm disabled:opacity-40 dark:border-white/30";

export function SacrificeDeclaration({
  sacrifices,
  onAccept,
  onModify,
  onAddCustom,
  isAccepted,
  level,
  loading = false,
}: SacrificeDeclarationProps) {
  const copy = useCopy();
  const locale = useLocale();
  const [editingSacrificeId, setEditingSacrificeId] = useState<string | null>(null);
  const [editedSacrifices, setEditedSacrifices] = useState<Sacrifice[]>(sacrifices);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (sacrificeId: string) => {
    setEditingSacrificeId(sacrificeId);
  };

  const handleSaveEdit = async (sacrificeId: string) => {
    const editedSacrifice = editedSacrifices.find((s) => s.id === sacrificeId);
    if (!editedSacrifice) return;

    const original = sacrifices.find((s) => s.id === sacrificeId);
    if (!original) return;

    const updates: Partial<Sacrifice> = {};
    if (editedSacrifice.description !== original.description) {
      updates.description = editedSacrifice.description;
    }
    if (editedSacrifice.impact !== original.impact) {
      updates.impact = editedSacrifice.impact;
    }
    if (editedSacrifice.category !== original.category) {
      updates.category = editedSacrifice.category;
    }

    if (Object.keys(updates).length > 0) {
      await onModify(sacrificeId, updates);
    }
    setEditingSacrificeId(null);
  };

  const handleCancelEdit = () => {
    setEditedSacrifices(sacrifices);
    setEditingSacrificeId(null);
  };

  const handleUpdateSacrifice = (
    sacrificeId: string,
    field: keyof Sacrifice,
    value: string
  ) => {
    setEditedSacrifices((prev) =>
      prev.map((s) =>
        s.id === sacrificeId ? { ...s, [field]: value, userModified: true } : s
      )
    );
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(editedSacrifices);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">{copy("generatingSacrifices")}</p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="border border-dashed border-black/20 p-3 dark:border-white/20">
        <p className="font-medium">
          {level === "project"
            ? copy("sacrificeProjectQ")
            : copy("sacrificeActionQ")}
        </p>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {level === "project"
            ? copy("sacrificeProjectBody")
            : copy("sacrificeActionBody")}
        </p>
      </div>

      <div className="space-y-3">
        {editedSacrifices.map((sacrifice) => {
          const isEditing = editingSacrificeId === sacrifice.id;
          const marks = [
            sacrifice.userModified ? copy("modified") : null,
            sacrifice.aiGenerated && !sacrifice.userModified ? copy("aiSuggested") : null,
          ].filter(Boolean);

          return (
            <div
              key={sacrifice.id}
              className="border border-black/10 p-3 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-black/40 dark:text-white/40">
                  {enumLabel(locale, "sacrifice", sacrifice.category)}
                  {marks.length > 0 ? ` · ${marks.join(" · ")}` : ""}
                </p>
                {!isAccepted && (
                  <button
                    type="button"
                    onClick={() =>
                      isEditing
                        ? handleSaveEdit(sacrifice.id)
                        : handleEdit(sacrifice.id)
                    }
                    className={buttonClass}
                  >
                    {isEditing ? copy("save") : copy("edit")}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-black/50 dark:text-white/50">{copy("category")}</span>
                    <select
                      value={sacrifice.category}
                      onChange={(e) =>
                        handleUpdateSacrifice(
                          sacrifice.id,
                          "category",
                          e.target.value
                        )
                      }
                      className={fieldClass}
                    >
                      {CATEGORY_CODES.map((code) => (
                        <option key={code} value={code}>
                          {enumLabel(locale, "sacrifice", code)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-black/50 dark:text-white/50">{copy("whatWillBeSacrificed")}</span>
                    <input
                      type="text"
                      value={sacrifice.description}
                      onChange={(e) =>
                        handleUpdateSacrifice(
                          sacrifice.id,
                          "description",
                          e.target.value
                        )
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-black/50 dark:text-white/50">{copy("impact")}</span>
                    <textarea
                      value={sacrifice.impact}
                      onChange={(e) =>
                        handleUpdateSacrifice(
                          sacrifice.id,
                          "impact",
                          e.target.value
                        )
                      }
                      rows={2}
                      className={fieldClass}
                    />
                  </label>
                  <button type="button" onClick={handleCancelEdit} className={buttonClass}>
                    {copy("cancel")}
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <p>{sacrifice.description}</p>
                  <p className="mt-1 text-xs text-black/50 dark:text-white/50">{sacrifice.impact}</p>
                </div>
              )}

              {sacrifice.acceptedAt && (
                <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                  {copy("acceptedOn", { time: new Date(sacrifice.acceptedAt).toLocaleString(locale === "en" ? "en" : "zh-CN") })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!isAccepted && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isSubmitting}
            className={buttonClass}
          >
            {isSubmitting ? copy("accepting") : copy("acceptSacrifices")}
          </button>
          {onAddCustom && (
            <button type="button" onClick={onAddCustom} className={buttonClass}>
              {copy("addCustom")}
            </button>
          )}
        </div>
      )}

      {isAccepted && (
        <p className="border border-dashed border-black/20 p-3 text-xs text-black/50 dark:border-white/20 dark:text-white/50">
          {copy("sacrificesAccepted")}
        </p>
      )}
    </div>
  );
}
