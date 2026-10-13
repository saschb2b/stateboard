import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { ComponentProps } from "react";
import { getReleaseDemo } from "@/lib/release-demo";
import { evaluateRelease } from "@/lib/readiness";
import {
  useCheckCategory,
  useCheckFocus,
} from "@/components/release/use-check-focus";
import { CheckManager } from "./check-manager";
const example = getReleaseDemo();
const meta = {
  component: CheckManager,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
    now: example.now,
    editable: false,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof CheckManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const EvidenceCoverage: Story = {};
export const OperationsRequirements: Story = { args: { operationsOnly: true } };

export const AttentionAndOwnerSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const attention = canvas.getByRole("button", { name: /Needs attention/ });
    attention.focus();
    await userEvent.keyboard("{Enter}");
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[1]!.claim),
    ).not.toBeInTheDocument();
    await userEvent.type(
      canvas.getByLabelText("Search claims or owners"),
      "Identity",
    );
    await expect(
      canvas.getByText(example.detail.checks[2]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset filters" }),
    );
    await expect(
      canvas.getByText(example.detail.checks[1]!.claim),
    ).toBeVisible();
  },
};

const warningDetail = structuredClone(example.detail);
warningDetail.evidence.find(
  (item) => item.checkId === "check-security",
)!.result = "fail";
export const OptionalWarning: Story = {
  args: {
    detail: warningDetail,
    readiness: evaluateRelease(warningDetail, example.now),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Needs attention/ }),
    );
    await expect(
      canvas.getByText("Partner signatures are checked before ingest."),
    ).toBeVisible();
    await expect(canvas.getByText(/1 optional$/)).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Partner signatures are checked before ingest.",
      }),
    );
    await expect(
      canvas.getByText(/Optional · does not block release/),
    ).toBeVisible();
  },
};

export const FunctionalOperationsClaims: Story = {
  args: { operationsOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByLabelText("Include functional checks"));
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.getByText(example.detail.checks[5]!.claim),
    ).toBeVisible();
  },
};

function FocusHarness(args: ComponentProps<typeof CheckManager>) {
  const [checkId, setCheckId] = useCheckFocus(args.focusedCheckId ?? undefined);
  return (
    <CheckManager
      {...args}
      focusedCheckId={checkId}
      onClearFocus={() => setCheckId(null)}
    />
  );
}

export const FocusedFinding: Story = {
  args: { focusedCheckId: "check-export", operationsOnly: true },
  render: (args) => <FocusHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[5]!.claim),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByLabelText("Search claims or owners"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByText(example.detail.checks[0]!.method),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear check focus" }),
    );
    await expect(
      canvas.getByText(example.detail.checks[5]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
  },
};

export const UnknownFinding: Story = {
  args: { focusedCheckId: "no-longer-active", onClearFocus: fn() },
};
export const SubjectScope: Story = {
  args: {
    subjectScope: {
      capabilityIds: ["cap-webhook"],
      componentIds: [],
      includeRelease: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(example.detail.checks[1]!.claim),
    ).toBeVisible();
    await expect(
      canvas.getByText(example.detail.checks[5]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
  },
};

export const ExpandCheckDetails: Story = {
  args: { editable: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const check = example.detail.checks[0]!;
    await expect(canvas.queryByText(check.method)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Record evidence" }),
    ).not.toBeInTheDocument();
    const row = canvas.getByRole("button", { name: check.claim });
    row.focus();
    await userEvent.keyboard("{Enter}");
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText(check.method)).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Record evidence" }),
    ).toBeVisible();
    await userEvent.click(row);
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(canvas.queryByText(check.method)).not.toBeInTheDocument(),
    );
  },
};

function CategoryHarness(args: ComponentProps<typeof CheckManager>) {
  const [category, setCategory] = useCheckCategory(
    args.initialCategory ?? undefined,
  );
  const [checkId, setCheckId] = useCheckFocus(args.focusedCheckId ?? undefined);
  return (
    <CheckManager
      {...args}
      key={category ?? "all"}
      initialCategory={category}
      focusedCheckId={checkId}
      onCategoryChange={(next) => {
        setCategory(next);
        args.onCategoryChange?.(next);
      }}
      onClearFocus={() => {
        setCheckId(null);
        setCategory(null);
      }}
    />
  );
}

export const CategoryFilter: Story = {
  args: { initialCategory: "operational", onCategoryChange: fn() },
  render: (args) => <CategoryHarness {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Category: operational")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "More filters" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      canvas.getByText(example.detail.checks[5]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
    const reset = canvas.getByRole("button", { name: "Reset filters" });
    reset.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onCategoryChange).toHaveBeenCalledWith(null);
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Category: operational"),
    ).not.toBeInTheDocument();
  },
};

export const EmptyCategoryFilter: Story = {
  args: { initialCategory: "integration" },
  render: (args) => <CategoryHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("No matching checks. Try another filter."),
    ).toBeVisible();
    await expect(canvas.getByText("Category: integration")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Clear integration category filter",
      }),
    );
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
  },
};

export const FocusedCheckOverridesCategory: Story = {
  args: { initialCategory: "operational", focusedCheckId: "check-export" },
  render: (args) => <CategoryHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.getByText(example.detail.checks[0]!.method),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[5]!.claim),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear check focus" }),
    );
    await expect(
      canvas.getByText(example.detail.checks[0]!.claim),
    ).toBeVisible();
    await expect(
      canvas.getByText(example.detail.checks[5]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Category: operational"),
    ).not.toBeInTheDocument();
  },
};

export const CategoryLocationAndHistory: Story = {
  render: (args) => <CategoryHarness {...args} />,
  beforeEach: () => {
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    window.history.replaceState(
      originalState,
      "",
      "/share/demo/releases?view=qa&category=operational&other=kept#evidence",
    );
    return () => window.history.replaceState(originalState, "", originalUrl);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Category: operational")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Reset filters" }),
    );
    const location = new URL(window.location.href);
    await expect(location.searchParams.has("category")).toBe(false);
    await expect(location.searchParams.get("view")).toBe("qa");
    await expect(location.searchParams.get("other")).toBe("kept");
    await expect(location.hash).toBe("#evidence");
    location.searchParams.set("category", "security");
    window.history.replaceState(null, "", location);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() =>
      expect(canvas.getByText("Category: security")).toBeVisible(),
    );
    await expect(
      canvas.getByText(example.detail.checks[6]!.claim),
    ).toBeVisible();
    await expect(
      canvas.queryByText(example.detail.checks[0]!.claim),
    ).not.toBeInTheDocument();
    location.searchParams.set("category", "unknown-category");
    window.history.replaceState(null, "", location);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() =>
      expect(canvas.getByText(example.detail.checks[0]!.claim)).toBeVisible(),
    );
    await expect(
      canvas.queryByText("Category: security"),
    ).not.toBeInTheDocument();
  },
};
