"use client";

/**
 * Sacrifice Declaration Component
 * 
 * Displays and manages sacrifice declarations
 * Core principle: Make the cost visible. You must sacrifice something to gain something.
 */

import { useState } from "react";
import type { Sacrifice, SacrificeCategory } from "@/lib/db/schema";

type SacrificeDeclarationProps = {
  sacrifices: Sacrifice[];
  onAccept: (sacrifices: Sacrifice[]) => Promise<void>;
  onModify: (sacrificeId: string, updates: Partial<Sacrifice>) => Promise<void>;
  onAddCustom?: () => void;
  isAccepted: boolean;
  level: "project" | "action";
  loading?: boolean;
};

const CATEGORY_COLORS: Record<SacrificeCategory, string> = {
  TIME: "bg-orange-100 text-orange-800 border-orange-300",
  QUALITY: "bg-red-100 text-red-800 border-red-300",
  SCOPE: "bg-blue-100 text-blue-800 border-blue-300",
  RESOURCE: "bg-purple-100 text-purple-800 border-purple-300",
  RISK: "bg-yellow-100 text-yellow-800 border-yellow-300",
  OTHER: "bg-gray-100 text-gray-800 border-gray-300",
};

const CATEGORY_ICONS: Record<SacrificeCategory, string> = {
  TIME: "⏱️",
  QUALITY: "⚠️",
  SCOPE: "🎯",
  RESOURCE: "💰",
  RISK: "🎲",
  OTHER: "📋",
};

export function SacrificeDeclaration({
  sacrifices,
  onAccept,
  onModify,
  onAddCustom,
  isAccepted,
  level,
  loading = false,
}: SacrificeDeclarationProps) {
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          {level === "project" 
            ? "What are you willing to sacrifice?" 
            : "What will this action require you to sacrifice?"}
        </h3>
        <p className="text-sm text-amber-800">
          {level === "project"
            ? "Every goal requires tradeoffs. Be honest about what you're willing to give up to achieve this."
            : "This specific action has costs. Understanding them now prevents regret later."}
        </p>
      </div>

      <div className="space-y-3">
        {editedSacrifices.map((sacrifice, index) => {
          const isEditing = editingSacrificeId === sacrifice.id;
          const colorClass = CATEGORY_COLORS[sacrifice.category];
          const icon = CATEGORY_ICONS[sacrifice.category];

          return (
            <div
              key={sacrifice.id}
              className={`border rounded-lg p-4 ${
                isAccepted ? "bg-gray-50" : "bg-white"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded border ${colorClass}`}
                  >
                    {sacrifice.category}
                  </span>
                  {sacrifice.userModified && (
                    <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded">
                      Modified
                    </span>
                  )}
                  {sacrifice.aiGenerated && !sacrifice.userModified && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded">
                      AI-suggested
                    </span>
                  )}
                </div>
                {!isAccepted && (
                  <button
                    onClick={() =>
                      isEditing
                        ? handleSaveEdit(sacrifice.id)
                        : handleEdit(sacrifice.id)
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {isEditing ? "Save" : "Edit"}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={sacrifice.category}
                      onChange={(e) =>
                        handleUpdateSacrifice(
                          sacrifice.id,
                          "category",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="TIME">TIME</option>
                      <option value="QUALITY">QUALITY</option>
                      <option value="SCOPE">SCOPE</option>
                      <option value="RESOURCE">RESOURCE</option>
                      <option value="RISK">RISK</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      What will be sacrificed
                    </label>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Impact / Consequence
                    </label>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    {sacrifice.description}
                  </p>
                  <p className="text-sm text-gray-600">{sacrifice.impact}</p>
                </div>
              )}

              {sacrifice.acceptedAt && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ Accepted on {new Date(sacrifice.acceptedAt).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isAccepted && (
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? "Accepting..." : "Accept These Sacrifices"}
          </button>
          {onAddCustom && (
            <button
              onClick={onAddCustom}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              + Add Custom
            </button>
          )}
        </div>
      )}

      {isAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✓ Sacrifices accepted. You've made the tradeoffs explicit and taken
          ownership of the costs.
        </div>
      )}
    </div>
  );
}
