import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ReleaseScope } from "./release-scope";

const example = getReleaseDemo();
const meta = {
  component: ReleaseScope,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    editable: false,
    mutate: fn(async () => {}),
    onInspectCheck: fn(),
    onReviewView: fn(),
  },
} satisfies Meta<typeof ReleaseScope>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CapabilityReadiness: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole("button", {
      name: "Details for Export an invoice",
    });
    await expect(row).toHaveAccessibleDescription("Blocked · checks");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(
      canvas.queryByText("Included because"),
    ).not.toBeInTheDocument();
    await userEvent.click(row);
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByText("Frontend + billing · Definition 1"),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Inspect acceptance check" }),
    );
    await expect(args.onInspectCheck).toHaveBeenCalledWith("check-export");
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(args.onReviewView).toHaveBeenCalledWith(
      "backend",
      "cap-export",
    );
    await userEvent.click(row);
    await expect(row).toHaveAttribute("aria-expanded", "false");
  },
};

export const EditableScope: Story = {
  args: { editable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Edit scope" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Details for Export an invoice" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Edit scope" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("heading", {
          name: "Review capability scope",
        }),
      ).toBeVisible(),
    );
    await expect(
      within(dialog).getByRole("textbox", {
        name: /Reason for including or excluding/,
      }),
    ).toHaveValue("Critical outcome for this release.");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
  },
};

export const ExclusionAndNewerDefinition: Story = {
  args: {
    detail: {
      ...example.detail,
      scope: example.detail.scope.map((item) =>
        item.capabilityId === "cap-search"
          ? {
              ...item,
              included: false,
              scopeReason: "Search ships in a later release.",
            }
          : item,
      ),
    },
    product: {
      ...example.product,
      capabilities: example.product.capabilities.map((item) =>
        item.id === "cap-export" ? { ...item, definitionRevision: 2 } : item,
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Newer definition available")).toBeVisible();
    await expect(canvas.getByText("Excluded")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Details for Search invoices" }),
    );
    await expect(canvas.getByText("Excluded because")).toBeVisible();
    await expect(
      canvas.getByText("Search ships in a later release."),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Inspect acceptance check" }),
    ).not.toBeInTheDocument();
  },
};

export const EmptyScope: Story = {
  args: {
    detail: { ...example.detail, scope: [] },
    editable: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add to scope" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog");
    await waitFor(() =>
      expect(
        within(dialog).getByRole("heading", {
          name: "Add capability to this assessment",
        }),
      ).toBeVisible(),
    );
    await expect(
      within(dialog).getByRole("combobox", { name: /Capability/ }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
  },
};
