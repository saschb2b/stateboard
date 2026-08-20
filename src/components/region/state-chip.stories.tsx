import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { StateChip } from "./state-chip";

/**
 * The three load-bearing v0 states as solid pills. These colors are brand
 * identity — identical on the pitch deck, the editor, and the share view.
 */
const meta = {
  component: StateChip,
  tags: ["ai-generated"],
} satisfies Meta<typeof StateChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipped: Story = { args: { state: "shipped" } };
export const Mock: Story = { args: { state: "mock" } };
export const Missing: Story = { args: { state: "missing" } };
export const Small: Story = { args: { state: "shipped", size: "sm" } };

// The one project-wide CSS check: proves MUI's sx pipeline actually styled
// the chip with the brand color from state-meta.ts (#1F8A53), and that the
// preview really loaded the product typeface.
//
// The font half is a regression guard for a real bug: when the preview
// didn't apply next/font's class to <html>, `--font-geist` was undefined,
// which invalidates the whole font-family declaration and silently drops
// every story to the browser's default serif. Rendering still "passed" —
// only the eye caught it.
export const CssCheck: Story = {
  args: { state: "shipped" },
  play: async ({ canvas, canvasElement }) => {
    const chip = canvas.getByText("SHIPPED");
    await expect(getComputedStyle(chip).backgroundColor).toBe(
      "rgb(31, 138, 83)",
    );

    const root = canvasElement.ownerDocument.documentElement;
    const sans = getComputedStyle(root).getPropertyValue("--font-geist");
    const mono = getComputedStyle(root).getPropertyValue("--font-geist-mono");
    await expect(sans.trim()).not.toBe("");
    await expect(mono.trim()).not.toBe("");
    // Whatever the resolved family is called, it must not be the serif the
    // browser falls back to when the variable goes missing.
    await expect(getComputedStyle(chip).fontFamily).not.toMatch(
      /^(times|serif)/i,
    );
  },
};
