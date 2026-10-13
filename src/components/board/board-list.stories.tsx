import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
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
export const ProductOverview: Story = {};
export const FirstProduct: Story = { args: { initialItems: [] } };
