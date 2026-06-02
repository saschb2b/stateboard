/**
 * Core domain types for StateBoard.
 *
 * Coordinates on regions are stored as relative values in [0, 1],
 * so a single screenshot renders correctly at any display size.
 */

export const REGION_STATES = ["shipped", "mock", "missing"] as const;
export type RegionState = (typeof REGION_STATES)[number];

export const WORKSPACE_ROLES = ["owner", "editor", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  updatedBy: string | null;
}

export interface Screen {
  id: string;
  boardId: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  label: string | null;
  position: number;
  createdAt: number;
  /**
   * Where the rendering surface should fetch the image bytes.
   *
   * For DB-loaded screens this is `/api/uploads/{filename}`. The static
   * demo board uses `/demo/{name}.svg` and bypasses the uploads pipeline
   * entirely — see `getDemoBoard()`.
   */
  mediaUrl: string;
}

export interface Region {
  id: string;
  screenId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  state: RegionState;
  label: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  updatedBy: string | null;
}

export interface BoardWithScreens extends Board {
  screens: ScreenWithRegions[];
}

export interface ScreenWithRegions extends Screen {
  regions: Region[];
}

export interface ShareLink {
  token: string;
  boardId: string;
  label: string | null;
  createdBy: string | null;
  createdAt: number;
  revokedAt: number | null;
}

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  createdAt: number;
  /** Joined from the auth `user` table for convenience in the UI. */
  name: string | null;
  email: string | null;
  image: string | null;
}

/** Narrows an unknown to a finite number within the normalized [0, 1] range. */
export const isFiniteIn01 = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;

/**
 * Per-field character caps for the free-text columns. They're plain `TEXT` in
 * Postgres (unbounded), so we enforce a generous ceiling at the API boundary:
 * enough for any real title / description / note, but small enough that a
 * hostile client can't store megabytes that every board fetch — and the public
 * share page — would then have to ship on every read.
 */
export const TEXT_LIMITS = {
  name: 200,
  description: 2000,
  label: 200,
  notes: 10_000,
} as const;

/**
 * Returns a human-readable error if `value` (already trimmed by the caller)
 * exceeds `max` characters, else `null`. A `null` value always passes — an
 * absent or cleared field has no length to check. Counts UTF-16 code units,
 * which is the unit JS `.length` and Postgres `char_length` agree on closely
 * enough for a coarse abuse ceiling.
 */
export function checkTextLength(
  value: string | null,
  field: string,
  max: number,
): string | null {
  if (value !== null && value.length > max) {
    return `${field} must be at most ${max} characters`;
  }
  return null;
}

export type RegionBoxResult =
  | { ok: true; box: { x: number; y: number; w: number; h: number } }
  | { ok: false; error: string };

/**
 * Validates the region box invariant in one place, so the create and update
 * paths can't drift apart: each coordinate in [0, 1], non-zero area, and the
 * box stays within the screen (x+w, y+h ≤ 1). The small epsilon absorbs the
 * floating-point drift from the browser's pixel→relative conversion, so a box
 * drawn flush to an edge isn't rejected.
 *
 * Returns the narrowed box on success, or a human-readable reason on failure.
 */
export function validateRegionBox(input: {
  x?: unknown;
  y?: unknown;
  w?: unknown;
  h?: unknown;
}): RegionBoxResult {
  const { x, y, w, h } = input;
  if (
    !isFiniteIn01(x) ||
    !isFiniteIn01(y) ||
    !isFiniteIn01(w) ||
    !isFiniteIn01(h)
  ) {
    return { ok: false, error: "x, y, w, h must each be numbers in [0, 1]" };
  }
  if (w <= 0 || h <= 0) {
    return { ok: false, error: "region must have non-zero size" };
  }
  if (x + w > 1.0001 || y + h > 1.0001) {
    return { ok: false, error: "region extends beyond screen bounds" };
  }
  return { ok: true, box: { x, y, w, h } };
}
