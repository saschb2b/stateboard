import { Geist, Geist_Mono } from "next/font/google";

/**
 * The product typefaces, defined once so the app's root layout and the
 * Storybook preview load the identical fonts. Geist (sans + mono) is the
 * deliberate choice: a modern grotesque built for interfaces, the same
 * family Vercel ships its own products with.
 *
 * next/font downloads the files at build time and self-hosts them — no
 * runtime fetch to Google, which keeps the airgap promise.
 */
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
