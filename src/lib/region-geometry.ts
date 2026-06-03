/**
 * Pure geometry for region boxes in normalized [0, 1] space. Shared by the
 * editor's mouse-drag and keyboard-nudge paths, and unit-tested directly so the
 * clamping invariants (never invert, never leave the screenshot) are pinned
 * down without standing up the React component.
 */

export type Box = { x: number; y: number; w: number; h: number };
export type ResizeCorner = "nw" | "ne" | "sw" | "se";

/** Minimum box size (relative units) so a region can never collapse to a line. */
export const MIN_REGION_SIZE = 0.005;

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Slide a whole box by a delta, kept fully inside [0, 1]. Size is preserved. */
export function moveBox(orig: Box, dx: number, dy: number): Box {
  return {
    x: clamp(orig.x + dx, 0, 1 - orig.w),
    y: clamp(orig.y + dy, 0, 1 - orig.h),
    w: orig.w,
    h: orig.h,
  };
}

/**
 * Drag one corner of a box by a delta while the opposite edges stay pinned.
 * Clamped to [0, 1] with a minimum size, so the box can never invert or leave
 * the frame.
 */
export function resizeBox(
  orig: Box,
  corner: ResizeCorner,
  dx: number,
  dy: number,
): Box {
  const { x, y, w, h } = orig;
  const right = x + w;
  const bottom = y + h;
  let nx = x;
  let ny = y;
  let nw = w;
  let nh = h;
  if (corner.includes("w")) {
    nx = clamp(x + dx, 0, right - MIN_REGION_SIZE);
    nw = right - nx;
  } else {
    nw = clamp(w + dx, MIN_REGION_SIZE, 1 - x);
  }
  if (corner.includes("n")) {
    ny = clamp(y + dy, 0, bottom - MIN_REGION_SIZE);
    nh = bottom - ny;
  } else {
    nh = clamp(h + dy, MIN_REGION_SIZE, 1 - y);
  }
  return { x: nx, y: ny, w: nw, h: nh };
}

/**
 * Keyboard nudge for the selected region: an arrow moves the box one step;
 * shift+arrow (resize=true) grows or shrinks it from the bottom-right edge.
 * Same clamping as the drag path. Unknown keys return the box unchanged.
 */
export function nudgeBox(
  box: Box,
  key: string,
  resize: boolean,
  step: number,
): Box {
  let { x, y, w, h } = box;
  if (resize) {
    if (key === "ArrowRight") w = clamp(w + step, MIN_REGION_SIZE, 1 - x);
    else if (key === "ArrowLeft") w = clamp(w - step, MIN_REGION_SIZE, 1 - x);
    else if (key === "ArrowDown") h = clamp(h + step, MIN_REGION_SIZE, 1 - y);
    else if (key === "ArrowUp") h = clamp(h - step, MIN_REGION_SIZE, 1 - y);
  } else {
    if (key === "ArrowRight") x = clamp(x + step, 0, 1 - w);
    else if (key === "ArrowLeft") x = clamp(x - step, 0, 1 - w);
    else if (key === "ArrowDown") y = clamp(y + step, 0, 1 - h);
    else if (key === "ArrowUp") y = clamp(y - step, 0, 1 - h);
  }
  return { x, y, w, h };
}
