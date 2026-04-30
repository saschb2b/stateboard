import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "StateBoard — Show, don't tell.",
    template: "%s · StateBoard",
  },
  description:
    "Status reporting for visual products. Mark regions on your screens as shipped, mock, or missing — and share one link execs can read in 30 seconds.",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
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
