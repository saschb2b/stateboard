import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getDemoBoard } from "@/lib/demo-data";
import { ScreenSidebar } from "./screen-sidebar";

const screen = getDemoBoard().screens[0]!;
const meta = {
  component: ScreenSidebar,
  tags: ["ai-generated"],
  args: {
    screens: [screen],
    activeId: screen.id,
    editable: true,
    collapsed: false,
    onToggleCollapsed: fn(),
    onSelect: fn(),
    onAdd: fn(),
    onRename: fn(),
    onReplace: fn(),
    onDelete: fn(),
    onReorder: fn(),
  },
  render: function StatefulSidebar(args) {
    const [screens, setScreens] = useState(args.screens);
    return (
      <ScreenSidebar
        {...args}
        screens={screens}
        onRename={(id, label) => {
          args.onRename(id, label);
          setScreens((items) =>
            items.map((item) => (item.id === id ? { ...item, label } : item)),
          );
        }}
      />
    );
  },
} satisfies Meta<typeof ScreenSidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RenameFromMenu: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: `Actions for ${screen.label}` }),
    );
    await userEvent.click(
      within(document.body).getByRole("menuitem", { name: "Rename" }),
    );
    const input = await canvas.findByRole("textbox", { name: "Screen name" });
    await waitFor(() => expect(input).toHaveFocus());
    await expect(args.onRename).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, "Observed project navigation{Enter}");
    await expect(args.onRename).toHaveBeenCalledWith(
      screen.id,
      "Observed project navigation",
    );
    await expect(canvas.getByText("Observed project navigation")).toBeVisible();
  },
};
export const CancelRename: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: `Actions for ${screen.label}` }),
    );
    await userEvent.click(
      within(document.body).getByRole("menuitem", { name: "Rename" }),
    );
    const input = await canvas.findByRole("textbox", { name: "Screen name" });
    await userEvent.type(input, "discard{Escape}");
    await expect(args.onRename).not.toHaveBeenCalled();
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
  },
};
