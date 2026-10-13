import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { DecisionPanel } from "./decision-panel";
const example = getReleaseDemo();
/** Decision previews use prop spies; publication/revocation variants remain render-only. */
const meta = {
  component: DecisionPanel,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    now: example.now,
    canRecord: true,
    record: fn(async () => {}),
    publish: fn(async () => {}),
    revoke: fn(async () => {}),
  },
} satisfies Meta<typeof DecisionPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const PreviewReviewBeforeRecording: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Record decision" }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(
        dialog.getByText("Candidate: sha256:demo-rc3-immutable"),
      ).toBeVisible(),
    );
    await expect(
      dialog.getByText("Review revision 1 · October release · RC 3"),
    ).toBeVisible();
    await expect(
      dialog.getByText("Required blockers: 1 · Evidence gaps: 3"),
    ).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await expect(args.record).not.toHaveBeenCalled();
  },
};
