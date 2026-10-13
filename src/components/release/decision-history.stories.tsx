import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { DecisionHistory } from "./decision-history";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: DecisionHistory,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    now: example.now,
    canPublish: false,
    onPublish: fn(),
  },
} satisfies Meta<typeof DecisionHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};

const frozen = structuredClone(example.detail.decisions[0]!);
const captured = frozen.snapshot.screens[0]!;
const region = {
  ...captured.regions[0]!,
  label: "Recorded billing region",
  state: "mock" as const,
};
frozen.snapshot.screens = [
  { ...captured, label: "Reviewed billing screen", regions: [region] },
];
frozen.snapshot.regionCapabilities = [
  { regionId: region.id, capabilityId: "cap-export" },
];
frozen.snapshot.assets = [
  {
    id: "asset-captured-example",
    assessmentId: frozen.assessmentId,
    decisionId: frozen.id,
    filename: captured.filename,
    mimeType: captured.mimeType,
    width: captured.width,
    height: captured.height,
    sizeBytes: 1,
    digest: "example-digest",
    label: "Captured image file",
    createdAt: example.now,
  },
];
export const FrozenReviewAfterChanges: Story = {
  args: {
    detail: {
      ...example.detail,
      assessment: { ...example.detail.assessment, revision: 42 },
      scope: example.detail.scope.map((item) => ({
        ...item,
        name: "Current invoice capability",
        outcome: "Changed current outcome",
        definitionRevision: 2,
      })),
      evidence: [],
      decisions: [frozen],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/Reviewed .*Example release owner/));
    await expect(
      canvas.getByText(`Candidate: ${frozen.snapshot.assessment.candidateRef}`),
    ).toBeVisible();
    await expect(canvas.getByText("Validation: staging-eu")).toBeVisible();
    await expect(
      canvas.getByText(
        `Recorded evidence freshness limit: ${new Date(frozen.expiresAt!).toISOString()}`,
      ),
    ).toBeVisible();
    await expect(canvas.getByText("Linked to Export an invoice")).toBeVisible();
    await expect(
      canvas.getByText(/^Export an invoice → calls → Billing API/),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: "Reviewed billing screen" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("img")).toHaveLength(1);
    await expect(canvas.queryByText("Captured image file")).toBeNull();
    await expect(canvas.queryByText("Current invoice capability")).toBeNull();
    await expect(
      canvas.getByText(/live assessment has changed since this review/),
    ).toBeVisible();
  },
};
