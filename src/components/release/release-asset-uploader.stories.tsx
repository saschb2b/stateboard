import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ReleaseAssetUploader } from "./release-asset-uploader";
/** Disclosure is local; uploads are exercised by the authenticated application workflow. */
const meta = {
  component: ReleaseAssetUploader,
  tags: ["ai-generated"],
  args: { assets: [], upload: fn(async () => {}) },
} satisfies Meta<typeof ReleaseAssetUploader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("textbox", { name: "Review image label" }),
    ).not.toBeVisible();
    await userEvent.click(canvas.getByText("Supporting review images"));
    await expect(
      canvas.getByRole("textbox", { name: "Review image label" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Upload image" }),
    ).toBeDisabled();
    await expect(args.upload).not.toHaveBeenCalled();
  },
};
