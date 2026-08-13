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
// the chip with the brand color from state-meta.ts (#1F8A53), not just that
// it mounted.
export const CssCheck: Story = {
  args: { state: "shipped" },
  play: async ({ canvas }) => {
    const chip = canvas.getByText("SHIPPED");
    await expect(getComputedStyle(chip).backgroundColor).toBe(
      "rgb(31, 138, 83)",
    );
  },
};
