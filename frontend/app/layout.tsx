import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Intelligence",
  description: "Describe the data you need. Get a sourced dataset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-ink"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
                D
              </span>
              Data Intelligence
            </Link>

            <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Every value traces to a source
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}