import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { MutationForm } from "./mutation-form";

const meta = {
  component: MutationForm,
  tags: ["ai-generated"],
  args: {
    fields: [
      { name: "name", label: "Capability name", required: true },
      {
        name: "outcome",
        label: "Expected outcome",
        type: "textarea",
        required: true,
      },
    ],
    submitLabel: "Save capability",
    onSubmit: fn(async () => {}),
  },
} satisfies Meta<typeof MutationForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Capability: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/Capability name/),
      "Receive a webhook",
    );
    await userEvent.type(
      canvas.getByLabelText(/Expected outcome/),
      "Store the event exactly once",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Save capability" }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({
      name: "Receive a webhook",
      outcome: "Store the event exactly once",
    });
  },
};
export const SaveFailure: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new Error("Assessment changed. Reload before saving.");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/Capability name/),
      "Export invoice",
    );
    await userEvent.type(
      canvas.getByLabelText(/Expected outcome/),
      "Download CSV",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Save capability" }),
    );
    await expect(
      canvas.findByText("Assessment changed. Reload before saving."),
    ).resolves.toBeVisible();
  },
};
