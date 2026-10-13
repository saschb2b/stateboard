import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import { SignInPanelView } from "./sign-in-panel";

const meta = {
  component: SignInPanelView,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: { onSignIn: fn(async () => {}) },
} satisfies Meta<typeof SignInPanelView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FailedSignInCanRetry: Story = {
  args: {
    onSignIn: fn(async () => {
      throw new Error("Your sign-in service is unavailable. Try again.");
    }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Continue with company account" }),
    );
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "sign-in service is unavailable",
    );
    await expect(
      canvas.getByRole("button", { name: "Continue with company account" }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Continue with company account" }),
    );
    await expect(args.onSignIn).toHaveBeenCalledTimes(2);
  },
};
export const PendingSignIn: Story = {
  args: { onSignIn: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Continue with company account" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Redirecting…" }),
    ).toBeDisabled();
    await expect(args.onSignIn).toHaveBeenCalledTimes(1);
  },
};
