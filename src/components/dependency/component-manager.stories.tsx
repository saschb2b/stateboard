import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ComponentManager } from "./component-manager";
const example = getReleaseDemo();
/** Presentation interactions only. Stories never submit a product mutation. */
const meta = {
  component: ComponentManager,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof ComponentManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const MembershipEnded: Story = {
  args: {
    product: {
      ...example.product,
      components: example.product.components.map((component, index) => ({
        ...component,
        ownerNeedsReassignment: index === 0,
      })),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        "Owner membership ended; review accountability.",
      ),
    ).toBeVisible();
  },
};

export const WorkspaceReuse: Story = {
  args: {
    product: {
      ...example.product,
      components: [
        ...example.product.components,
        {
          ...example.product.components[0]!,
          id: "other-product-api",
          name: "Other product API",
          description: "Reusable workspace component.",
        },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      canvas.getByText("Linked to this product: 5 · Available in workspace: 1"),
    ).toBeVisible();
    await expect(
      canvas.queryByText("Other product API"),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Browse workspace components" }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Search workspace components" }),
      "Other product",
    );
    await expect(canvas.getByText("Other product API")).toBeVisible();
    await expect(canvas.getByText("Available to link")).toBeVisible();
    await expect(canvas.queryByText("Billing API")).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Link to feature" }),
    );
    await expect(page.getByRole("dialog")).toHaveTextContent(
      "Link Other product API to this product",
    );
    await userEvent.click(page.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(page.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await expect(args.mutate).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Show linked components" }),
    );
    await expect(canvas.getByText("Billing API")).toBeVisible();
    await expect(
      canvas.queryByText("Other product API"),
    ).not.toBeInTheDocument();
  },
};
