import type { RegionState } from "./types";

/**
 * Visual + textual metadata for the three v0 region states.
 * Single source of truth for chip colors, labels, and overlay tints.
 */
export interface StateMeta {
  label: string;
  description: string;
  /** solid color used for chips and outlines */
  color: string;
  /** translucent fill used for region overlays */
  fill: string;
  /** text color rendered against `color` */
  contrast: string;
}

export const STATE_META: Record<RegionState, StateMeta> = {
  shipped: {
    label: "SHIPPED",
    description: "Live, real data, fully wired up",
    color: "#1F8A53",
    fill: "rgba(31, 138, 83, 0.18)",
    contrast: "#FFFFFF",
  },
  mock: {
    label: "MOCK",
    description: "UI is in place but data is hardcoded or fake",
    color: "#D4A11A",
    fill: "rgba(212, 161, 26, 0.20)",
    contrast: "#1A1A1A",
  },
  missing: {
    label: "MISSING",
    description: "Not built yet",
    color: "#C8412B",
    fill: "rgba(200, 65, 43, 0.20)",
    contrast: "#FFFFFF",
  },
};
