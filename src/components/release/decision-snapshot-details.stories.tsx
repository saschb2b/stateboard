import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { DecisionSnapshotDetails } from "./decision-snapshot-details";

const example = getReleaseDemo();
const meta = {
  component: DecisionSnapshotDetails,
  tags: ["ai-generated"],
  args: { decision: example.detail.decisions[0]! },
} satisfies Meta<typeof DecisionSnapshotDetails>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RecordedSnapshot: Story = {};
