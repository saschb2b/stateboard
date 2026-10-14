import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { AssessmentCreateForm } from "./assessment-create-form";
const example = getReleaseDemo();
const meta = {
  component: AssessmentCreateForm,
  tags: ["ai-generated"],
  args: {
    capabilities: example.product.capabilities,
    ownerLabel: "Release owner",
    onSubmit: fn(async () => {}),
  },
} satisfies Meta<typeof AssessmentCreateForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};

export const ReuseContextRequiresNewCandidate: Story = {
  args: { previous: example.detail.assessment },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/Candidate name/)).toHaveValue("");
    await expect(
      canvas.getByLabelText(/Immutable candidate reference/),
    ).toHaveValue("");
    await expect(canvas.getByText(/Context copied from/)).toBeVisible();
    await userEvent.type(
      canvas.getByLabelText(/Candidate name/),
      "October RC 4",
    );
    await userEvent.type(
      canvas.getByLabelText(/Immutable candidate reference/),
      "sha256:next-immutable-candidate",
    );
    await userEvent.click(canvas.getByText("Where and for whom?"));
    await userEvent.clear(canvas.getByLabelText(/Configuration reference/));
    await userEvent.type(
      canvas.getByLabelText(/Configuration reference/),
      "config:next-flags",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Create release review" }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({
      candidateLabel: "October RC 4",
      candidateRef: "sha256:next-immutable-candidate",
      validationEnvironment: example.detail.assessment.validationEnvironment,
      targetEnvironment: example.detail.assessment.targetEnvironment,
      audience: example.detail.assessment.audience,
      configurationRef: "config:next-flags",
      ownerLabel: "Release owner",
      capabilityIds: example.product.capabilities
        .filter((feature) => feature.archivedAt === null)
        .map((feature) => feature.id),
    });
  },
};
