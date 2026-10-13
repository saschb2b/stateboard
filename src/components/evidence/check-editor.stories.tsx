import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckEditor } from "./check-editor";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: CheckEditor,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    check: null,
    onSave: fn(async () => {}),
    onCancel: fn(),
  },
} satisfies Meta<typeof CheckEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
