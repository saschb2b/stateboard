import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleaseOverviewSummary } from "./release-overview-summary";
const example = getReleaseDemo();
const meta = {
  component: ReleaseOverviewSummary,
  args: {
    showCandidate: true,
    overview: {
      assessment: example.detail.assessment,
      state: example.readiness.state,
      blockerCount: example.readiness.blockers.length,
      gapCount: example.readiness.gaps.length,
      evaluatedAt: example.now,
      validUntil: example.readiness.validUntil,
      decision: null,
      decisionRevision: null,
      decisionAt: null,
    },
  },
} satisfies Meta<typeof ReleaseOverviewSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CandidateAndGaps: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Latest candidate/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
    await expect(canvas.getByText(/1 blocker · 3 evidence gaps/)).toBeVisible();
  },
};
export const NoAssessment: Story = { args: { overview: undefined } };
export const EvidenceExpiresWhileOverviewIsOpen: Story = {
  args: {
    overview: {
      ...meta.args.overview,
      state: "ready",
      blockerCount: 0,
      gapCount: 0,
      validUntil: example.now + 40,
      decision: "approved",
      decisionRevision: example.detail.assessment.revision,
      decisionAt: example.now,
    },
  },
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText("Needs evidence")).toBeVisible();
      await expect(canvas.getByText(/Evidence expired/)).toBeVisible();
      await expect(canvas.getByText(/Earlier approved review/)).toBeVisible();
    });
  },
};
