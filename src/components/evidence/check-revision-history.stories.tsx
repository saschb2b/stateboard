import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckRevisionHistory } from "./check-revision-history";
const meta = {
  component: CheckRevisionHistory,
  tags: ["ai-generated"],
  args: { check: getReleaseDemo().detail.checks[0]! },
} satisfies Meta<typeof CheckRevisionHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CurrentDefinition: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", {
      name: "Check definition history",
    });
    await userEvent.click(trigger);
    const document = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(document.getByRole("dialog")).toBeVisible());
    await userEvent.click(document.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(document.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};
