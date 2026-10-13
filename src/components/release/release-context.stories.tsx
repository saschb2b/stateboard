import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleaseContext } from "./release-context";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: ReleaseContext,
  tags: ["ai-generated"],
  args: { assessment: example.detail.assessment },
} satisfies Meta<typeof ReleaseContext>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
