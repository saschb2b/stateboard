import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { evaluateRelease } from "@/lib/readiness";
import { ReleaseFindings } from "./release-findings";

const example = getReleaseDemo();
const detail = {
  ...example.detail,
  checks: example.detail.checks.map((check) =>
    check.id === "check-rollback"
      ? {
          ...check,
          method: "Rehearse restoration with the target deployment backup.",
          ownerLabel: "Data operations",
        }
      : check,
  ),
  evidence: example.detail.evidence.filter(
    (item) => item.checkId !== "check-rollback",
  ),
};
const meta = {
  component: ReleaseFindings,
  tags: ["ai-generated"],
  args: {
    detail,
    readiness: evaluateRelease(detail, example.now),
    onInspectCheck: fn(),
  },
} satisfies Meta<typeof ReleaseFindings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RequiredReleaseGate: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      within(
        canvas.getByRole("button", {
          name: "Inspect check: Rollback restores the previous worker version without losing events.",
        }),
      ).getByText(/Data operations/),
    ).toBeVisible();
    await expect(canvas.queryByText(/Next verification:/)).toBeNull();
    await expect(
      canvas.queryByText("Partner signatures are checked before ingest."),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Inspect check: Rollback restores the previous worker version without losing events.",
      }),
    );
    await expect(args.onInspectCheck).toHaveBeenCalledWith("check-rollback");
  },
};
export const MissingFunctionalDefinition: Story = {
  args: {
    detail: {
      ...detail,
      checks: detail.checks.filter((check) => check.id !== "check-search"),
    },
    readiness: evaluateRelease(
      {
        ...detail,
        checks: detail.checks.filter((check) => check.id !== "check-search"),
      },
      example.now,
    ),
    onReviewChecks: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(
        "Search invoices needs a required functional acceptance check.",
      ),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Review acceptance checks" }),
    );
    await expect(args.onReviewChecks).toHaveBeenCalled();
  },
};
export const SummaryPreviewExpands: Story = {
  args: { initialLimit: 3 },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("3 of 5")).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(3);
    await expect(
      canvas.queryByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Show all 5 findings" }),
    );
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(5);
    await expect(
      canvas.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
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
export const CompleteReviewDefault: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("button", { name: /Inspect check:/ }),
    ).toHaveLength(5);
    await expect(canvas.queryByRole("button", { name: /Show all/ })).toBeNull();
    await expect(
      canvas.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
  },
};
export const ZeroConfiguredChecksRemainActionable: Story = {
  args: {
    detail: { ...detail, checks: [], evidence: [] },
    readiness: evaluateRelease(
      { ...detail, checks: [], evidence: [] },
      example.now,
    ),
    initialLimit: 3,
    onReviewChecks: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("3 of 5")).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: "Review acceptance checks" }),
    ).toHaveLength(3);
    await userEvent.click(
      canvas.getByRole("button", { name: "Show all 5 findings" }),
    );
    await expect(
      canvas.getByText(
        "Search invoices needs a required functional acceptance check.",
      ),
    ).toBeVisible();
    const actions = canvas.getAllByRole("button", {
      name: "Review acceptance checks",
    });
    await expect(actions).toHaveLength(5);
    await userEvent.click(actions[4]!);
    await expect(args.onReviewChecks).toHaveBeenCalled();
    await expect(args.onInspectCheck).not.toHaveBeenCalled();
  },
};
