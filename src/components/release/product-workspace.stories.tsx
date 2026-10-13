import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { ProductWorkspace } from "./product-workspace";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ProductWorkspace,
  tags: ["ai-generated"],
  args: {
    initialProduct: example.product,
    viewer: {
      user: {
        id: "example-owner",
        email: "owner@example.test",
        name: "Example owner",
        image: null,
      },
      workspaceId: "default",
      role: "owner",
    },
  },
} satisfies Meta<typeof ProductWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
