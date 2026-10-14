import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ReleaseViewTabs } from "./release-view-tabs";

const meta = {
  component: ReleaseViewTabs,
  tags: ["ai-generated"],
  args: { view: "release", onChange: fn() },
} satisfies Meta<typeof ReleaseViewTabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Perspectives: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Architecture" }));
    await expect(args.onChange).toHaveBeenCalledWith("backend");
  },
};

export const KeyboardPerspective: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("tab", { name: "Overview" })).toHaveFocus();
    const vertical =
      canvas
        .getByRole("tablist", { name: "Release review" })
        .getAttribute("aria-orientation") === "vertical";
    await userEvent.keyboard(vertical ? "{ArrowDown}" : "{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Checks" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onChange).toHaveBeenCalledWith("qa");
  },
};
