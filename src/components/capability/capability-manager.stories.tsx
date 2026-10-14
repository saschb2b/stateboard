import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/i18n/messages/en/product.json";
import { getReleaseDemo } from "@/lib/release-demo";
import { CapabilityManager } from "./capability-manager";
const example = getReleaseDemo();
const meta = {
  component: CapabilityManager,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof CapabilityManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const MembershipEnded: Story = {
  args: {
    product: {
      ...example.product,
      capabilities: example.product.capabilities.map((capability, index) => ({
        ...capability,
        ownerNeedsReassignment: index === 0,
      })),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        "Owner membership ended; review accountability.",
      ),
    ).toBeVisible();
  },
};

export const CreateWithCurrentOwner: Story = {
  args: { ownerLabel: "Alex Morgan" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("button", { name: messages.addCapability }),
    );
    const dialog = within(page.getByRole("dialog"));
    await expect(
      dialog.getByRole("textbox", { name: messages.accountableOwner }),
    ).toHaveValue("Alex Morgan");
    await userEvent.type(
      dialog.getByRole("textbox", { name: messages.capabilityName }),
      "Review a release",
    );
    await userEvent.type(
      dialog.getByRole("textbox", { name: messages.expectedOutcome }),
      "Identify missing verification before release.",
    );
    await userEvent.click(
      dialog.getByRole("button", { name: messages.saveCapability }),
    );
    await waitFor(() =>
      expect(args.mutate).toHaveBeenCalledWith({
        type: "capability.create",
        id: undefined,
        data: {
          name: "Review a release",
          outcome: "Identify missing verification before release.",
          ownerLabel: "Alex Morgan",
        },
      }),
    );
  },
};
