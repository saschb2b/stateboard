import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { expect, fn, userEvent, within } from "storybook/test";
import { CapabilityVisualView } from "./capability-visual-view";
const example = getReleaseDemo();
const meta = {
  component: CapabilityVisualView,
  tags: ["ai-generated"],
  args: {
    detail: example.detail,
    product: example.product,
    readiness: example.readiness,
  },
} satisfies Meta<typeof CapabilityVisualView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const VisualAndNonVisual: Story = {};
export const NoScreensYet: Story = {
  args: {
    product: { ...example.product, screens: [], regionCapabilities: [] },
    onReviewView: fn(),
    screensHref: "/boards/example",
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("No screens yet")).toBeVisible();
    await expect(canvas.getByText("Export an invoice")).not.toBeVisible();
    await userEvent.click(canvas.getByText(/features without a linked screen/));
    await expect(canvas.getByText("Export an invoice")).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Manage screens" }),
    ).toHaveAttribute("href", "/boards/example");
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(args.onReviewView).toHaveBeenCalledWith("backend", undefined);
    await userEvent.click(canvas.getByRole("button", { name: "View checks" }));
    await expect(args.onReviewView).toHaveBeenCalledWith("qa", undefined);
  },
};

export const SelectedCapabilityNavigation: Story = {
  args: {
    product: { ...example.product, screens: [], regionCapabilities: [] },
    onReviewView: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      page.getByRole("option", { name: "Export an invoice" }),
    );
    await expect(canvas.getByText("No linked screen")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "backend",
      "cap-export",
    );
    await userEvent.click(canvas.getByRole("button", { name: "View checks" }));
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "qa",
      "cap-export",
    );
  },
};

export const LinkedCapabilityNavigation: Story = {
  args: { onReviewView: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(
      page.getByRole("option", { name: "Export an invoice" }),
    );
    await expect(canvas.getAllByRole("img")[0]).toBeVisible();
    const imageLink = canvas.getByRole("link", {
      name: /^Open full-size image:/,
    });
    await expect(imageLink).toHaveAttribute(
      "href",
      example.product.screens[0]!.mediaUrl,
    );
    await expect(imageLink).toHaveAttribute("target", "_blank");
    await expect(
      canvas.queryByText("No linked screen"),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "View architecture" }),
    );
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "backend",
      "cap-export",
    );
    await userEvent.click(canvas.getByRole("button", { name: "View checks" }));
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "qa",
      "cap-export",
    );
  },
};

export const PopulatedScreensStayActionable: Story = {
  args: {
    onReviewView: fn(),
    screensHref: "/boards/example",
    selectedCapabilityId: "cap-export",
    product: {
      ...example.product,
      screens: example.product.screens.map((screen) => ({
        ...screen,
        regions: screen.regions.map((region) => ({
          ...region,
          notes:
            "Earlier product version. Source: https://example.com/release-notes",
        })),
      })),
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("img")[0]).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Manage screens" }),
    ).toHaveAttribute("href", "/boards/example");
    await expect(
      canvas.getByText(
        "Screens show product context and may depict another version. Check results verify this release candidate.",
      ),
    ).toBeVisible();
    const notes = canvas.getByText("Notes and source");
    notes.focus();
    await expect(notes).toHaveFocus();
    await userEvent.click(notes);
    await expect(
      canvas.getByRole("link", { name: "https://example.com/release-notes" }),
    ).toBeVisible();
    await userEvent.tab();
    await expect(
      canvas.getByRole("link", { name: "https://example.com/release-notes" }),
    ).toHaveFocus();
    await userEvent.click(
      canvas.getByRole("button", { name: "View checks for Export an invoice" }),
    );
    await expect(args.onReviewView).toHaveBeenLastCalledWith(
      "qa",
      "cap-export",
    );
  },
};

export const ControlledFeatureFilter: Story = {
  args: {
    selectedCapabilityId: "cap-export",
    onCapabilityChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      canvas.getByRole("combobox", { name: "Feature" }),
    ).toHaveTextContent("Export an invoice");
    await userEvent.click(canvas.getByRole("combobox", { name: "Feature" }));
    await userEvent.click(page.getByRole("option", { name: "All screens" }));
    await expect(args.onCapabilityChange).toHaveBeenCalledWith(null);
  },
};

export const UnrelatedScreenDoesNotCreateReviewGap: Story = {
  args: {
    onReviewView: fn(),
    detail: { ...example.detail, scope: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Not in release review")).toBeVisible();
    await expect(canvas.queryByText(/Needs evidence/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", {
        name: "View checks for Export an invoice",
      }),
    ).not.toBeInTheDocument();
  },
};
