/**
 * Board-scoped fuzzy search for the command palette (Ctrl/Cmd+K).
 *
 * Pure and free of `server-only`: it runs entirely in the browser over the
 * board's already-loaded screens and regions, so results are instant and no
 * request leaves the page (airgap-friendly). The scoring is unit-tested here.
 */

import type { RegionState, ScreenWithRegions } from "./types";

/** A slice of snippet text; `match` parts are visually highlighted. */
export interface SnippetPart {
  text: string;
  match: boolean;
}

const SNIPPET_PAD = 32;
const SCREEN_LIMIT = 8;
const REGION_LIMIT = 12;
/** Fixed score for a notes-only hit, kept below any label match so labelled
 *  results always rank first. */
const NOTES_HIT_SCORE = 250;

/**
 * Substring / subsequence match returning a rank score (higher is better), or
 * -1 for no match. A prefix beats a mid-word substring beats a scattered
 * subsequence; shorter haystacks win ties. Ported from the okf-viewer palette.
 */
export function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();

  const idx = h.indexOf(n);
  if (idx === 0) return 1000 - h.length; // prefix: best, shorter wins
  if (idx > 0) {
    // contiguous substring; bonus when it begins a word
    const wordStart = /[\s/_.-]/.test(h.charAt(idx - 1));
    return 600 - idx + (wordStart ? 50 : 0);
  }

  // fuzzy subsequence fallback
  let hi = 0;
  for (const ch of n) {
    while (hi < h.length && h.charAt(hi) !== ch) hi++;
    if (hi >= h.length) return -1;
    hi++;
  }
  return 100 - h.length;
}

/**
 * A one-line highlighted snippet around the first (case-insensitive) occurrence
 * of `needle` in `text`, or null if it isn't a substring. Whitespace collapses
 * so the snippet stays single-line; elisions are marked with `…`.
 */
export function buildSnippet(
  text: string,
  needle: string,
): SnippetPart[] | null {
  const flat = text.replace(/\s+/g, " ").trim();
  const idx = flat.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;

  const start = Math.max(0, idx - SNIPPET_PAD);
  const end = Math.min(flat.length, idx + needle.length + SNIPPET_PAD);
  const parts: SnippetPart[] = [];
  if (start > 0) parts.push({ text: "…", match: false });
  if (idx > start) parts.push({ text: flat.slice(start, idx), match: false });
  parts.push({ text: flat.slice(idx, idx + needle.length), match: true });
  if (end > idx + needle.length) {
    parts.push({ text: flat.slice(idx + needle.length, end), match: false });
  }
  if (end < flat.length) parts.push({ text: "…", match: false });
  return parts;
}

export interface ScreenHit {
  screenId: string;
  name: string;
  score: number;
}

export interface RegionHit {
  screenId: string;
  screenName: string;
  regionId: string;
  label: string | null;
  state: RegionState;
  /** Present when the hit was on the notes, absent for a label match. */
  snippet: SnippetPart[] | null;
  score: number;
}

/** The screen's display name, matching the editor's `label || "Screen N"`. */
export function screenName(
  screen: { label: string | null },
  index: number,
): string {
  return screen.label || `Screen ${index + 1}`;
}

/**
 * Rank a board's screens and regions against a query. Screens match on their
 * name; regions match on their label (fuzzy) or their notes (substring, with a
 * highlighted snippet) — so "bits you remember from an area" find the region,
 * and through it the screen. Empty query returns nothing (the palette shows all
 * screens itself in that case).
 */
export function searchBoard(
  screens: ScreenWithRegions[],
  query: string,
): { screens: ScreenHit[]; regions: RegionHit[] } {
  const needle = query.trim();
  if (!needle) return { screens: [], regions: [] };

  const screenHits: ScreenHit[] = screens
    .map((s, i) => {
      const name = screenName(s, i);
      return { screenId: s.id, name, score: fuzzyScore(name, needle) };
    })
    .filter((h) => h.score >= 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, SCREEN_LIMIT);

  const regionHits: RegionHit[] = [];
  screens.forEach((s, i) => {
    const name = screenName(s, i);
    for (const r of s.regions) {
      const labelScore = r.label ? fuzzyScore(r.label, needle) : -1;
      const snippet =
        labelScore >= 0 ? null : r.notes ? buildSnippet(r.notes, needle) : null;
      if (labelScore < 0 && !snippet) continue;
      regionHits.push({
        screenId: s.id,
        screenName: name,
        regionId: r.id,
        label: r.label,
        state: r.state,
        snippet,
        score: labelScore >= 0 ? labelScore : NOTES_HIT_SCORE,
      });
    }
  });
  regionHits.sort((a, b) => b.score - a.score);

  return { screens: screenHits, regions: regionHits.slice(0, REGION_LIMIT) };
}
