/**
 * Permanent example board, served from memory at /v/demo.
 *
 * The demo is part of the binary, not the user's data — never written to
 * the database, never copied into uploads/, never mixed into the user's
 * boards grid. Always reachable for first-time orientation and ongoing
 * reference (see CLAUDE.md → "show, don't tell — applies to our own UI").
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
  svg: string;
  regions: DemoRegionDef[];
}

/* ----- Screen 1: Overview ------------------------------------------------- */

const overviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#162028"/>
      <stop offset="1" stop-color="#0F1418"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="#0E1418"/>

  <!-- Sidebar -->
  <rect x="0" y="0" width="220" height="720" fill="#101820"/>
  <rect x="24" y="28" width="120" height="14" rx="3" fill="#3A4750"/>
  <rect x="24" y="80"  width="170" height="34" rx="6" fill="#1B2730"/>
  <rect x="40" y="92"  width="110" height="10" rx="3" fill="#2C3A41"/>
  <rect x="40" y="132" width="120" height="10" rx="3" fill="#1F2A30"/>
  <rect x="40" y="162" width="100" height="10" rx="3" fill="#1F2A30"/>
  <rect x="40" y="192" width="130" height="10" rx="3" fill="#1F2A30"/>
  <rect x="40" y="222" width="90"  height="10" rx="3" fill="#1F2A30"/>

  <!-- Top bar -->
  <rect x="220" y="0" width="1060" height="64" fill="#0F1418"/>
  <rect x="252" y="22" width="190" height="20" rx="4" fill="#1B2730"/>
  <rect x="1130" y="22" width="120" height="20" rx="10" fill="#1B2730"/>

  <!-- Page header -->
  <text x="252" y="118" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="700" fill="#ECECEC">Overview</text>
  <text x="252" y="146" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#7A8A92">Last 30 days</text>

  <!-- KPI row -->
  <rect x="252" y="180" width="320" height="120" rx="8" fill="url(#card)" stroke="#1E2A32"/>
  <text x="276" y="210" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Revenue</text>
  <text x="276" y="258" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="700" fill="#ECECEC">$284,920</text>
  <text x="276" y="282" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#3DBE6D">▲ 12.4% vs last period</text>

  <rect x="592" y="180" width="320" height="120" rx="8" fill="url(#card)" stroke="#1E2A32"/>
  <text x="616" y="210" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Active users</text>
  <text x="616" y="258" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="700" fill="#ECECEC">1,420</text>
  <text x="616" y="282" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#7A8A92">— same as last week</text>

  <rect x="932" y="180" width="320" height="120" rx="8" fill="url(#card)" stroke="#1E2A32"/>
  <text x="956" y="210" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Churn rate</text>
  <text x="956" y="258" font-family="system-ui,-apple-system,sans-serif" font-size="34" font-weight="700" fill="#475763">—</text>
  <text x="956" y="282" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#7A8A92">No data yet</text>

  <!-- Chart -->
  <rect x="252" y="320" width="660" height="280" rx="8" fill="url(#card)" stroke="#1E2A32"/>
  <text x="276" y="352" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600" fill="#ECECEC">Revenue trend</text>
  <text x="276" y="372" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#7A8A92">Daily, last 30 days</text>
  <g transform="translate(276, 410)">
    <rect x="0"   y="120" width="20" height="50"  rx="2" fill="#243038"/>
    <rect x="32"  y="100" width="20" height="70"  rx="2" fill="#243038"/>
    <rect x="64"  y="80"  width="20" height="90"  rx="2" fill="#243038"/>
    <rect x="96"  y="110" width="20" height="60"  rx="2" fill="#243038"/>
    <rect x="128" y="60"  width="20" height="110" rx="2" fill="#243038"/>
    <rect x="160" y="40"  width="20" height="130" rx="2" fill="#243038"/>
    <rect x="192" y="70"  width="20" height="100" rx="2" fill="#243038"/>
    <rect x="224" y="50"  width="20" height="120" rx="2" fill="#243038"/>
    <rect x="256" y="30"  width="20" height="140" rx="2" fill="#243038"/>
    <rect x="288" y="20"  width="20" height="150" rx="2" fill="#243038"/>
    <rect x="320" y="10"  width="20" height="160" rx="2" fill="#3DBE6D"/>
    <rect x="352" y="40"  width="20" height="130" rx="2" fill="#243038"/>
    <rect x="384" y="60"  width="20" height="110" rx="2" fill="#243038"/>
    <rect x="416" y="30"  width="20" height="140" rx="2" fill="#243038"/>
    <rect x="448" y="0"   width="20" height="170" rx="2" fill="#3DBE6D"/>
    <rect x="480" y="40"  width="20" height="130" rx="2" fill="#243038"/>
    <rect x="512" y="80"  width="20" height="90"  rx="2" fill="#243038"/>
    <rect x="544" y="60"  width="20" height="110" rx="2" fill="#243038"/>
    <rect x="576" y="100" width="20" height="70"  rx="2" fill="#243038"/>
    <rect x="608" y="120" width="20" height="50"  rx="2" fill="#243038"/>
  </g>

  <!-- Side panel -->
  <rect x="932" y="320" width="320" height="280" rx="8" fill="url(#card)" stroke="#1E2A32"/>
  <text x="956" y="352" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600" fill="#ECECEC">Top accounts</text>
  <text x="956" y="372" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#7A8A92">By revenue this quarter</text>
  <g transform="translate(956, 396)">
    <rect x="0" y="0"   width="270" height="32" rx="4" fill="#1B2730"/>
    <rect x="0" y="40"  width="270" height="32" rx="4" fill="#1B2730"/>
    <rect x="0" y="80"  width="270" height="32" rx="4" fill="#1B2730"/>
    <rect x="0" y="120" width="270" height="32" rx="4" fill="#1B2730"/>
    <rect x="0" y="160" width="270" height="32" rx="4" fill="#1B2730"/>
  </g>

  <!-- Footer status bar -->
  <rect x="252" y="630" width="1000" height="60" rx="8" fill="#101820" stroke="#1E2A32"/>
  <text x="276" y="666" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Q2 2026 update — revenue is up 12% over Q1, with new enterprise contracts driving the bulk.</text>
</svg>`;

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

/* ----- Screen 2: Reports -------------------------------------------------- */

const reportsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="rcard" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#162028"/>
      <stop offset="1" stop-color="#0F1418"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="#0E1418"/>

  <rect x="0" y="0" width="220" height="720" fill="#101820"/>
  <rect x="24" y="28" width="120" height="14" rx="3" fill="#3A4750"/>
  <rect x="24" y="80"  width="170" height="34" rx="6" fill="#1F2A30"/>
  <rect x="24" y="120" width="170" height="34" rx="6" fill="#1B2730"/>
  <rect x="40" y="132" width="110" height="10" rx="3" fill="#2C3A41"/>

  <rect x="220" y="0" width="1060" height="64" fill="#0F1418"/>
  <text x="252" y="118" font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="700" fill="#ECECEC">Reports</text>
  <text x="252" y="146" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#7A8A92">Build, schedule, and export your team's reports.</text>

  <rect x="252" y="178" width="1000" height="48" rx="8" fill="url(#rcard)" stroke="#1E2A32"/>
  <rect x="272" y="194" width="160" height="16" rx="4" fill="#1B2730"/>
  <rect x="448" y="194" width="120" height="16" rx="4" fill="#1B2730"/>
  <rect x="1140" y="190" width="100" height="24" rx="6" fill="#F26B2D"/>
  <text x="1163" y="207" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="#0E1418">+ New report</text>

  <rect x="252" y="248" width="1000" height="44" rx="6" fill="#101820"/>
  <text x="272" y="275" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600" fill="#7A8A92" letter-spacing="1">NAME</text>
  <text x="500" y="275" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600" fill="#7A8A92" letter-spacing="1">SCHEDULE</text>
  <text x="700" y="275" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600" fill="#7A8A92" letter-spacing="1">LAST RUN</text>
  <text x="900" y="275" font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600" fill="#7A8A92" letter-spacing="1">OWNER</text>

  <g transform="translate(252, 300)">
    <rect x="0"   y="0"   width="1000" height="56" fill="url(#rcard)" stroke="#1E2A32"/>
    <text x="20"  y="32" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#ECECEC">Q2 board review</text>
    <text x="248" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Weekly · Mondays 09:00</text>
    <text x="448" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">2 days ago</text>
    <text x="648" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Sasha</text>

    <rect x="0"   y="56"  width="1000" height="56" fill="url(#rcard)" stroke="#1E2A32"/>
    <text x="20"  y="88" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#ECECEC">Revenue snapshot</text>
    <text x="248" y="88" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Daily · 06:00</text>
    <text x="448" y="88" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">14 hours ago</text>
    <text x="648" y="88" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">Finance</text>

    <rect x="0"   y="112" width="1000" height="56" fill="url(#rcard)" stroke="#1E2A32"/>
    <text x="20"  y="144" font-family="system-ui,-apple-system,sans-serif" font-size="14" fill="#7A8A92">Cohort retention</text>
    <text x="248" y="144" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#475763">Not scheduled</text>
    <text x="448" y="144" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#475763">Never</text>
    <text x="648" y="144" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#7A8A92">—</text>
  </g>

  <rect x="252" y="496" width="488" height="180" rx="8" fill="url(#rcard)" stroke="#1E2A32"/>
  <text x="276" y="528" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600" fill="#ECECEC">Slack export</text>
  <text x="276" y="552" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#7A8A92">Send a digest to #leadership every Monday.</text>
  <rect x="276" y="572" width="200" height="32" rx="4" fill="#1B2730"/>
  <text x="296" y="592" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#7A8A92">#leadership</text>
  <rect x="276" y="616" width="120" height="28" rx="4" fill="#3A4750"/>
  <text x="296" y="635" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="#ECECEC">Connect Slack</text>

  <rect x="764" y="496" width="488" height="180" rx="8" fill="url(#rcard)" stroke="#1E2A32"/>
  <text x="788" y="528" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="600" fill="#ECECEC">PDF export</text>
  <text x="788" y="552" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#7A8A92">Generate a printable summary.</text>
  <rect x="788" y="572" width="80" height="64" rx="4" fill="#1B2730"/>
  <text x="800" y="612" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#7A8A92">PDF</text>
</svg>`;

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
    svg: overviewSvg,
    regions: overviewRegions,
  },
  {
    name: "reports",
    label: "Reports",
    width: 1280,
    height: 720,
    svg: reportsSvg,
    regions: reportsRegions,
  },
];

/** Stable slug used by `/v/demo`. */
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

/** Public read of the demo board for `/v/demo`. */
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

/** Internal lookup used by the /demo/[name] asset route. */
export function getDemoSvg(name: string): string | null {
  const def = SCREEN_DEFS.find((s) => s.name === name);
  return def ? def.svg : null;
}
