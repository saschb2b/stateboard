import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { EvidenceForm } from "./evidence-form";

const example = getReleaseDemo();
const meta = {
  component: EvidenceForm,
  tags: ["ai-generated"],
  args: {
    assessment: example.detail.assessment,
    check: example.detail.checks[0]!,
    now: example.now,
    onSave: fn(async () => {}),
    onCancel: fn(),
  },
} satisfies Meta<typeof EvidenceForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ExactContextReview: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(`Owner: ${args.check.ownerLabel}`),
    ).toBeVisible();
    await expect(
      canvas.getByText(`Verification method: ${args.check.method}`),
    ).toBeVisible();
    await userEvent.type(
      canvas.getByLabelText(/Observation/),
      "Tax fields are present in the reviewed result.",
    );
    await userEvent.type(
      canvas.getByLabelText(/Run or review reference/),
      "review-42",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Append evidence" }),
    );
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "evidence.create",
        data: expect.objectContaining({
          candidateRef: example.detail.assessment.candidateRef,
          checkRevision: 1,
          environment: example.detail.checks[0]!.environment,
          result: "inconclusive",
          audience: example.detail.assessment.audience,
          configurationRef: example.detail.assessment.configurationRef,
          runRef: "review-42",
        }),
      }),
    );
  },
};

export const KeyboardCancellation: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(
      canvas.getByRole("combobox", { name: /Result/ }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByLabelText(/Observation/)).toHaveFocus();
    await expect(
      canvas.getByText(`Verification method: ${args.check.method}`),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

export const GermanEvidenceReview: Story = {
  parameters: { locale: "de" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(`Verantwortung: ${args.check.ownerLabel}`),
    ).toBeVisible();
    await expect(
      canvas.getByText(`Prüfverfahren: ${args.check.method}`),
    ).toBeVisible();
    await userEvent.type(
      canvas.getByRole("textbox", { name: /^Beobachtung(?: \*)?$/ }),
      "Das Ergebnis wurde im angegebenen Kontext geprüft.",
    );
    await userEvent.type(
      canvas.getByLabelText(/Referenz auf Prüflauf oder Review/),
      "review-de-42",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Nachweis ergänzen" }),
    );
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "evidence.create",
        data: expect.objectContaining({
          result: "inconclusive",
          candidateRef: args.assessment.candidateRef,
          environment: args.check.environment,
          runRef: "review-de-42",
          summary: "Das Ergebnis wurde im angegebenen Kontext geprüft.",
        }),
      }),
    );
  },
};
