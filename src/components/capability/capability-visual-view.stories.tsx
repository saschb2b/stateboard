import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { CapabilityVisualView } from "./capability-visual-view";
const example = getReleaseDemo();
const meta = {
  component: CapabilityVisualView,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
  },
} satisfies Meta<typeof CapabilityVisualView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const VisualAndNonVisual: Story = {};
