import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ProductConnections } from "./product-connections";
const example = getReleaseDemo();
/** Presentation interactions only. Stories never submit a product mutation. */
const meta = {
  component: ProductConnections,
  tags: ["ai-generated"],
  args: {
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof ProductConnections>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Example: Story = {};
export const ProductWiringWithReusableCatalog: Story = {
  args: {
    product: {
      ...example.product,
      components: [
        ...example.product.components,
        {
          ...example.product.components[0]!,
          id: "other-product-api",
          name: "Other product API",
        },
      ],
      dependencies: [
        ...example.product.dependencies,
        {
          ...example.product.dependencies[0]!,
          id: "other-product-link",
          consumerId: "other-product-api",
          providerId: "other-product-api",
          description: "Other product dependency context.",
        },
      ],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      canvas.queryByText(/Other product dependency context/),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Link capability" }),
    );
    await userEvent.click(page.getByRole("combobox", { name: "Component" }));
    await waitFor(() =>
      expect(
        page.getByRole("option", {
          name: "Other product API · available in workspace",
        }),
      ).toBeVisible(),
    );
    await userEvent.click(
      page.getByRole("option", {
        name: "Other product API · available in workspace",
      }),
    );
    await waitFor(() =>
      expect(page.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    await userEvent.click(page.getByRole("button", { name: "Cancel" }));
    await expect(args.mutate).not.toHaveBeenCalled();
  },
};
