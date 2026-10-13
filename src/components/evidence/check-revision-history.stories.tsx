import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckRevisionHistory } from "./check-revision-history";
const meta = {
  component: CheckRevisionHistory,
  tags: ["ai-generated"],
  args: { check: getReleaseDemo().detail.checks[0]! },
} satisfies Meta<typeof CheckRevisionHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CurrentDefinition: Story = {};
