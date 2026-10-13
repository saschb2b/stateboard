import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
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
