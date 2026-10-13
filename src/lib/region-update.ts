import type { Region } from "./types.ts";

export type RegionPatch = Partial<
  Pick<Region, "state" | "label" | "notes" | "x" | "y" | "w" | "h">
>;

/** A saved field must not replace unrelated edits from a newer render. */
export function mergeSavedRegion(
  current: Region,
  saved: Region,
  patch: RegionPatch,
): Region {
  const fields: RegionPatch = {};
  for (const key of Object.keys(patch) as (keyof RegionPatch)[]) {
    Object.assign(fields, { [key]: saved[key] });
  }
  return {
    ...current,
    ...fields,
    updatedAt: saved.updatedAt,
    updatedBy: saved.updatedBy,
  };
}
