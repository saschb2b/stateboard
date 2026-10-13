import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { EvidenceHistory } from "./evidence-history";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: EvidenceHistory,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    check: example.detail.checks[4]!,
    evaluation: example.readiness.checks[4],
    now: example.now,
  },
} satisfies Meta<typeof EvidenceHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
