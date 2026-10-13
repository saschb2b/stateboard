import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { expect } from "storybook/test";
import { ProductWorkspace } from "./product-workspace";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ProductWorkspace,
  tags: ["ai-generated"],
  args: {
    initialProduct: {
      ...example.product,
      releaseOverviews: [
        {
          assessment: example.detail.assessment,
          state: example.readiness.state,
          blockerCount: example.readiness.blockers.length,
          gapCount: example.readiness.gaps.length,
          evaluatedAt: example.readiness.evaluatedAt,
          validUntil: example.readiness.validUntil,
          decision: null,
          decisionRevision: null,
          decisionAt: null,
        },
      ],
    },
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
export const Example: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/evidence gaps/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
  },
};
