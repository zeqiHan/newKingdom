"use client";

/**
 * Conversation Input Component
 * 
 * Core principle: Users should just talk, not fill forms.
 * 
 * This replaces form-based input with natural language conversation.
 */

import { useState } from "react";

type ConversationInputProps = {
  placeholder?: string;
  onSubmit: (message: string) => Promise<void>;
  multiline?: boolean;
  submitLabel?: string;
  disabled?: boolean;
};

export function ConversationInput({
  placeholder = "说一段话，描述你的项目...",
  onSubmit,
  multiline = true,
  submitLabel = "分析并创建",
  disabled = false,
}: ConversationInputProps) {
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
            placeholder={placeholder}
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
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            className="w-full px-4 py-3 border border-black/20 dark:border-white/20 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 disabled:opacity-50"
          />
        )}
        
        <div className="absolute bottom-3 right-3 text-xs text-black/40 dark:text-white/40">
          {multiline && "⌘/Ctrl + Enter 提交"}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-black/50 dark:text-white/50">
          💬 AI 会自动分析你的描述，填充所有框架字段
        </p>
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSubmitting}
          className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity"
        >
          {isSubmitting ? "分析中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

/**
 * Example usage hint component
 */
export function ConversationExamples({ onSelectExample }: { onSelectExample: (example: string) => void }) {
  const examples = [
    {
      label: "快速MVP",
      text: "我想两周内做出一个自己真正会使用的判断力训练工具。主要是帮我管理项目里的不确定性和决策。约束是只有我一个人开发，技术栈用Next.js。我可以牺牲完美主义和代码质量，但不能牺牲核心功能的完整性。"
    },
    {
      label: "学习项目",
      text: "用一个月时间深入学习 Rust，目标是能写出一个命令行工具。成功标准是写一个能解决真实问题的CLI，有测试覆盖。约束是每天只有晚上2小时，周末可以投入更多时间。"
    },
    {
      label: "Side Project",
      text: "想做一个记录个人决策的工具，帮助我反思自己的判断模式。3个月内完成，可以牺牲UI美观度，但必须有完整的数据分析功能。不确定的是我能不能坚持每天记录。"
    }
  ];

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white">
        查看示例 →
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
