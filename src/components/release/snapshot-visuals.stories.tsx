import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { SnapshotVisuals } from "./snapshot-visuals";

const snapshot = getReleaseDemo().detail.decisions[0]!.snapshot;
const meta = {
  component: SnapshotVisuals,
  tags: ["ai-generated"],
  args: { snapshot },
} satisfies Meta<typeof SnapshotVisuals>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RecordedAnnotationsAndLinks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Linked to Export an invoice")).toBeVisible();
    await expect(
      canvas.getByText("Captured screens and visual delivery"),
    ).toBeVisible();
  },
};
export const OlderReviewWithoutMappings: Story = {
  args: { snapshot: { ...snapshot, regionCapabilities: undefined } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Feature links were not captured in this older review/),
    ).toBeVisible();
    await expect(canvas.queryByText("Linked to Export an invoice")).toBeNull();
  },
};
