import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { expect } from "storybook/test";
import { BoardList } from "./board-list";

const example = getReleaseDemo();
/** Board creation and duplication call real APIs; these stories render the navigation only. */
const meta = {
  component: BoardList,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    initialItems: [
      {
        board: example.product.board,
        screens: example.product.screens,
        shareToken: null,
        totals: { shipped: 6, mock: 3, missing: 3 },
        updatedLabel: "Today",
        releaseOverview: {
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
      },
    ],
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
} satisfies Meta<typeof BoardList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProductOverview: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Latest candidate/)).toBeVisible();
    await expect(canvas.getByText(/evidence gaps/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
  },
};
export const FirstProduct: Story = { args: { initialItems: [] } };
