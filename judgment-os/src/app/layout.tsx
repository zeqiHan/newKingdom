import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JudgmentOS",
  description: "建立判断力，而不只是做决定。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 py-4">
            <Link href="/projects" className="text-lg font-semibold tracking-tight">
              JudgmentOS
            </Link>
            <p className="text-sm text-black/50 dark:text-white/50">
              建立判断力，而不只是做决定。
            </p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
