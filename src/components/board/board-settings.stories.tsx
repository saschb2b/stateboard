import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { BoardSettings } from "./board-settings";

const example = getReleaseDemo();
const meta = {
  component: BoardSettings,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    board: example.product.board,
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
    initialShareLinks: [],
    stats: { screens: 3, regions: 12, shareLinks: 0 },
  },
} satisfies Meta<typeof BoardSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const General: Story = {};
export const VisualSharing: Story = { args: { initialSection: "sharing" } };
export const DeleteConfirmation: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete this board" }),
    );
    const dialog = within(within(document.body).getByRole("dialog"));
    await expect(
      dialog.getByRole("button", { name: "Delete this board" }),
    ).toBeDisabled();
    await userEvent.type(
      dialog.getByRole("textbox", { name: "Board name to confirm" }),
      "wrong product",
    );
    await expect(
      dialog.getByRole("button", { name: "Delete this board" }),
    ).toBeDisabled();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  },
};
