import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { PublicationForm } from "./publication-form";

const decision = getReleaseDemo().detail.decisions[0]!;
const meta = {
  component: PublicationForm,
  tags: ["ai-generated"],
  args: { decision, onPublish: fn(async () => {}) },
} satisfies Meta<typeof PublicationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ExplicitPublicCopy: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText(/Public capability name/)).toBeNull();
    await userEvent.type(
      canvas.getByLabelText(/Public summary/),
      "Partner events verified; the release remains held.",
    );
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Receive a partner webhook" }),
    );
    await userEvent.type(
      canvas.getByLabelText(/Public readiness explanation/),
      "Duplicate event delivery passed verification.",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Create public review link" }),
    );
    await expect(args.onPublish).toHaveBeenCalledWith({
      summary: "Partner events verified; the release remains held.",
      targetEnvironment: "production-eu",
      audience: "Existing business accounts",
      capabilities: [
        {
          capabilityId: "cap-webhook",
          name: "Receive a partner webhook",
          outcome: "An event is stored once and acknowledged without a UI.",
          explanation: "Duplicate event delivery passed verification.",
        },
      ],
      assetIds: [],
    });
  },
};
