import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckRow } from "./check-row";

const example = getReleaseDemo();
const check = example.detail.checks[0]!;
const meta = {
  component: CheckRow,
  tags: ["ai-generated"],
  args: {
    check,
    subject: "Export account history",
    detail: example.detail,
    evaluation: example.readiness.checks.find(
      (item) => item.checkId === check.id,
    ),
    now: example.now,
    editable: false,
    initiallyExpanded: false,
    onRecord: fn(),
    onRevise: fn(),
    onArchive: fn(),
  },
} satisfies Meta<typeof CheckRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("button", { name: check.claim });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(row).toHaveAccessibleDescription("Failed");
  },
};
export const Expanded: Story = {
  args: { initiallyExpanded: true, editable: true },
};
