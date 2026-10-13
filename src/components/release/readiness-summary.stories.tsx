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
export const CurrentVerificationContext: Story = {
  args: { detail: getReleaseDemo().detail },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/This assessment cannot be approved yet/),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        /Verification: staging-eu · Deployment target: production-eu · No current approved decision for this revision/,
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Required verification actions" }),
    ).toBeVisible();
    await expect(
      canvas.getAllByText("Expected environment: staging-eu").length,
    ).toBeGreaterThan(0);
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
    await expect(
      canvas.getByText("5 required findings · Showing 3"),
    ).toBeVisible();
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
