import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ScreenUploadControl } from "./screen-uploader";

const meta = {
  component: ScreenUploadControl,
  tags: ["ai-generated"],
  args: { onUpload: fn(async () => {}) },
} satisfies Meta<typeof ScreenUploadControl>;
export default meta;
type Story = StoryObj<typeof meta>;

const screenshot = () =>
  new File(["image"], "release.png", { type: "image/png" });

export const KeyboardAccess: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Choose screenshot" }),
    ).toHaveFocus();
  },
};

export const Compact: Story = { args: { compact: true } };

export const FailedUploadCanRetry: Story = {
  args: {
    onUpload: fn(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Screenshot file");
    for (let attempt = 1; attempt <= 2; attempt++) {
      await userEvent.upload(input, screenshot());
      await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
        "Connection lost. Try again.",
      );
      await expect(
        canvas.getByRole("button", { name: "Choose screenshot" }),
      ).toBeEnabled();
      await expect(args.onUpload).toHaveBeenCalledTimes(attempt);
    }
  },
};

export const RepeatedDropDuringUpload: Story = {
  args: { onUpload: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dropZone = canvas.getByText("Drop a screenshot here");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(screenshot());
    dropZone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer }),
    );
    dropZone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer }),
    );
    await waitFor(() => expect(args.onUpload).toHaveBeenCalledOnce());
    await expect(
      canvas.getByRole("button", { name: "Choose screenshot" }),
    ).toBeDisabled();
    await expect(canvas.getByLabelText("Screenshot file")).toBeDisabled();
  },
};
