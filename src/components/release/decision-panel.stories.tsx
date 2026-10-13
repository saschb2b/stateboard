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
      expect(dialog.getByText("sha256:demo-rc3-immutable")).toBeVisible(),
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

export const PublishedReview: Story = {
  args: {
    detail: {
      ...example.detail,
      shares: [
        {
          token: "example-public-review",
          decisionId: "decision-example",
          createdAt: example.now,
          revokedAt: null,
          projection: {
            candidateLabel: example.detail.assessment.candidateLabel,
            targetEnvironment: "production-eu",
            audience: "Existing business accounts",
            reviewedAt: example.now,
            decision: "held",
            readiness: "blocked",
            summary: "Invoice export needs a fix before release.",
            capabilities: [],
            images: [],
          },
        },
      ],
    },
  },
};
export const ReadOnlyReview: Story = {
  args: { canRecord: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Record decision" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Decision by Example release owner at revision 1",
      }),
    );
    await expect(
      canvas.queryByRole("button", { name: "Prepare public review link" }),
    ).not.toBeInTheDocument();
  },
};
