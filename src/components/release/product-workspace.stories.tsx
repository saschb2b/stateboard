import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { buildReleaseOverviewCoverage } from "@/lib/product-overview";
import { expect, userEvent } from "storybook/test";
import { ProductWorkspace } from "./product-workspace";
const example = getReleaseDemo();
/** In-memory navigation fixture. Mutations use the authenticated application workflow. */
const meta = {
  component: ProductWorkspace,
  tags: ["ai-generated"],
  args: {
    initialProduct: {
      ...example.product,
      releaseOverviews: [
        {
          assessment: example.detail.assessment,
          state: example.readiness.state,
          blockerCount: example.readiness.blockers.length,
          gapCount: example.readiness.gaps.length,
          evaluatedAt: example.readiness.evaluatedAt,
          validUntil: example.readiness.validUntil,
          coverage: buildReleaseOverviewCoverage(
            example.detail.scope,
            example.detail.checks,
            example.readiness,
          ),
          decision: null,
          decisionRevision: null,
          decisionAt: null,
        },
      ],
    },
    viewer: {
      user: {
        id: "example-owner",
        email: "owner@example.test",
        name: "Example owner",
        image: null,
      },
      workspaceId: "default",
      role: "owner",
    },
  },
} satisfies Meta<typeof ProductWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/evidence gaps/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
    const tabs = canvas.getByRole("tablist", { name: "Product sections" });
    const overview = canvas.getByRole("tab", { name: "Overview" });
    const assessments = canvas.getByRole("tab", { name: "Assessments" });
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("tabpanel", { name: "Overview" }),
    ).toBeVisible();
    overview.focus();
    await userEvent.keyboard(
      tabs.getAttribute("aria-orientation") === "vertical"
        ? "{ArrowDown}"
        : "{ArrowRight}",
    );
    await expect(assessments).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(assessments).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("tabpanel", { name: "Assessments" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("region", { name: "Verification coverage" }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{Home}{Enter}");
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("region", { name: "Verification coverage" }),
    ).toBeVisible();
  },
};
