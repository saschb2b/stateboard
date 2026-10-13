import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, spyOn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleaseWorkspace } from "./release-workspace";

const example = getReleaseDemo();
const meta = {
  component: ReleaseWorkspace,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    initialProduct: example.product,
    initialDetail: example.detail,
    now: example.now,
    demo: true,
  },
} satisfies Meta<typeof ReleaseWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProductPerspective: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Blocked" }),
    ).toBeVisible();
    await expect(canvas.getByText("Receive a partner webhook")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Edit scope" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Backend" }));
    await expect(
      canvas.getByRole("heading", { name: "Architecture for this release" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "QA" }));
    await expect(
      canvas.getByRole("heading", { name: "Acceptance checks and evidence" }),
    ).toBeVisible();
    await expect(canvas.getByText("stale", { exact: true })).toBeVisible();
  },
};
export const BackendPerspective: Story = { args: { initialView: "backend" } };
export const OperationsPerspective: Story = {
  args: { initialView: "operations" },
};
export const DecisionPerspective: Story = {
  args: { initialView: "decision" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/Reviewed .*Example release owner/));
    await expect(
      canvas.getByText(/Hold for the invoice export failure/),
    ).toBeVisible();
  },
};

export const ViewerPermissions: Story = {
  args: {
    demo: false,
    initialView: "qa",
    viewer: {
      user: {
        id: "example-viewer",
        email: "viewer@example.test",
        name: "Example viewer",
        image: null,
      },
      workspaceId: "default",
      role: "viewer",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Add check" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: "Record evidence" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Decision" }));
    await expect(
      canvas.queryByRole("button", { name: "Record decision" }),
    ).toBeNull();
  },
};
export const EditorPermissions: Story = {
  args: {
    demo: false,
    initialView: "decision",
    viewer: {
      user: {
        id: "example-editor",
        email: "editor@example.test",
        name: "Example editor",
        image: null,
      },
      workspaceId: "default",
      role: "editor",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Record decision" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: "Prepare public review link" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "QA" }));
    await expect(
      canvas.getByRole("button", { name: "Add check" }),
    ).toBeVisible();
  },
};

const clockCheck = example.detail.checks.find(
  (check) => check.id === "check-webhook",
)!;
const pass = example.detail.evidence.find(
  (evidence) => evidence.id === "ev-webhook",
)!;
const expiring = {
  ...clockCheck,
  id: "clock-expiry-gate",
  subjectType: "release" as const,
  subjectId: null,
  claim: "Short-lived release verification",
  maxAgeMs: 6050,
};
const skewedDetail = {
  ...example.detail,
  scope: example.detail.scope.filter(
    (capability) => capability.capabilityId === "cap-webhook",
  ),
  checks: [clockCheck, expiring],
  evidence: [
    {
      ...pass,
      id: "clock-earlier-pass",
      eventId: "clock-earlier-pass",
      receivedAt: example.now,
      sequence: 1,
      observedAt: example.now - 10_000,
    },
    {
      ...pass,
      id: "clock-latest-fail",
      eventId: "clock-latest-fail",
      receivedAt: example.now,
      sequence: 2,
      result: "fail" as const,
      observedAt: example.now - 1000,
      summary: "The latest verification failed.",
    },
    {
      ...pass,
      id: "clock-expiry-pass",
      eventId: "clock-expiry-pass",
      receivedAt: example.now,
      checkId: expiring.id,
      sequence: 3,
      observedAt: example.now - 6000,
    },
  ],
  decisions: [],
  shares: [],
};
export const BrowserClockCannotHideFailure: Story = {
  args: { demo: false, initialView: "qa", initialDetail: skewedDetail },
  beforeEach: () => {
    const clock = spyOn(Date, "now").mockReturnValue(example.now - 5000);
    return () => clock.mockRestore();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Blocked" }),
    ).toBeVisible();
    await expect(
      canvas.findByText(/Short-lived release verification.*expired/),
    ).resolves.toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Blocked" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Ready" })).toBeNull();
  },
};
