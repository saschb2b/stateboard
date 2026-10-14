import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ScreenEditorToolbar } from "./screen-editor-toolbar";

const meta = {
  component: ScreenEditorToolbar,
  tags: ["ai-generated"],
  args: {
    name: "Project navigation and chat · OpenAI reference",
    regionCount: 3,
    readOnly: false,
    totals: { shipped: 1, mock: 1, missing: 1 },
    filterState: null,
    onFilter: fn(),
    onSearch: fn(),
    onPresent: fn(),
    onCopyShare: fn(),
    copied: false,
    shareHref: "/share/example",
    sharingSettingsHref: "/boards/example/sharing",
  },
} satisfies Meta<typeof ScreenEditorToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SecondaryActions: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }));
    await userEvent.click(
      within(document.body).getByRole("menuitemcheckbox", { name: /MISSING/ }),
    );
    await expect(args.onFilter).toHaveBeenCalledWith("missing");
    await userEvent.click(
      canvas.getByRole("button", { name: "Share screens" }),
    );
    await expect(
      within(document.body).getByRole("menuitem", { name: "Manage links…" }),
    ).toHaveAttribute("href", args.sharingSettingsHref);
    await userEvent.click(
      within(document.body).getByRole("menuitem", { name: "Copy share link" }),
    );
    await expect(args.onCopyShare).toHaveBeenCalledOnce();
  },
};

export const ViewerActions: Story = {
  args: { readOnly: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "Share screens" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Filter" })).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Present (P)" }),
    ).toBeVisible();
  },
};
