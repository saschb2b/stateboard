/**
 * Core domain types for StateBoard.
 *
 * Coordinates on regions are stored as relative values in [0, 1],
 * so a single screenshot renders correctly at any display size.
 */

export const REGION_STATES = ["shipped", "mock", "missing"] as const;
export type RegionState = (typeof REGION_STATES)[number];

export interface Board {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
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
}

export interface BoardWithScreens extends Board {
  screens: ScreenWithRegions[];
}

export interface ScreenWithRegions extends Screen {
  regions: Region[];
}
