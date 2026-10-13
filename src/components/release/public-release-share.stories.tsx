import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PublicReleaseShare } from "./public-release-share";
const meta = {
  component: PublicReleaseShare,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    token: "example",
    projection: {
      candidateLabel: "October release · RC 3",
      targetEnvironment: "Production",
      audience: "Business customers",
      reviewedAt: Date.parse("2026-10-13T10:00:00Z"),
      decision: "held",
      readiness: "blocked",
      summary:
        "Partner processing is verified. Invoice export needs a fix before release.",
      capabilities: [
        {
          name: "Receive partner events",
          outcome: "Store a delivered event exactly once.",
          state: "ready",
          explanation: "Duplicate delivery passed verification.",
        },
      ],
      images: [],
    },
  },
} satisfies Meta<typeof PublicReleaseShare>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CuratedReview: Story = {};
export const CapabilityVerificationMeaning: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Held release")).toBeVisible();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(canvas.getByText("Ready · checks")).toBeVisible();
    await expect(canvas.queryByText("Ready", { exact: true })).toBeNull();
    await expect(
      canvas.getByText(
        "Check verification at this review; availability requires deployment verification.",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByText("Duplicate delivery passed verification."),
    ).toBeVisible();
  },
};
