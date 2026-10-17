import type { Locale } from "@/lib/i18n";

/** Tell the model which language to write. Default is Simplified Chinese. */
export function outputLanguageInstruction(locale: Locale = "zh"): string {
  if (locale === "en") {
    return "The interface language is English. Every user-facing string you write must be English, even if this prompt, its examples, or the user's existing notes are in another language. Leave JSON keys, enum codes, and URLs unchanged.";
  }
  return "界面语言是简体中文。你写出的所有面向用户的文字必须使用简体中文，即使本提示词、示例或用户已有笔记是其他语言。JSON 键名、枚举代码和 URL 保持原样。";
}

export function withOutputLanguage(prompt: string, locale: Locale = "zh"): string {
  return `${prompt}\n\n${outputLanguageInstruction(locale)}`;
}
