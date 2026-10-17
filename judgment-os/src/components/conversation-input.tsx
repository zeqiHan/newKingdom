"use client";

/**
 * Conversation Input Component
 * 
 * Core principle: Users should just talk, not fill forms.
 * 
 * This replaces form-based input with natural language conversation.
 */

import { useState } from "react";
import { useCopy } from "@/components/locale-provider";

type ConversationInputProps = {
  placeholder?: string;
  onSubmit: (message: string) => Promise<void>;
  multiline?: boolean;
  submitLabel?: string;
  disabled?: boolean;
};

export function ConversationInput({
  placeholder,
  onSubmit,
  multiline = true,
  submitLabel,
  disabled = false,
}: ConversationInputProps) {
  const copy = useCopy();
  const placeholderText = placeholder ?? copy("talkPlaceholder");
  const submitText = submitLabel ?? copy("analyzeShort");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(message);
      setMessage("");
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        {multiline ? (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || isSubmitting}
            rows={6}
            className="w-full px-4 py-3 border border-black/20 dark:border-white/20 bg-transparent rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50 font-normal"
          />
        ) : (
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={disabled || isSubmitting}
            className="w-full px-4 py-3 border border-black/20 dark:border-white/20 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
          />
        )}
        
        <div className="absolute bottom-3 right-3 text-xs text-black/40 dark:text-white/40">
          {multiline && copy("submitShortcut")}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-black/50 dark:text-white/50">
          {copy("aiFills")}
        </p>
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSubmitting}
          className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity"
        >
          {isSubmitting ? copy("analyzing") : submitText}
        </button>
      </div>
    </form>
  );
}

/**
 * Example usage hint component
 */
export function ConversationExamples({ onSelectExample }: { onSelectExample: (example: string) => void }) {
  const copy = useCopy();
  const examples = [
    { label: copy("exampleMvp"), text: copy("exampleMvpText") },
    { label: copy("exampleLearn"), text: copy("exampleLearnText") },
    { label: copy("exampleSide"), text: copy("exampleSideText") },
  ];

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
        {copy("viewExamples")}
      </summary>
      <div className="mt-3 space-y-2">
        {examples.map((example, i) => (
          <button
            key={i}
            onClick={() => onSelectExample(example.text)}
            className="w-full text-left p-3 border border-black/10 dark:border-white/10 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <p className="font-medium text-xs text-black/70 dark:text-white/70 mb-1">
              {example.label}
            </p>
            <p className="text-xs text-black/50 dark:text-white/50 line-clamp-2">
              {example.text}
            </p>
          </button>
        ))}
      </div>
    </details>
  );
}
