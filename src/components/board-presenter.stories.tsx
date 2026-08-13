import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { fn } from "storybook/test";
import { BoardPresenter } from "./board-presenter";
import { getDemoBoard } from "@/lib/demo-data";

const demo = getDemoBoard();
const firstLabel = demo.screens[0]?.regions[0]?.label ?? "";

/**
 * Present mode over the built-in example board (the same data served at
 * /share/demo). Fullscreen, keyboard-driven: ← / → to move, Esc to exit.
 */
const meta = {
  component: BoardPresenter,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    boardName: demo.board.name,
    screens: demo.screens,
    onClose: fn(),
  },
} satisfies Meta<typeof BoardPresenter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DemoBoard: Story = {
  // Proves the demo screens + region overlay actually composed: a real
  // region label from demo-data must be painted on the first screen.
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(firstLabel)).toBeVisible();
  },
};

export const SecondScreen: Story = {
  args: { initialIndex: 1 },
};
