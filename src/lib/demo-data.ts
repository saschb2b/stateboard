/**
 * Permanent example board, served from memory at /share/demo.
 *
 * The demo is part of the binary, not the user's data — never written to
 * the database, never copied into uploads/, never mixed into the user's
 * boards grid. Always reachable for first-time orientation and ongoing
 * reference (see CLAUDE.md → "show, don't tell — applies to our own UI").
 *
 * The screen images live in `public/demo/{name}.svg` (static files); this
 * module owns the region annotations that paint over them.
 *
 * Coordinates on regions are normalized to [0..1] just like real data.
 */

import type {
  Board,
  Region,
  RegionState,
  Screen,
  ScreenWithRegions,
} from "./types";

interface DemoRegionDef {
  x: number;
  y: number;
  w: number;
  h: number;
  state: RegionState;
  label: string;
  notes: string | null;
}

interface DemoScreenDef {
  /** Stable id used in URLs and as the screen id. Lower-kebab. */
  name: string;
  label: string;
  width: number;
  height: number;
  regions: DemoRegionDef[];
}

const overviewRegions: DemoRegionDef[] = [
  {
    x: 252 / 1280,
    y: 180 / 720,
    w: 320 / 1280,
    h: 120 / 720,
    state: "shipped",
    label: "Revenue card",
    notes: "Live from Stripe. Updated hourly.",
  },
  {
    x: 592 / 1280,
    y: 180 / 720,
    w: 320 / 1280,
    h: 120 / 720,
    state: "mock",
    label: "Active users metric",
    notes:
      "UI is built but we're still wiring up the analytics ingest — number is hardcoded.",
  },
  {
    x: 932 / 1280,
    y: 180 / 720,
    w: 320 / 1280,
    h: 120 / 720,
    state: "missing",
    label: "Churn rate",
    notes: "Blocked on data warehouse migration. Target: end of Q3.",
  },
  {
    x: 252 / 1280,
    y: 320 / 720,
    w: 660 / 1280,
    h: 280 / 720,
    state: "shipped",
    label: "Revenue trend chart",
    notes: null,
  },
  {
    x: 932 / 1280,
    y: 320 / 720,
    w: 320 / 1280,
    h: 280 / 720,
    state: "mock",
    label: "Top accounts panel",
    notes: "Showing demo data. Real CRM sync ships in v2.",
  },
  {
    x: 252 / 1280,
    y: 630 / 720,
    w: 1000 / 1280,
    h: 60 / 720,
    state: "missing",
    label: "AI summary line",
    notes: "Placeholder text — auto-generated summaries not wired up.",
  },
];

const reportsRegions: DemoRegionDef[] = [
  {
    x: 252 / 1280,
    y: 178 / 720,
    w: 1000 / 1280,
    h: 48 / 720,
    state: "shipped",
    label: "Filter & new-report toolbar",
    notes: null,
  },
  {
    x: 252 / 1280,
    y: 300 / 720,
    w: 1000 / 1280,
    h: 56 / 720,
    state: "shipped",
    label: "Scheduled report row",
    notes: "Cron + last-run shown live.",
  },
  {
    x: 252 / 1280,
    y: 356 / 720,
    w: 1000 / 1280,
    h: 56 / 720,
    state: "mock",
    label: "Daily revenue snapshot",
    notes: "Schedule UI is wired but the runner isn't actually triggering yet.",
  },
  {
    x: 252 / 1280,
    y: 412 / 720,
    w: 1000 / 1280,
    h: 56 / 720,
    state: "missing",
    label: "Cohort retention report",
    notes: "Empty placeholder — report type not implemented.",
  },
  {
    x: 252 / 1280,
    y: 496 / 720,
    w: 488 / 1280,
    h: 180 / 720,
    state: "missing",
    label: "Slack export",
    notes: 'OAuth + delivery not built. The "Connect Slack" button is a stub.',
  },
  {
    x: 764 / 1280,
    y: 496 / 720,
    w: 488 / 1280,
    h: 180 / 720,
    state: "mock",
    label: "PDF export",
    notes: "Renders a static placeholder PDF — real templating in v2.",
  },
];

const SCREEN_DEFS: DemoScreenDef[] = [
  {
    name: "overview",
    label: "Overview",
    width: 1280,
    height: 720,
    regions: overviewRegions,
  },
  {
    name: "reports",
    label: "Reports",
    width: 1280,
    height: 720,
    regions: reportsRegions,
  },
];

/** Stable slug used by `/share/demo`. */
export const DEMO_SLUG = "demo";

const DEMO_BOARD: Board = {
  id: "demo",
  slug: DEMO_SLUG,
  name: "Acme Dashboard / Q2 — example",
  description:
    "A worked example of how a product team uses StateBoard. Two screens, three states, real notes — explore the regions to get a feel for it.",
  createdAt: 0,
  updatedAt: 0,
};

/** Public read of the demo board for `/share/demo`. */
export function getDemoBoard(): { board: Board; screens: ScreenWithRegions[] } {
  const screens: ScreenWithRegions[] = SCREEN_DEFS.map((def, i) => {
    const screen: Screen = {
      id: `demo-${def.name}`,
      boardId: DEMO_BOARD.id,
      filename: `${def.name}.svg`,
      mimeType: "image/svg+xml",
      width: def.width,
      height: def.height,
      label: def.label,
      position: i,
      createdAt: 0,
      mediaUrl: `/demo/${def.name}.svg`,
    };
    const regions: Region[] = def.regions.map((r, j) => ({
      id: `demo-${def.name}-${j}`,
      screenId: screen.id,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      state: r.state,
      label: r.label,
      notes: r.notes,
      createdAt: 0,
      updatedAt: 0,
    }));
    return { ...screen, regions };
  });
  return { board: DEMO_BOARD, screens };
}
