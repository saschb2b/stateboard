import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { DecisionReview } from "./decision-review";

const example = getReleaseDemo();
const currentAsset = {
  id: "current-image",
  assessmentId: example.detail.assessment.id,
  decisionId: null,
  filename: "current.png",
  mimeType: "image/png",
  width: 1,
  height: 1,
  sizeBytes: 1,
  digest: "fixture",
  label: "Current verification image",
  createdAt: example.now,
};
const earlierAsset = {
  ...currentAsset,
  id: "earlier-image",
  decisionId: "earlier-review",
  label: "Earlier verification image",
};
const meta = {
  component: DecisionReview,
  tags: ["ai-generated"],
  args: {
    detail: { ...example.detail, assets: [currentAsset, earlierAsset] },
    product: example.product,
    readiness: example.readiness,
    record: fn(async () => {}),
    onCancel: fn(),
  },
} satisfies Meta<typeof DecisionReview>;
export default meta;
type Story = StoryObj<typeof meta>;

/** All submissions use prop spies; this story does not call the API. */
export const ExactReviewScope: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Review revision 1 · October release · RC 3"),
    ).toBeVisible();
    await expect(canvas.getByText("sha256:demo-rc3-immutable")).toBeVisible();
    await expect(canvas.getByText("staging-eu")).toBeVisible();
    await expect(canvas.getByText("production-eu")).toBeVisible();
    await expect(canvas.getByText("Existing business accounts")).toBeVisible();
    await expect(canvas.getByText("flags:invoice-export-v3")).toBeVisible();
    await expect(
      canvas.getByText("Required blockers: 1 · Evidence gaps: 3"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("checkbox", { name: "Current verification image" }),
    ).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", {
        name: "Earlier verification image · earlier review image",
      }),
    ).not.toBeChecked();
    const screen = example.product.screens[0]!;
    await userEvent.click(
      canvas.getByRole("checkbox", {
        name: screen.label ?? "Product screen",
      }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Decision rationale" }),
      "Hold until required verification is complete.",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Record reviewed snapshot" }),
    );
    await expect(args.record).toHaveBeenCalledWith({
      expectedRevision: 1,
      decision: "held",
      rationale: "Hold until required verification is complete.",
      screenIds: [screen.id],
      assetIds: [currentAsset.id],
    });
    await expect(args.onCancel).toHaveBeenCalled();
  },
};
