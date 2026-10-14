import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import type { ReleaseMutation } from "@/lib/release-types";
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
    await userEvent.click(
      canvas.getByText("Source & observation time", {
        exact: false,
        selector: "summary",
      }),
    );
    await userEvent.type(
      canvas.getByLabelText(/Run or review reference/),
      "review-42",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save result" }));
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
    await userEvent.click(
      canvas.getByText("Quelle & Beobachtungszeitpunkt", {
        exact: false,
        selector: "summary",
      }),
    );
    await userEvent.type(
      canvas.getByLabelText(/Referenz auf Prüflauf oder Review/),
      "review-de-42",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Ergebnis speichern" }),
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

const failFirstSave = fn(
  async (
    _mutation: Omit<ReleaseMutation, "expectedRevision">,
  ): Promise<void> => {
    if (failFirstSave.mock.calls.length === 1)
      throw new Error("Result could not be saved. Retry.");
  },
);
export const ManualResultRetry: Story = {
  args: { onSave: failFirstSave },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("combobox", { name: /Result/ }),
    ).toHaveTextContent("Inconclusive");
    await expect(canvas.getByLabelText(/Evidence source/)).not.toBeVisible();
    await expect(
      canvas.getByLabelText(/Run or review reference/),
    ).not.toBeVisible();
    await userEvent.click(canvas.getByRole("combobox", { name: /Result/ }));
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Fail" }),
    );
    await userEvent.type(
      canvas.getByLabelText(/Observation/),
      "The exported invoice is missing its tax column.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save result" }));
    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "Result could not be saved. Retry.",
    );
    await expect(args.onCancel).not.toHaveBeenCalled();
    const first = failFirstSave.mock.calls[0]?.[0];
    await expect(first).toEqual(
      expect.objectContaining({
        type: "evidence.create",
        data: expect.objectContaining({
          result: "fail",
          summary: "The exported invoice is missing its tax column.",
          source: "manual-review",
          candidateRef: args.assessment.candidateRef,
          checkRevision: args.check.revision,
          environment: args.check.environment,
          audience: args.assessment.audience,
          configurationRef: args.assessment.configurationRef,
        }),
      }),
    );
    await expect(typeof first?.data.eventId).toBe("string");
    await expect(first?.data.runRef).toBe(
      `manual-review:${first?.data.eventId}`,
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save result" }));
    await waitFor(() => expect(failFirstSave).toHaveBeenCalledTimes(2));
    await expect(failFirstSave.mock.calls[1]?.[0]).toEqual(first);
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};
