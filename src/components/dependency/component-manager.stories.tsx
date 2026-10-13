import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ComponentManager } from "./component-manager";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ComponentManager,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof ComponentManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const MembershipEnded: Story = {
  args: {
    product: {
      ...example.product,
      components: example.product.components.map((component, index) => ({
        ...component,
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
