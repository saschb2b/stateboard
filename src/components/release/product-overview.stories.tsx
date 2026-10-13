import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { evaluateRelease } from "@/lib/readiness";
import { buildReleaseOverviewCoverage } from "@/lib/product-overview";
import {
  evidenceRecord,
  productFixture,
  releaseFixture,
  TEST_NOW,
} from "@/lib/release-test-data";
import type {
  ProductContext,
  ReleaseDetail,
  ReleaseOverview,
} from "@/lib/release-types";
import { ProductOverview } from "./product-overview";

function assessmentOverview(detail: ReleaseDetail): ReleaseOverview {
  const readiness = evaluateRelease(detail, TEST_NOW);
  return {
    assessment: detail.assessment,
    state: readiness.state,
    blockerCount: readiness.blockers.length,
    gapCount: readiness.gaps.length,
    evaluatedAt: readiness.evaluatedAt,
    validUntil: readiness.validUntil,
    decision: null,
    decisionRevision: null,
    decisionAt: null,
    coverage: buildReleaseOverviewCoverage(
      detail.scope,
      detail.checks,
      readiness,
    ),
  };
}

function assessedProduct(
  detail: ReleaseDetail,
  product = productFixture(),
): ProductContext {
  return {
    ...product,
    releases: [detail.assessment],
    releaseOverviews: [assessmentOverview(detail)],
  };
}

const meta = {
  component: ProductOverview,
  tags: ["ai-generated"],
  args: {
    product: assessedProduct(releaseFixture()),
    editable: true,
    onCreate: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof ProductOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

const mixedProduct = productFixture();
const mixedDetail = releaseFixture();
mixedProduct.capabilities[0]!.definitionRevision = 2;
mixedProduct.capabilities[0]!.outcome = "Receive a signed PDF";
mixedProduct.capabilities.push(
  {
    ...mixedProduct.capabilities[0]!,
    id: "excluded",
    name: "Schedule an invoice",
    outcome: "Send an invoice on a chosen date.",
  },
  {
    ...mixedProduct.capabilities[0]!,
    id: "unscoped",
    name: "Import an invoice",
    outcome: "Add an invoice from a file.",
  },
);
mixedDetail.scope.push({
  ...mixedDetail.scope[0]!,
  capabilityId: "excluded",
  name: "Schedule an invoice",
  outcome: "Send an invoice on a chosen date.",
  included: false,
  definitionRevision: 2,
  scopeReason: "Deferred to the next candidate.",
});

export const MixedCatalogAndRetainedDefinitions: Story = {
  args: { product: assessedProduct(mixedDetail, mixedProduct) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const included = canvas.getByText("Export invoice").closest("details");
    const excluded = canvas.getByText("Schedule an invoice").closest("details");
    const unscoped = canvas.getByText("Import an invoice").closest("details");
    if (!included || !excluded || !unscoped)
      throw new Error("Each capability must have a disclosure row.");
    await expect(within(included).getByText("Ready · checks")).toBeVisible();
    await expect(within(excluded).getByText("Excluded")).toBeVisible();
    await expect(within(unscoped).getByText("Not in assessment")).toBeVisible();
    await expect(
      within(included).getByText(/Definition changed/),
    ).toBeVisible();
    await expect(within(included).getByText("Receive a PDF")).not.toBeVisible();
    const summary = included.querySelector("summary");
    if (!summary) throw new Error("The capability row needs a summary.");
    summary.focus();
    await expect(summary).toHaveFocus();
    await userEvent.click(summary);
    await expect(included).toHaveAttribute("open");
    await expect(within(included).getByText("Receive a PDF")).toBeVisible();
    await expect(
      within(included).getByText(/retains definition 1/),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Receive a signed PDF"),
    ).not.toBeInTheDocument();
    await userEvent.click(summary);
    await expect(included).not.toHaveAttribute("open");
  },
};

const optionalDetail = releaseFixture();
optionalDetail.checks.push({
  ...optionalDetail.checks[0]!,
  id: "optional-security",
  subjectType: "release",
  subjectId: null,
  claim: "A report lists unused API keys.",
  category: "security",
  required: false,
});
optionalDetail.evidence.push(
  evidenceRecord({
    id: "optional-failure",
    checkId: "optional-security",
    result: "fail",
    sequence: 2,
  }),
);

export const MissingCategoryAndOptionalWarning: Story = {
  args: { product: assessedProduct(optionalDetail) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const latest = within(
      canvas.getByRole("region", { name: "Latest assessment" }),
    );
    const coverage = within(
      canvas.getByRole("region", { name: "Verification coverage" }),
    );
    await expect(latest.getByText("Ready", { exact: true })).toBeVisible();
    await expect(
      latest.queryByText("Blocked", { exact: true }),
    ).not.toBeInTheDocument();
    await expect(latest.queryByText(/unresolved item/)).not.toBeInTheDocument();
    await expect(
      coverage.getByRole("link", {
        name: "Security: 1 optional check · No required checks · 1 optional warning. Review checks",
      }),
    ).toHaveAttribute(
      "href",
      "/boards/board1/releases/release1?view=qa&category=security",
    );
    await expect(
      coverage.getByRole("link", {
        name: "Integration: No checks defined. Review checks",
      }),
    ).toHaveAttribute(
      "href",
      "/boards/board1/releases/release1?view=qa&category=integration",
    );
    await expect(
      coverage.getByRole("link", {
        name: "Functionality: 1/1 required pass. Review checks",
      }),
    ).toBeVisible();
  },
};

export const NoAssessment: Story = {
  args: { product: productFixture() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "No release assessment yet" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Not assessed", { exact: true }),
    ).toBeVisible();
    await expect(canvas.queryByText(/^Ready/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: "Review assessment" }),
    ).not.toBeInTheDocument();
    const coverage = within(
      canvas.getByRole("region", { name: "Verification coverage" }),
    );
    await expect(coverage.queryAllByRole("link")).toHaveLength(0);
    await expect(coverage.getAllByText("No assessment yet")).toHaveLength(6);
    await userEvent.click(
      canvas.getByRole("button", { name: "New assessment" }),
    );
    await expect(args.onCreate).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "View catalog" }));
    await expect(args.onNavigate).toHaveBeenCalledWith("capabilities");
  },
};

export const NoAssessmentViewer: Story = {
  args: { product: productFixture(), editable: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "No release assessment yet" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "New assessment" }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText(/^Ready/)).not.toBeInTheDocument();
  },
};

const emptyDetail = releaseFixture();
emptyDetail.scope = [];
emptyDetail.checks = [];
emptyDetail.evidence = [];

export const EmptyIncludedScope: Story = {
  args: { product: assessedProduct(emptyDetail) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const latest = within(
      canvas.getByRole("region", { name: "Latest assessment" }),
    );
    await expect(
      latest.getByText("Needs evidence", { exact: true }),
    ).toBeVisible();
    const finding = latest.getByText("1 unresolved item");
    await expect(
      latest.getByText("No capabilities included in this assessment."),
    ).not.toBeVisible();
    finding.focus();
    await expect(finding).toHaveFocus();
    await userEvent.click(finding);
    await expect(
      latest.getByText("No capabilities included in this assessment."),
    ).toBeVisible();
    await expect(
      canvas.getByText("Not in assessment", { exact: true }),
    ).toBeVisible();
  },
};

const uncheckedDetail = releaseFixture();
uncheckedDetail.checks = [];
uncheckedDetail.evidence = [];

export const IncludedCapabilityWithoutAcceptance: Story = {
  args: { product: assessedProduct(uncheckedDetail) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const latest = within(
      canvas.getByRole("region", { name: "Latest assessment" }),
    );
    await expect(
      latest.getByText("Needs evidence", { exact: true }),
    ).toBeVisible();
    await userEvent.click(latest.getByText("1 unresolved item"));
    await expect(
      latest.getByText(
        "Export invoice: no required functional acceptance check.",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByText("No required checks", { exact: true }),
    ).toBeVisible();
    await expect(canvas.queryByText("Ready · checks")).not.toBeInTheDocument();
  },
};

const failedDetail = releaseFixture();
failedDetail.evidence[0]!.result = "fail";
const previousDetail = releaseFixture();
previousDetail.assessment = {
  ...previousDetail.assessment,
  id: "previous",
  candidateLabel: "Previous candidate",
};
previousDetail.scope = previousDetail.scope.map((item) => ({
  ...item,
  assessmentId: "previous",
}));
previousDetail.checks = previousDetail.checks.map((item) => ({
  ...item,
  assessmentId: "previous",
}));
previousDetail.evidence = previousDetail.evidence.map((item) => ({
  ...item,
  assessmentId: "previous",
}));
const failedProduct = assessedProduct(failedDetail);
failedProduct.releases.push(previousDetail.assessment);
failedProduct.releaseOverviews?.unshift(assessmentOverview(previousDetail));

export const FindingUsesLatestCandidate: Story = {
  args: { product: failedProduct },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const latest = within(
      canvas.getByRole("region", { name: "Latest assessment" }),
    );
    await expect(latest.getByRole("heading", { name: "RC 1" })).toBeVisible();
    await expect(latest.getByText("Blocked", { exact: true })).toBeVisible();
    await expect(
      latest.getByRole("link", { name: "Review assessment" }),
    ).toHaveAttribute("href", "/boards/board1/releases/release1");
    await userEvent.click(latest.getByText("1 unresolved item"));
    await expect(
      latest.getByRole("link", {
        name: "Authorized user receives a valid PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/boards/board1/releases/release1?view=qa&check=check1",
    );
    await expect(
      latest.queryByText("Previous candidate"),
    ).not.toBeInTheDocument();
  },
};
