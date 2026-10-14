import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { buildReleaseOverviewCoverage } from "@/lib/product-overview";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import { ProductWorkspace } from "./product-workspace";
const example = getReleaseDemo();
/** In-memory navigation fixture. Mutations use the authenticated application workflow. */
const meta = {
  component: ProductWorkspace,
  tags: ["ai-generated"],
  args: {
    initialProduct: {
      ...example.product,
      releaseOverviews: [
        {
          assessment: example.detail.assessment,
          state: example.readiness.state,
          blockerCount: example.readiness.blockers.length,
          gapCount: example.readiness.gaps.length,
          evaluatedAt: example.readiness.evaluatedAt,
          validUntil: example.readiness.validUntil,
          coverage: buildReleaseOverviewCoverage(
            example.detail.scope,
            example.detail.checks,
            example.readiness,
          ),
          decision: null,
          decisionRevision: null,
          decisionAt: null,
        },
      ],
    },
    viewer: {
      user: {
        id: "example-owner",
        email: "owner@example.test",
        name: "Example owner",
        image: null,
      },
      workspaceId: "default",
      role: "owner",
    },
  },
} satisfies Meta<typeof ProductWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/evidence gaps/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
    const tabs = canvas.getByRole("tablist", { name: "Product sections" });
    const overview = canvas.getByRole("tab", { name: "Overview" });
    const assessments = canvas.getByRole("tab", { name: "Release reviews" });
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("tabpanel", { name: "Overview" }),
    ).toBeVisible();
    overview.focus();
    await userEvent.keyboard(
      tabs.getAttribute("aria-orientation") === "vertical"
        ? "{ArrowDown}"
        : "{ArrowRight}",
    );
    await expect(assessments).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(assessments).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("tabpanel", { name: "Release reviews" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("region", { name: "Verification coverage" }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{Home}{Enter}");
    await expect(overview).toHaveAttribute("aria-selected", "true");
    await expect(
      canvas.getByRole("region", { name: "Verification coverage" }),
    ).toBeVisible();
  },
};

export const EditorBoardActions: Story = {
  args: { viewer: { ...meta.args.viewer, role: "editor" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Edit board" }),
    ).toHaveAttribute("href", `/boards/${example.product.board.id}/settings`);
    const tools = within(canvas.getByRole("group", { name: "Board tools" }));
    await expect(
      canvas.queryByRole("link", { name: "Board settings" }),
    ).not.toBeInTheDocument();
    await expect(tools.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      `/boards/${example.product.board.id}/history`,
    );
  },
};

export const CancelReleaseReview: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Release reviews" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "New release review" }),
    );
    const page = within(canvasElement.ownerDocument.body);
    const dialog = within(
      page.getByRole("dialog", { name: "New release review" }),
    );
    await userEvent.type(dialog.getByLabelText(/Candidate name/), "Draft");
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "New release review" }),
      ).not.toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("button", { name: "New release review" }),
    ).toHaveFocus();
  },
};

export const ExternalUpdatePreservesReviewDraft: Story = {
  play: async ({ canvas, canvasElement }) => {
    const fetch = spyOn(window, "fetch").mockImplementation(async () =>
      Response.json({
        ...meta.args.initialProduct,
        board: {
          ...example.product.board,
          description: "Product context updated by another agent.",
        },
        releases: [
          {
            ...example.detail.assessment,
            id: "external-review",
            candidateLabel: "Newer external candidate",
          },
          ...example.product.releases,
        ],
      }),
    );
    try {
      await userEvent.click(
        canvas.getByRole("tab", { name: "Release reviews" }),
      );
      await userEvent.click(
        canvas.getByRole("button", { name: "New release review" }),
      );
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog", {
          name: "New release review",
        }),
      );
      await userEvent.type(
        dialog.getByLabelText(/Candidate name/),
        "Unsaved candidate",
      );
      window.dispatchEvent(new Event("focus"));
      await expect(fetch).not.toHaveBeenCalled();
      await expect(dialog.getByLabelText(/Candidate name/)).toHaveValue(
        "Unsaved candidate",
      );
      await expect(
        dialog.queryByText(/Context copied from Newer external candidate/),
      ).not.toBeInTheDocument();
      await expect(
        dialog.getByText(/Context copied from October release/),
      ).toBeInTheDocument();
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      await waitFor(() =>
        expect(
          canvas.getByText("Product context updated by another agent."),
        ).toBeInTheDocument(),
      );
      await expect(fetch).toHaveBeenCalledWith(
        `/api/boards/${example.product.board.id}/product`,
        { cache: "no-store" },
      );
    } finally {
      fetch.mockRestore();
    }
  },
};

export const ViewerBoardNavigation: Story = {
  args: { viewer: { ...meta.args.viewer, role: "viewer" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("link", { name: "Edit board" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: "Board settings" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      `/boards/${example.product.board.id}/history`,
    );
    await userEvent.click(canvas.getByRole("tab", { name: "Features" }));
    await expect(
      canvas.queryByRole("button", { name: "Add feature" }),
    ).not.toBeInTheDocument();
    const path = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    await expect(
      path.getByRole("link", { name: example.product.board.name }),
    ).toHaveAttribute("href", `/boards/${example.product.board.id}/releases`);
    await expect(path.getByText("Features")).toHaveAttribute(
      "aria-current",
      "page",
    );
  },
};

export const ProductSectionHistory: Story = {
  beforeEach: () => {
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    window.history.replaceState(
      originalState,
      "",
      `/boards/${example.product.board.id}/releases`,
    );
    return () => window.history.replaceState(originalState, "", originalUrl);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Features" }));
    await userEvent.click(canvas.getByRole("tab", { name: "Architecture" }));
    await userEvent.click(canvas.getByRole("button", { name: "Connections" }));
    await expect(
      new URL(window.location.href).searchParams.get("section"),
    ).toBe("connections");
    window.history.back();
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Components" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    window.history.back();
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Features" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    const path = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    await expect(
      path.getByRole("link", { name: example.product.board.name }),
    ).toHaveAttribute("href", `/boards/${example.product.board.id}/releases`);
    window.history.back();
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Overview" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
  },
};
