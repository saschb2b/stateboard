import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Box from "@mui/material/Box";
import { expect, fn, userEvent, within } from "storybook/test";
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
          bgcolor: "background.default",
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

export const KeyboardRegionSelection: Story = {
  args: {
    regions: REGIONS,
    interactive: true,
    selectedId: "r2",
    onSelect: fn(),
    onRegionMouseDown: fn(),
  },
  play: async ({ canvas, args }) => {
    const chart = canvas.getByRole("button", { name: /Revenue chart/ });
    const feed = canvas.getByRole("button", { name: /Activity feed/ });
    await expect(feed).toHaveAttribute("aria-pressed", "true");
    await expect(chart).toHaveAttribute("aria-pressed", "false");
    chart.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).toHaveBeenLastCalledWith("r1");
    feed.focus();
    await userEvent.keyboard(" ");
    await expect(args.onSelect).toHaveBeenLastCalledWith("r2");
    await expect(args.onRegionMouseDown).not.toHaveBeenCalled();
  },
};

/** State filter active: everything that isn't `shipped` dims away. */
export const FilteredToShipped: Story = {
  args: { regions: REGIONS, filterState: "shipped" },
};

function readColor(color: string) {
  const [red, green, blue, opacity = 1] =
    color.match(/[\d.]+/g)?.map(Number) ?? [];
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Cannot measure the rendered color: ${color}`);
  }
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return {
    opacity,
    luminance:
      0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue),
  };
}

/** Labels must remain readable over arbitrary screenshots in both themes. */
export const ThemeContrast: Story = {
  args: { regions: REGIONS },
  render: () => (
    <Box sx={{ display: "grid", gap: 2 }}>
      {(["light", "dark"] as const).map((mode) => (
        <Box
          key={mode}
          component="section"
          aria-label={`${mode} theme`}
          className={mode}
          sx={{
            position: "relative",
            height: 200,
            bgcolor: "background.default",
          }}
        >
          <RegionOverlay
            regions={[
              region(
                "contrast",
                [0.05, 0.18, 0.85, 0.58],
                "shipped",
                "Revenue chart",
              ),
            ]}
          />
        </Box>
      ))}
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const backgrounds = [];
    for (const mode of ["light", "dark"]) {
      const section = canvas.getByRole("region", { name: `${mode} theme` });
      const label = within(section).getByText("Revenue chart");
      await expect(label).toBeVisible();
      const style = getComputedStyle(label);
      const foreground = readColor(style.color);
      const background = readColor(style.backgroundColor);
      // An opaque label keeps its contrast independent of the screenshot.
      await expect(background.opacity).toBe(1);
      const contrast =
        (Math.max(foreground.luminance, background.luminance) + 0.05) /
        (Math.min(foreground.luminance, background.luminance) + 0.05);
      await expect(contrast).toBeGreaterThanOrEqual(4.5);
      backgrounds.push(style.backgroundColor);
    }
    await expect(backgrounds[0]).not.toBe(backgrounds[1]);
  },
};
