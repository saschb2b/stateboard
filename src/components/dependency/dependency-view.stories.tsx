import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
    onCheckScopeChange: fn(),
  },
} satisfies Meta<typeof DependencyView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ArchitectureSlice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("No component-specific verification configured"),
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
      canvas.getByText(
        "Ledger read set is consistent. · pass · staging-eu · Required check",
      ),
    ).toBeVisible();
    await expect(
      canvas.getAllByText("No component-specific verification configured"),
    ).toHaveLength(4);
  },
};

const catalogProduct = {
  ...example.product,
  components: [
    ...example.product.components,
    {
      ...example.product.components[0]!,
      id: "other-product-api",
      name: "Other product API",
    },
    {
      ...example.product.components[0]!,
      id: "restore-agent",
      name: "Restore agent",
    },
  ],
  dependencies: [
    ...example.product.dependencies,
    {
      id: "cycle",
      consumerId: "cmp-db",
      providerId: "cmp-billing",
      relation: "reports to",
      required: false,
      description: "Supporting cycle context.",
    },
  ],
};
export const FocusedSubjectsWithWorkspaceCatalog: Story = {
  args: {
    product: catalogProduct,
    detail: {
      ...configured,
      checks: [
        ...configured.checks,
        {
          ...componentCheck,
          id: "restore-agent-check",
          subjectId: "restore-agent",
          claim: "Restore agent has a configured check.",
        },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Inspect component impact" }),
    );
    await expect(
      page.queryByRole("option", { name: "Other product API" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(page.getByRole("option", { name: "Restore agent" })).toBeVisible(),
    );
    await userEvent.click(page.getByRole("option", { name: "Ledger store" }));
    await waitFor(() =>
      expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    await expect(args.onCheckScopeChange).toHaveBeenLastCalledWith({
      capabilityIds: ["cap-export", "cap-reconcile", "cap-search"],
      componentIds: ["cmp-billing", "cmp-db"],
      includeRelease: true,
    });
    await expect(canvas.getByText(/Supporting cycle context\./)).toBeVisible();
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Focus on capability" }),
    );
    await waitFor(() =>
      expect(
        page.getByRole("option", { name: "Export an invoice" }),
      ).toBeVisible(),
    );
    await userEvent.click(
      page.getByRole("option", { name: "Export an invoice" }),
    );
    await waitFor(() =>
      expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    await expect(args.onCheckScopeChange).toHaveBeenLastCalledWith({
      capabilityIds: ["cap-export"],
      componentIds: ["cmp-billing", "cmp-db"],
      includeRelease: true,
    });
    await expect(
      canvas.queryByText(
        "Restore agent has a configured check. · Not evaluated · staging-eu · Required check",
      ),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear architecture focus" }),
    );
    await expect(args.onCheckScopeChange).toHaveBeenLastCalledWith(null);
    await expect(
      canvas.getByText(
        "Restore agent has a configured check. · Not evaluated · staging-eu · Required check",
      ),
    ).toBeVisible();
  },
};
