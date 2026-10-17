"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { useCopy } from "@/components/locale-provider";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const copy = useCopy();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const item =
    "px-2.5 py-1 text-xs tracking-wide transition-colors";
  const on = "bg-black text-white dark:bg-white dark:text-black";
  const off = "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white";

  return (
    <div
      className="inline-flex shrink-0 border border-black/20 dark:border-white/20"
      role="group"
      aria-label={copy("languageLabel")}
    >
      <button
        type="button"
        onClick={() => choose("zh")}
        aria-pressed={locale === "zh"}
        className={`${item} ${locale === "zh" ? on : off}`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => choose("en")}
        aria-pressed={locale === "en"}
        className={`${item} border-l border-black/20 dark:border-white/20 ${locale === "en" ? on : off}`}
      >
        EN
      </button>
    </div>
  );
}
