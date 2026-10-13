import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { expect, fn, userEvent } from "storybook/test";
import { CapabilityVisualView } from "./capability-visual-view";
const example = getReleaseDemo();
const meta = {
  component: CapabilityVisualView,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
  },
} satisfies Meta<typeof CapabilityVisualView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const VisualAndNonVisual: Story = {};
export const NoScreensYet: Story = {
  args: {
    product: { ...example.product, screens: [], regionCapabilities: [] },
    onReviewView: fn(),
    screensHref: "/boards/example",
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("No screens yet")).toBeVisible();
    await expect(canvas.getByText("Export an invoice")).not.toBeVisible();
    await userEvent.click(
      canvas.getByText(/capabilities without a linked screen/),
    );
    await expect(canvas.getByText("Export an invoice")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Manage screens" }),
    ).toHaveAttribute("href", "/boards/example");
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(args.onReviewView).toHaveBeenCalledWith("backend");
    await userEvent.click(canvas.getByRole("button", { name: "View checks" }));
    await expect(args.onReviewView).toHaveBeenCalledWith("qa");
  },
};
