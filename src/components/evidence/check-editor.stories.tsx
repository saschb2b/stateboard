import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { CheckEditor } from "./check-editor";
const example = getReleaseDemo();
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

export const FeatureContext: Story = {
  args: {
    defaultSubject: { type: "capability", id: "cap-webhook" },
    defaultClaim: "An event is stored once.",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("For: Feature · Receive a partner webhook"),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("combobox", { name: /What this check verifies/ }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByLabelText(/What must work/)).toHaveValue(
      "An event is stored once.",
    );
    await expect(
      canvas.getByText(
        /Integrations team · staging-eu · Results valid for 24h/,
      ),
    ).toBeVisible();
    await expect(canvas.getByLabelText(/Accountable owner/)).not.toBeVisible();
    await userEvent.type(
      canvas.getByLabelText(/How to verify/),
      "Deliver the same signed event twice and inspect the stored event.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Add check" }));
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "check.create",
        data: expect.objectContaining({
          subjectType: "capability",
          subjectId: "cap-webhook",
          claim: "An event is stored once.",
          ownerLabel: "Integrations team",
          environment: "staging-eu",
          category: "functional",
          required: true,
          maxAgeMs: 86_400_000,
        }),
      }),
    );
  },
};

export const ComponentContext: Story = {
  args: { defaultSubject: { type: "component", id: "cmp-billing" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("For: Component · Billing API"),
    ).toBeVisible();
    await userEvent.type(
      canvas.getByLabelText(/What must work/),
      "An invoice response includes tax fields.",
    );
    await userEvent.type(
      canvas.getByLabelText(/How to verify/),
      "Inspect the invoice API response.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Add check" }));
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subjectType: "component",
          subjectId: "cmp-billing",
          ownerLabel: "Billing team",
        }),
      }),
    );
  },
};

export const KeepExistingSettings: Story = {
  args: { check: example.detail.checks[0]!, defaultCategory: "operational" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/What must work/),
      " Verified with a second fixture.",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Save new check revision" }),
    );
    const check = args.check!;
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "check.revise",
        id: check.id,
        data: expect.objectContaining({
          subjectType: check.subjectType,
          subjectId: check.subjectId,
          category: check.category,
          ownerLabel: check.ownerLabel,
          environment: check.environment,
          maxAgeMs: check.maxAgeMs,
          required: check.required,
          method: check.method,
        }),
      }),
    );
  },
};

export const SubjectChangesOwner: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/What must work/),
      "Keep this draft while choosing the feature.",
    );
    await userEvent.click(
      canvas.getByRole("combobox", { name: /What this check verifies/ }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", {
        name: "Feature · Receive a partner webhook",
      }),
    );
    await expect(
      canvas.getByText(
        /Integrations team · staging-eu · Results valid for 24h/,
      ),
    ).toBeVisible();
    await expect(canvas.getByLabelText(/What must work/)).toHaveValue(
      "Keep this draft while choosing the feature.",
    );
  },
};
