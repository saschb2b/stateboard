import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CapabilityManager } from "./capability-manager";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: CapabilityManager,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof CapabilityManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const MembershipEnded: Story = {
  args: {
    product: {
      ...example.product,
      capabilities: example.product.capabilities.map((capability, index) => ({
        ...capability,
        ownerNeedsReassignment: index === 0,
      })),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        "Owner membership ended; review accountability.",
      ),
    ).toBeVisible();
  },
};
