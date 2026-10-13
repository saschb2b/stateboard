import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckManager } from "./check-manager";
const example = getReleaseDemo();
const meta = {
  component: CheckManager,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    now: example.now,
    editable: false,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof CheckManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EvidenceCoverage: Story = {};
export const OperationsRequirements: Story = { args: { operationsOnly: true } };
