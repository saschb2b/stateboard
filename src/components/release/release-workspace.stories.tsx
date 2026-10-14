import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { evaluateRelease } from "@/lib/readiness";
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
const owner = {
  user: {
    id: "example-owner",
    email: "owner@example.test",
    name: "Example owner",
    image: null,
  },
  workspaceId: "default",
  role: "owner" as const,
};
function externalUpdateWithConflict(excludedCapabilityId?: string) {
  const changed = {
    ...example.detail,
    assessment: {
      ...example.detail.assessment,
      revision: example.detail.assessment.revision + 1,
    },
    scope: example.detail.scope.map((item) =>
      item.capabilityId === excludedCapabilityId
        ? {
            ...item,
            included: false,
            scopeReason: "Scope changed in another session.",
          }
        : item,
    ),
    checks: [
      ...example.detail.checks,
      {
        ...example.detail.checks[0]!,
        id: "external-check",
        claim: "An external agent added this check.",
      },
    ],
  };
  const writes: { expectedRevision: number; type?: string }[] = [];
  const fetch = spyOn(window, "fetch").mockImplementation(
    async (_url, options) => {
      if (options?.method === "POST") {
        writes.push(JSON.parse(String(options.body)));
        return Response.json(
          { error: "Assessment changed; refresh the reviewed revision" },
          { status: 409 },
        );
      }
      return Response.json({
        ...changed,
        product: example.product,
        readiness: evaluateRelease(changed, example.now),
      });
    },
  );
  return { fetch, writes };
}
export const ProductPerspective: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(canvas.getByText("Receive a partner webhook")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Edit scope" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Architecture" }));
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Checks" }));
    await expect(
      canvas.getByRole("heading", { name: "Checks & results" }),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole("region", { name: "Check evidence" })).getByText(
        "Expired evidence",
        { exact: true },
      ),
    ).toBeVisible();
  },
};
export const BackendPerspective: Story = { args: { initialView: "backend" } };

export const ExternalChecksPreserveUnsavedClaim: Story = {
  args: {
    demo: false,
    initialView: "qa",
    viewer: owner,
  },
  play: async ({ canvas, canvasElement }) => {
    const { fetch, writes } = externalUpdateWithConflict();
    const visibility = spyOn(document, "visibilityState", "get");
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Add check" }));
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog"),
      );
      await userEvent.type(
        dialog.getByLabelText(/What must work/),
        "Keep this unsaved acceptance claim.",
      );
      await userEvent.type(
        dialog.getByLabelText(/How to verify/),
        "Exercise the outcome in this candidate.",
      );
      visibility.mockReturnValue("hidden");
      window.dispatchEvent(new Event("focus"));
      await expect(fetch).not.toHaveBeenCalled();
      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
      await expect(fetch).not.toHaveBeenCalled();
      await expect(dialog.getByLabelText(/What must work/)).toHaveValue(
        "Keep this unsaved acceptance claim.",
      );
      await userEvent.click(dialog.getByRole("button", { name: "Add check" }));
      await waitFor(() => expect(writes).toHaveLength(1));
      await expect(writes[0]).toMatchObject({
        type: "check.create",
        expectedRevision: example.detail.assessment.revision,
      });
      await expect(dialog.getByRole("alert")).toHaveTextContent(
        "Assessment changed",
      );
      await expect(dialog.getByLabelText(/What must work/)).toHaveValue(
        "Keep this unsaved acceptance claim.",
      );
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(
          canvas.getByText("An external agent added this check."),
        ).toBeInTheDocument(),
      );
      await expect(fetch).toHaveBeenCalledWith(
        `/api/releases/${example.detail.assessment.id}`,
        { cache: "no-store" },
      );
    } finally {
      visibility.mockRestore();
      fetch.mockRestore();
    }
  },
};

export const ExternalUpdatePreservesDecisionSnapshot: Story = {
  args: { demo: false, initialView: "decision", viewer: owner },
  play: async ({ canvas, canvasElement }) => {
    const { fetch, writes } = externalUpdateWithConflict();
    try {
      await userEvent.click(
        canvas.getByRole("button", { name: "Record decision" }),
      );
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog"),
      );
      await userEvent.type(
        dialog.getByLabelText(/Decision rationale/),
        "Hold until the required checks pass.",
      );
      window.dispatchEvent(new Event("focus"));
      await expect(fetch).not.toHaveBeenCalled();
      await expect(
        dialog.getByText("Review revision 1 · October release · RC 3"),
      ).toBeVisible();
      await expect(dialog.getByLabelText(/Decision rationale/)).toHaveValue(
        "Hold until the required checks pass.",
      );
      await userEvent.click(
        dialog.getByRole("button", { name: "Record reviewed snapshot" }),
      );
      await waitFor(() => expect(writes).toHaveLength(1));
      await expect(writes[0]).toMatchObject({
        expectedRevision: example.detail.assessment.revision,
      });
      await expect(
        dialog.getByText("Assessment changed; refresh the reviewed revision"),
      ).toBeVisible();
      await expect(dialog.getByLabelText(/Decision rationale/)).toHaveValue(
        "Hold until the required checks pass.",
      );
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(canvas.getByText(/Target.*Revision 2/)).toBeInTheDocument(),
      );
    } finally {
      fetch.mockRestore();
    }
  },
};

export const ExternalUpdatePreservesScopeDraft: Story = {
  args: { demo: false, initialView: "release", viewer: owner },
  play: async ({ canvas, canvasElement }) => {
    const { fetch, writes } = externalUpdateWithConflict();
    try {
      await userEvent.click(
        canvas.getByRole("button", { name: "Details for Export an invoice" }),
      );
      await userEvent.click(canvas.getByText("Scope and definition"));
      await userEvent.click(canvas.getByRole("button", { name: "Edit scope" }));
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog"),
      );
      const reason = dialog.getByRole("textbox", {
        name: /Reason for including or excluding/,
      });
      await userEvent.clear(reason);
      await userEvent.type(reason, "Keep the agreed invoice outcome in scope.");
      window.dispatchEvent(new Event("focus"));
      await expect(fetch).not.toHaveBeenCalled();
      await expect(reason).toHaveValue(
        "Keep the agreed invoice outcome in scope.",
      );
      await userEvent.click(dialog.getByRole("button", { name: "Save scope" }));
      await waitFor(() => expect(writes).toHaveLength(1));
      await expect(writes[0]).toMatchObject({
        type: "scope.put",
        expectedRevision: example.detail.assessment.revision,
      });
      await expect(dialog.getByRole("alert")).toHaveTextContent(
        "Assessment changed",
      );
      await expect(reason).toHaveValue(
        "Keep the agreed invoice outcome in scope.",
      );
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(canvas.getByText(/Target.*Revision 2/)).toBeInTheDocument(),
      );
    } finally {
      fetch.mockRestore();
    }
  },
};

export const ExternalExclusionKeepsInlineCheckDraft: Story = {
  args: { demo: false, initialView: "release", viewer: owner },
  play: async ({ canvas, canvasElement }) => {
    const { fetch, writes } = externalUpdateWithConflict("cap-export");
    try {
      await userEvent.click(
        canvas.getByRole("button", { name: "Details for Export an invoice" }),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Add check" }));
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog"),
      );
      const claim = dialog.getByLabelText(/What must work/);
      await userEvent.clear(claim);
      await userEvent.type(claim, "Retain this inline check draft.");
      await userEvent.type(
        dialog.getByLabelText(/How to verify/),
        "Inspect an actual export.",
      );
      window.dispatchEvent(new Event("focus"));
      await expect(fetch).not.toHaveBeenCalled();
      await expect(claim).toBeVisible();
      await expect(claim).toHaveValue("Retain this inline check draft.");
      await userEvent.click(dialog.getByRole("button", { name: "Add check" }));
      await waitFor(() => expect(writes).toHaveLength(1));
      await expect(writes[0]).toMatchObject({
        type: "check.create",
        expectedRevision: example.detail.assessment.revision,
      });
      await expect(dialog.getByRole("alert")).toHaveTextContent(
        "Assessment changed",
      );
      await expect(claim).toHaveValue("Retain this inline check draft.");
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(canvas.getByText(/Target.*Revision 2/)).toBeInTheDocument(),
      );
    } finally {
      fetch.mockRestore();
    }
  },
};
export const CapabilityOverviewOpensItsArchitecture: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Details for Export an invoice" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(
      canvas.getByRole("tab", { name: "Architecture" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveTextContent("Export an invoice");
    const evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Invoice CSV includes all tax fields."),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Duplicate delivery creates only one ledger entry."),
    ).toBeNull();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
  },
};
export const ScreensKeepCapabilityInArchitecture: Story = {
  args: {
    initialView: "visual",
    initialProduct: { ...example.product, screens: [], regionCapabilities: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "Export an invoice",
      }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveTextContent("Export an invoice");
    await expect(
      canvas.getByRole("button", { name: /Billing API.*1 dependency/ }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Identity API/ }),
    ).toBeNull();
  },
};
export const ScreensKeepCapabilityInChecks: Story = {
  args: {
    initialView: "visual",
    initialProduct: { ...example.product, screens: [], regionCapabilities: [] },
    initialDetail: {
      ...example.detail,
      checks: [
        ...example.detail.checks,
        {
          ...example.detail.checks[0]!,
          id: "related-ledger-check",
          subjectType: "component",
          subjectId: "cmp-db",
          claim: "Related ledger verification.",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "Export an invoice",
      }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "View checks" }));
    const evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Feature, related components and release-wide checks"),
    ).toBeVisible();
    await expect(
      evidence.getByText("Invoice CSV includes all tax fields."),
    ).toBeVisible();
    await expect(
      evidence.getByText("Related ledger verification."),
    ).toBeVisible();
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Duplicate delivery creates only one ledger entry."),
    ).toBeNull();
    await userEvent.click(
      evidence.getByRole("button", { name: "Clear feature" }),
    );
    await expect(
      evidence.getByText("Duplicate delivery creates only one ledger entry."),
    ).toBeVisible();
    await expect(
      evidence.queryByText(
        "Feature, related components and release-wide checks",
      ),
    ).toBeNull();
    await expect(canvas.getByRole("tab", { name: "Checks" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
  },
};
export const ArchitectureScopeEndsWhenChangingPerspective: Story = {
  args: { initialView: "backend" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Export an invoice" }),
    );
    let evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Invoice CSV includes all tax fields."),
    ).toBeVisible();
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Duplicate delivery creates only one ledger entry."),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Checks" }));
    evidence = within(canvas.getByRole("region", { name: "Check evidence" }));
    await expect(
      evidence.getByText("Duplicate delivery creates only one ledger entry."),
    ).toBeVisible();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
  },
};
export const FindingFocusAndClear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Inspect check: Invoice CSV includes all tax fields.",
      }),
    );
    await expect(canvas.getByRole("tab", { name: "Checks" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Invoice CSV includes all tax fields."),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Duplicate delivery creates only one ledger entry."),
    ).toBeNull();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
    await userEvent.click(
      evidence.getByRole("button", { name: "Clear check focus" }),
    );
    await expect(
      evidence.getByText("Duplicate delivery creates only one ledger entry."),
    ).toBeVisible();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
  },
};
export const ArchitectureNavigationClearsLinkedCheckFocus: Story = {
  args: { initialView: "qa" },
  beforeEach: () => {
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    // Initialize a deep link while all assessment data remains prop-driven.
    window.history.replaceState(
      originalState,
      "",
      "/share/demo/releases?view=qa&check=check-recovery",
    );
    return () => window.history.replaceState(originalState, "", originalUrl);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    let evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Recovery tokens expire and cannot be reused."),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Invoice CSV includes all tax fields."),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: "Architecture" }));
    await expect(
      new URL(window.location.href).searchParams.get("check"),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "Export an invoice",
      }),
    );
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveFocus();
    evidence = within(canvas.getByRole("region", { name: "Check evidence" }));
    await expect(
      evidence.getByText("Invoice CSV includes all tax fields."),
    ).toBeVisible();
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Recovery tokens expire and cannot be reused."),
    ).toBeNull();
    await expect(
      evidence.queryByText("Duplicate delivery creates only one ledger entry."),
    ).toBeNull();
    await expect(
      canvas.getByRole("tab", { name: "Architecture" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      new URL(window.location.href).searchParams.get("check"),
    ).toBeNull();
    await expect(new URL(window.location.href).searchParams.get("view")).toBe(
      "backend",
    );
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
  },
};
export const OperationsPerspective: Story = {
  args: { initialView: "operations" },
};
export const RoleNavigationClearsFunctionalCheckFocus: Story = {
  args: { initialView: "qa" },
  beforeEach: () => {
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    window.history.replaceState(
      originalState,
      "",
      "/share/demo/releases?view=qa&check=check-recovery",
    );
    return () => window.history.replaceState(originalState, "", originalUrl);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    let evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Recovery tokens expire and cannot be reused."),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Operations, security & data" }),
    );
    evidence = within(canvas.getByRole("region", { name: "Check evidence" }));
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Recovery tokens expire and cannot be reused."),
    ).toBeNull();
    await expect(evidence.queryByText("Selected check")).toBeNull();
    await expect(
      new URL(window.location.href).searchParams.get("check"),
    ).toBeNull();
    await expect(new URL(window.location.href).searchParams.get("view")).toBe(
      "operations",
    );
  },
};
export const ClearLinkedCheckKeepsOperationsView: Story = {
  args: { initialView: "operations" },
  beforeEach: () => {
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    window.history.replaceState(
      originalState,
      "",
      "/share/demo/releases?view=operations&check=check-recovery",
    );
    return () => window.history.replaceState(originalState, "", originalUrl);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await expect(
      evidence.getByText("Recovery tokens expire and cannot be reused."),
    ).toBeVisible();
    await userEvent.click(
      evidence.getByRole("button", { name: "Clear check focus" }),
    );
    await expect(
      canvas.getByRole("button", { name: "Operations, security & data" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await expect(
      evidence.queryByText("Recovery tokens expire and cannot be reused."),
    ).toBeNull();
    await expect(new URL(window.location.href).searchParams.get("view")).toBe(
      "operations",
    );
  },
};
export const RoleNavigationClearsCheckFilters: Story = {
  args: { initialView: "qa" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    let evidence = within(
      canvas.getByRole("region", { name: "Check evidence" }),
    );
    await userEvent.type(
      evidence.getByRole("textbox", { name: "Search claims or owners" }),
      "Recovery tokens",
    );
    await expect(
      evidence.queryByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Operations, security & data" }),
    );
    evidence = within(canvas.getByRole("region", { name: "Check evidence" }));
    await expect(
      evidence.queryByRole("textbox", { name: "Search claims or owners" }),
    ).toBeNull();
    await expect(
      evidence.getByText(
        "Rollback restores the previous worker version without losing events.",
      ),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "All areas" }));
    await expect(
      canvas.getByRole("textbox", { name: "Search claims or owners" }),
    ).toHaveValue("");
  },
};
export const MissingDefinitionOpensChecks: Story = {
  args: {
    initialDetail: {
      ...example.detail,
      checks: example.detail.checks.filter(
        (check) => check.id !== "check-export",
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Show all 4 findings" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Review acceptance checks" }),
    );
    await expect(canvas.getByRole("tab", { name: "Checks" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      canvas.getByRole("heading", { name: "Checks & results" }),
    ).toBeVisible();
  },
};
export const DecisionPerspective: Story = {
  args: { initialView: "decision" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Decision by Example release owner at revision 1",
      }),
    );
    await expect(
      canvas.getAllByText(/Hold for the invoice export failure/)[1]!,
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
      canvas.queryByRole("button", { name: "Record result" }),
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
    await userEvent.click(canvas.getByRole("tab", { name: "Checks" }));
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
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Short-lived release verification",
      }),
    );
    await expect(
      within(canvas.getByRole("region", { name: "Check evidence" })).findByText(
        "The latest passing verification has expired.",
      ),
    ).resolves.toBeVisible();
    await expect(canvas.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Ready" })).toBeNull();
  },
};

function reviewLocation(url: string) {
  const originalUrl = window.location.href;
  const originalState = window.history.state;
  window.history.replaceState(originalState, "", url);
  return () => window.history.replaceState(originalState, "", originalUrl);
}

export const BrowserBackRestoresAssessmentOverview: Story = {
  beforeEach: () => reviewLocation("/share/demo/releases?category=data#review"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const push = spyOn(window.history, "pushState");
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Inspect check: Invoice CSV includes all tax fields.",
      }),
    );
    await expect(canvas.getByRole("tab", { name: "Checks" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    await expect(
      new URL(window.location.href).searchParams.get("category"),
    ).toBe("data");
    window.history.back();
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Overview" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    await expect(
      new URL(window.location.href).searchParams.get("check"),
    ).toBeNull();
    await expect(
      new URL(window.location.href).searchParams.get("category"),
    ).toBe("data");
    window.history.forward();
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Checks" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    await expect(
      canvas.getByRole("button", {
        name: "Invoice CSV includes all tax fields.",
      }),
    ).toHaveAttribute("aria-expanded", "true");
  },
};

export const BrowserBackRestoresLinkedCheckAndCategory: Story = {
  args: { initialView: "qa" },
  beforeEach: () =>
    reviewLocation(
      "/share/demo/releases?view=qa&check=check-recovery&category=security",
    ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const push = spyOn(window.history, "pushState");
    await userEvent.click(
      canvas.getByRole("button", { name: "Operations, security & data" }),
    );
    await expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    window.history.back();
    await waitFor(() =>
      expect(new URL(window.location.href).searchParams.get("view")).toBe("qa"),
    );
    await expect(new URL(window.location.href).searchParams.get("check")).toBe(
      "check-recovery",
    );
    await expect(
      new URL(window.location.href).searchParams.get("category"),
    ).toBe("security");
    await expect(
      canvas.getByRole("button", {
        name: "Recovery tokens expire and cannot be reused.",
      }),
    ).toHaveAttribute("aria-expanded", "true");
    const clearPush = spyOn(window.history, "pushState");
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear check focus" }),
    );
    await expect(clearPush).toHaveBeenCalledTimes(1);
    clearPush.mockRestore();
    window.history.back();
    await waitFor(() =>
      expect(
        canvas.getByRole("button", {
          name: "Recovery tokens expire and cannot be reused.",
        }),
      ).toHaveAttribute("aria-expanded", "true"),
    );
  },
};

export const ArchitectureDirectLinkAndHistory: Story = {
  args: { initialView: "backend" },
  beforeEach: () =>
    reviewLocation("/share/demo/releases?view=backend&capability=cap-export"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveTextContent("Export an invoice");
    await expect(
      canvas.queryByRole("button", { name: /Identity API/ }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Component impact" }),
    );
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "Ledger store",
      }),
    );
    await expect(
      canvas.getByRole("combobox", { name: "Component impact" }),
    ).toHaveFocus();
    await expect(
      new URL(window.location.href).searchParams.get("component"),
    ).toBe("cmp-db");
    await expect(
      new URL(window.location.href).searchParams.get("capability"),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: /Ledger store.*No dependencies/ }),
    ).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(canvas.getByRole("tab", { name: "Checks" }));
    window.history.back();
    await waitFor(() =>
      expect(
        canvas.getByRole("combobox", { name: "Component impact" }),
      ).toHaveTextContent("Ledger store"),
    );
    window.history.back();
    await waitFor(() =>
      expect(
        canvas.getByRole("combobox", { name: "Feature" }),
      ).toHaveTextContent("Export an invoice"),
    );
  },
};

export const CategoryChangeKeepsSearch: Story = {
  args: { initialView: "qa" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const query = canvas.getByRole("textbox", {
      name: "Search claims or owners",
    });
    await userEvent.type(query, "Recovery tokens");
    await userEvent.click(canvas.getByRole("button", { name: "More filters" }));
    await userEvent.click(canvas.getByRole("combobox", { name: "Category" }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole("option", {
        name: "functional",
      }),
    );
    await expect(query).toHaveValue("Recovery tokens");
    await expect(
      canvas.getByRole("button", {
        name: "Recovery tokens expire and cannot be reused.",
      }),
    ).toBeVisible();
  },
};

export const LegacyArchitectureCheckLink: Story = {
  args: { initialView: "backend" },
  beforeEach: () =>
    reviewLocation("/share/demo/releases?view=backend&check=check-recovery"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("tab", { name: "Architecture" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("button", {
        name: "Recovery tokens expire and cannot be reused.",
      }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.queryByText(/Select a feature or component to see/),
    ).not.toBeInTheDocument();
  },
};
