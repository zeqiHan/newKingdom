import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageSwitch } from "@/components/language-switch";
import { LocaleProvider } from "@/components/locale-provider";
import { translate } from "@/lib/i18n";
import { getLocale } from "@/lib/locale.server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: "JudgmentOS",
    description: translate(locale, "tagline"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale === "en" ? "en" : "zh-CN"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider locale={locale}>
          <header className="border-b border-black/10 dark:border-white/10">
            <div className="mx-auto flex max-w-5xl justify-end px-6 pt-3">
              <LanguageSwitch locale={locale} />
            </div>
            <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 pb-4 pt-2">
              <Link href="/projects" className="text-lg font-semibold tracking-tight">
                JudgmentOS
              </Link>
              <p className="text-sm text-black/50 dark:text-white/50">
                {translate(locale, "tagline")}
              </p>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
