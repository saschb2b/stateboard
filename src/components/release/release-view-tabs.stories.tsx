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
