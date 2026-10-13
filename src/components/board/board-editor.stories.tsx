import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getDemoBoard } from "@/lib/demo-data";
import { BoardEditor } from "./board-editor";

const example = getDemoBoard();
const meta = {
  component: BoardEditor,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    board: example.board,
    initialScreens: example.screens,
    initialShareLinks: [],
    authors: {},
    now: example.board.updatedAt,
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
} satisfies Meta<typeof BoardEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Screens: Story = {};
export const BoardNavigation: Story = {
  play: async ({ canvas, args }) => {
    const location = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    await expect(
      location.getByRole("link", { name: "Boards" }),
    ).toHaveAttribute("href", "/boards");
    await expect(
      location.getByRole("link", { name: args.board.name }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/releases`);
    await expect(
      canvas.queryByRole("button", { name: `Rename ${args.board.name}` }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "More board options" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.getByRole("menuitem", { name: "Edit board" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
    await expect(
      menu.getByRole("menuitem", { name: "Board history" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/history`);
    await userEvent.keyboard("{Escape}");
    await expect(
      canvas.getByRole("button", { name: "More board options" }),
    ).toHaveFocus();
  },
};
export const EmptyBoard: Story = {
  args: { initialScreens: [] },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole("heading", { name: "No screens yet" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Edit board" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
  },
};
export const ViewerNavigation: Story = {
  args: { viewer: { ...meta.args.viewer, role: "viewer" } },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "More board options" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.queryByRole("menuitem", { name: "Edit board" }),
    ).not.toBeInTheDocument();
    await expect(
      menu.queryByRole("menuitem", { name: "Copy share link" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        menu.getByRole("menuitem", { name: "Release readiness" }),
      ).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
  },
};
export const GermanNavigation: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Weitere Board-Optionen" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.getByRole("menuitem", { name: "Board bearbeiten" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
    await userEvent.keyboard("{Escape}");
  },
};
