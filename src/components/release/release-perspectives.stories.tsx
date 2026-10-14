import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleasePerspectives } from "./release-perspectives";
const example = getReleaseDemo();
const meta = {
  component: ReleasePerspectives,
  tags: ["ai-generated"],
  args: {
    view: "release",
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    editable: false,
    now: example.now,
    subjectScope: null,
    focusedCheckId: null,
    canRecord: false,
    mutate: fn(async () => {}),
    record: fn(async () => {}),
    publish: fn(async () => {}),
    revoke: fn(async () => {}),
    upload: fn(async () => {}),
    onDependencyFocusChange: fn(),
    onClearFocus: fn(),
  },
} satisfies Meta<typeof ReleasePerspectives>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Release: Story = {};
export const FocusedEvidence: Story = {
  args: { view: "qa", focusedCheckId: "check-export" },
};
export const ScreensUseReviewFeatureFocus: Story = {
  args: {
    view: "visual",
    focusedCapabilityId: "cap-export",
    onReviewView: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveTextContent("Export an invoice");
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(page.getByRole("option", { name: "All screens" }));
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "visual",
      undefined,
    );
  },
};

export const ScreenEditingRetainsReleaseContext: Story = {
  args: {
    view: "visual",
    focusedCapabilityId: "cap-export",
    editable: true,
    onReviewView: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const context = new URLSearchParams({
      release: example.detail.assessment.id,
      capability: "cap-export",
    });
    const href = `/boards/${example.product.board.id}?${context}`;
    await expect(
      canvas.getByRole("link", { name: "Manage screens" }),
    ).toHaveAttribute("href", href);
    const screen = example.product.screens[0]!;
    await expect(
      canvas.getByRole("link", { name: `Edit screen: ${screen.label}` }),
    ).toHaveAttribute("href", `${href}&screen=${screen.id}`);
  },
};
