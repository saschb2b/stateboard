import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Box from "@mui/material/Box";
import { RegionOverlay } from "./region-overlay";
import type { Region, RegionState } from "@/lib/types";

const region = (
  id: string,
  box: [number, number, number, number],
  state: RegionState,
  label: string | null,
  notes: string | null = null,
): Region => ({
  id,
  screenId: "screen-1",
  x: box[0],
  y: box[1],
  w: box[2],
  h: box[3],
  state,
  label,
  notes,
  createdAt: 1785542400000,
  updatedAt: 1785542400000,
  updatedBy: null,
});

const REGIONS: Region[] = [
  region(
    "r1",
    [0.05, 0.08, 0.55, 0.3],
    "shipped",
    "Revenue chart",
    "Live data from the reporting service.",
  ),
  region(
    "r2",
    [0.65, 0.08, 0.3, 0.45],
    "mock",
    "Activity feed",
    "Returns hardcoded fixtures; API lands in #482.",
  ),
  region("r3", [0.05, 0.5, 0.4, 0.4], "missing", "Export to CSV"),
  region("r4", [0.55, 0.62, 0.4, 0.28], "shipped", null),
];

/**
 * The product's core visual: colored rectangles in normalized [0,1]
 * coordinates painted over a screenshot. The dark canvas stands in for
 * the screenshot so the overlay geometry is easy to judge in isolation.
 */
const meta = {
  component: RegionOverlay,
  tags: ["ai-generated"],
  decorators: [
    (Story) => (
      <Box
        sx={{
          position: "relative",
          width: 720,
          aspectRatio: "16 / 10",
          bgcolor: "#101418",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof RegionOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read-only, as the public share view renders it. */
export const ShareView: Story = {
  args: { regions: REGIONS },
};

/** Interactive with a selection, as the editor's viewer mode renders it. */
export const InteractiveSelected: Story = {
  args: { regions: REGIONS, interactive: true, selectedId: "r2" },
};

/** State filter active: everything that isn't `shipped` dims away. */
export const FilteredToShipped: Story = {
  args: { regions: REGIONS, filterState: "shipped" },
};
