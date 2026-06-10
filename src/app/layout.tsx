import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// metadata.icons does NOT auto-prepend basePath, so we do it ourselves.
// Inlined at build time. Empty on the runtime/standalone build.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: {
    default: "StateBoard · Show, don't tell.",
    template: "%s · StateBoard",
  },
  description:
    "Status reporting for visual products. Mark regions on your screens as shipped, mock, or missing, then share one link execs can read in 30 seconds.",
  icons: { icon: `${BASE_PATH}/icon.svg` },
  // Self-hosted instances are private deployments and must never be indexed.
  // The GitHub Pages build is the project's public face (landing, docs, the
  // example board) — there the ban would hide it from search, so lift it.
  // STATEBOARD_PAGES is set by `pnpm build:pages`, read here at build time.
  robots:
    process.env.STATEBOARD_PAGES === "1"
      ? null
      : { index: false, follow: false },
};

/**
 * Minimal root layout — html + body + fonts only.
 *
 * Per-area styling lives in nested layouts so the MUI app tree and the
 * Fumadocs docs tree don't fight each other:
 *   (site)/layout.tsx  → MUI ClientShell + theme + CssBaseline
 *   docs/layout.tsx    → Fumadocs RootProvider + DocsLayout + Tailwind
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
