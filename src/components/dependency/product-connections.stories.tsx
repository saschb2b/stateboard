import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ProductConnections } from "./product-connections";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ProductConnections,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof ProductConnections>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
