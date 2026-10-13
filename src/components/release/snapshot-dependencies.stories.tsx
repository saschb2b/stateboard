import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { SnapshotDependencies } from "./snapshot-dependencies";

const meta = {
  component: SnapshotDependencies,
  tags: ["ai-generated"],
  args: { snapshot: getReleaseDemo().detail.decisions[0]!.snapshot },
} satisfies Meta<typeof SnapshotDependencies>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RecordedArchitecture: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/^Export an invoice → calls → Billing API/),
    ).toBeVisible();
    await expect(
      canvas.getByText(/^Event worker → consumes → Partner event/),
    ).toBeVisible();
  },
};
