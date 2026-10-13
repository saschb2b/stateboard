import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleaseScope } from "./release-scope";
const example = getReleaseDemo();
const meta = {
  component: ReleaseScope,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    editable: false,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof ReleaseScope>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CapabilityReadiness: Story = {};
export const EditableScope: Story = { args: { editable: true } };
