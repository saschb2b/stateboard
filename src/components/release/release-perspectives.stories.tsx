import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleasePerspectives } from "./release-perspectives";
const example = getReleaseDemo();
const meta = {
  component: ReleasePerspectives,
  tags: ["ai-generated"],
  args: {
    view: "release",
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    editable: false,
    now: example.now,
    subjectScope: null,
    focusedCheckId: null,
    canRecord: false,
    mutate: fn(async () => {}),
    record: fn(async () => {}),
    publish: fn(async () => {}),
    revoke: fn(async () => {}),
    upload: fn(async () => {}),
    onDependencyFocusChange: fn(),
    onClearFocus: fn(),
    onInspectCheck: fn(),
  },
} satisfies Meta<typeof ReleasePerspectives>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Release: Story = {};
export const FocusedEvidence: Story = {
  args: { view: "qa", focusedCheckId: "check-export" },
};
