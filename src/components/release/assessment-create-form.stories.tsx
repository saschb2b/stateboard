import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { AssessmentCreateForm } from "./assessment-create-form";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: AssessmentCreateForm,
  tags: ["ai-generated"],
  args: {
    capabilities: example.product.capabilities,
    ownerLabel: "Release owner",
    onSubmit: fn(async () => {}),
  },
} satisfies Meta<typeof AssessmentCreateForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
