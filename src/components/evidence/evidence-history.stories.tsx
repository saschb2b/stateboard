import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { EvidenceHistory } from "./evidence-history";
const example = getReleaseDemo();
/** Render-only variant; actions are exercised by the authenticated application workflow. */
const meta = {
  component: EvidenceHistory,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    check: example.detail.checks[4]!,
    evaluation: example.readiness.checks[4],
    now: example.now,
  },
} satisfies Meta<typeof EvidenceHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};

const longCandidate = `desktop:26.1007.21434:build13901:asar-sha256:${"a".repeat(64)}`;
export const LongReferencesInNarrowColumn: Story = {
  args: {
    detail: {
      ...example.detail,
      evidence: example.detail.evidence.map((item) => ({
        ...item,
        candidateRef: longCandidate,
        runRef: `desktop-release-observation:${"b".repeat(80)}`,
      })),
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Evidence history/ }),
    );
    const reference = canvas.getByText(/Check revision 1 · desktop:/);
    await expect(reference).toHaveTextContent(longCandidate);
    await expect(reference.scrollWidth).toBeLessThanOrEqual(
      reference.clientWidth,
    );
  },
};
