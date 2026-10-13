import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { evaluateRelease } from "@/lib/readiness";
import { ReadinessSummary } from "./readiness-summary";

const meta = {
  component: ReadinessSummary,
  tags: ["ai-generated"],
  args: { readiness: getReleaseDemo().readiness },
} satisfies Meta<typeof ReadinessSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const BlockedWithGaps: Story = {};
export const Ready: Story = {
  args: {
    readiness: {
      ...getReleaseDemo().readiness,
      state: "ready",
      blockers: [],
      gaps: [],
      warnings: [],
    },
  },
};
export const RecordedApproval: Story = {
  args: {
    detail: {
      ...getReleaseDemo().detail,
      decisions: [
        {
          ...getReleaseDemo().detail.decisions[0]!,
          decision: "approved",
          revision: getReleaseDemo().detail.assessment.revision,
          expiresAt: null,
        },
      ],
    },
    readiness: {
      ...getReleaseDemo().readiness,
      state: "ready",
      blockers: [],
      gaps: [],
      warnings: [],
    },
    onReviewDecision: fn(),
  },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByText(/Ready for the release owner's decision/),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Decision approved" }),
    );
    await expect(args.onReviewDecision).toHaveBeenCalled();
  },
};
export const CurrentVerificationContext: Story = {
  args: { detail: getReleaseDemo().detail },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Validation · staging-eu")).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Needs attention" }),
    ).toBeVisible();
    await expect(canvas.queryByText(/Expected environment:/)).toBeNull();
    await expect(canvas.queryByText("All findings")).toBeNull();
  },
};
const allGapsDetail = {
  ...getReleaseDemo().detail,
  evidence: getReleaseDemo().detail.evidence.filter(
    (item) => item.checkId !== "check-rollback",
  ),
};
export const CompactRequiredActionPreview: Story = {
  args: {
    detail: allGapsDetail,
    readiness: evaluateRelease(allGapsDetail, getReleaseDemo().now),
    onInspectCheck: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("3 of 5")).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(3);
    await userEvent.click(
      canvas.getByRole("button", { name: "Show all 5 findings" }),
    );
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(5);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Inspect check: Rollback restores the previous worker version without losing events.",
      }),
    );
    await expect(args.onInspectCheck).toHaveBeenCalledWith("check-rollback");
    await userEvent.click(canvas.getByRole("button", { name: "Show fewer" }));
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(3);
  },
};
