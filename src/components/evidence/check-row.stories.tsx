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

const methodWithSources =
  "Use https://learn.chatgpt.com/docs/changelog (release notes).\nRead (https://example.test/reference_(desktop)), then http://localhost:3000/.\nKeep <b>literal text</b>, javascript:alert(1), and https://user:password@example.test/private as text.";

export const VerificationSources: Story = {
  args: {
    initiallyExpanded: true,
    check: { ...check, method: methodWithSources },
  },
  play: async ({ canvas }) => {
    for (const url of [
      "https://learn.chatgpt.com/docs/changelog",
      "https://example.test/reference_(desktop)",
      "http://localhost:3000/",
    ]) {
      const link = canvas.getByRole("link", { name: url });
      await expect(link).toHaveAttribute("href", url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    const method = canvas.getByText(/Keep <b>literal text<\/b>/);
    await expect(method.textContent).toBe(methodWithSources);
    await expect(within(method).getAllByRole("link")).toHaveLength(3);
  },
};
