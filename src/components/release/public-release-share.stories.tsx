import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import Box from "@mui/material/Box";
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

export const ReadableReviewTimes: Story = {
  args: {
    projection: {
      ...meta.args.projection,
      validUntil: Date.parse("2026-10-14T10:05:12.345Z"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const reviewedTime = canvas.getByText("13 Oct 2026, 10:00 UTC");
    const evidenceExpiry = canvas.getByText("14 Oct 2026, 10:05 UTC");
    await expect(reviewedTime).toBeVisible();
    await expect(reviewedTime).toHaveAttribute(
      "datetime",
      "2026-10-13T10:00:00.000Z",
    );
    await expect(evidenceExpiry).toBeVisible();
    await expect(evidenceExpiry).toHaveAttribute(
      "title",
      "2026-10-14T10:05:12.345Z",
    );
    await expect(
      canvas.getByText("Evidence valid until", { exact: false }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "This is a saved review. It does not update as evidence changes or expires.",
      ),
    ).toBeVisible();
  },
};

export const MultipleOutcomes: Story = {
  args: {
    projection: {
      ...meta.args.projection,
      capabilities: [
        ...meta.args.projection.capabilities,
        {
          name: "Export invoices",
          outcome: "Download a complete invoice for the selected account.",
          state: "blocked",
          explanation: "The export omitted the billing address.",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "October release · RC 3" }),
    ).toBeVisible();
    const outcomes = within(
      canvas.getByRole("region", { name: "Outcomes in this review" }),
    );
    await expect(outcomes.getAllByRole("heading", { level: 3 })).toHaveLength(
      2,
    );
    await expect(
      outcomes.getAllByText(
        "Check verification at this review; availability requires deployment verification.",
      ),
    ).toHaveLength(1);
  },
};
export const NarrowReview: Story = {
  args: {
    projection: {
      ...meta.args.projection,
      candidateLabel:
        "StateBoard release readiness and agent maintenance · candidate 12",
    },
  },
  render: (args) => (
    <Box sx={{ width: 390, maxWidth: "100%" }}>
      <PublicReleaseShare {...args} />
    </Box>
  ),
};

export const GermanPublicReview: Story = {
  parameters: { locale: "de" },
  render: (args) => (
    <Box sx={{ width: 390, maxWidth: "100%" }}>
      <PublicReleaseShare {...args} />
    </Box>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: args.projection.candidateLabel }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Release-Freigabe zurückgestellt"),
    ).toBeVisible();
    await expect(canvas.getByText("Blockiert", { exact: true })).toBeVisible();
    await expect(canvas.getByText("Bereit · Prüfungen")).toBeVisible();
    const reviewed = canvas.getByText("13. Okt. 2026, 10:00 UTC");
    await expect(reviewed).toHaveAttribute(
      "datetime",
      "2026-10-13T10:00:00.000Z",
    );
    await expect(canvas.getByText(args.projection.summary)).toBeVisible();
    await expect(
      canvas.getByText(/Dies ist ein gespeichertes Review/),
    ).toBeVisible();
  },
};
