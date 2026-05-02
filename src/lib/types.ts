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
