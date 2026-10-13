import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
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
export const ReleaseGatesAlongsideCapabilities: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Release-wide and component gates" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Next verification: Review the relevant test run and record its result.",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("Ready · checks")).toBeVisible();
    await expect(
      canvas.getByText(/No current approved decision for this revision/),
    ).toBeVisible();
  },
};
