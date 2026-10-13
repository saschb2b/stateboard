import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { DecisionPanel } from "./decision-panel";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: DecisionPanel,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    now: example.now,
    canRecord: true,
    record: fn(async () => {}),
    publish: fn(async () => {}),
    revoke: fn(async () => {}),
  },
} satisfies Meta<typeof DecisionPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
