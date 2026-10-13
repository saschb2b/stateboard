import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { evaluateRelease } from "@/lib/readiness";
import { DependencyView } from "./dependency-view";
const example = getReleaseDemo();
const meta = {
  component: DependencyView,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
  },
} satisfies Meta<typeof DependencyView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ArchitectureSlice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("No verification configured"),
    ).toHaveLength(5);
  },
};

const componentCheck = {
  ...example.detail.checks[0]!,
  id: "check-ledger-example",
  subjectType: "component" as const,
  subjectId: "cmp-db",
  claim: "Ledger read set is consistent.",
  category: "data" as const,
};
const configured = {
  ...example.detail,
  checks: [...example.detail.checks, componentCheck],
  evidence: [
    ...example.detail.evidence,
    {
      ...example.detail.evidence[1]!,
      id: "evidence-ledger-example",
      checkId: componentCheck.id,
      sequence: 99,
    },
  ],
};
export const ScopedComponentVerification: Story = {
  args: {
    detail: configured,
    readiness: evaluateRelease(configured, example.now),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Ledger read set is consistent. · pass · staging-eu"),
    ).toBeVisible();
    await expect(
      canvas.getAllByText("No verification configured"),
    ).toHaveLength(4);
  },
};
