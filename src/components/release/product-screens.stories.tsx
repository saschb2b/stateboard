import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, spyOn, userEvent, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { ProductScreenPreview, ProductScreens } from "./product-screens";

const { product } = getReleaseDemo();
const screen = product.screens[0]!;
const region = screen.regions[0]!;
const linkedProduct = {
  ...product,
  screens: [
    {
      ...screen,
      label: "Invoice editor",
      regions: [region, { ...region, id: "second-region" }],
    },
  ],
  regionCapabilities: [
    { regionId: region.id, capabilityId: "cap-export" },
    { regionId: "second-region", capabilityId: "cap-export" },
  ],
};

const meta = {
  component: ProductScreens,
  tags: ["ai-generated"],
  args: { product: linkedProduct, editable: true, onScreensAdded: fn() },
} satisfies Meta<typeof ProductScreens>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LinkedScreens: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", {
      name: "Open screen: Invoice editor",
    });
    await expect(link).toHaveAttribute(
      "href",
      `/boards/${product.board.id}?screen=${screen.id}`,
    );
    await expect(link).toHaveAccessibleDescription(
      "2 annotations · 1 linked feature",
    );
    link.focus();
    await expect(link).toHaveFocus();
    await expect(
      canvas.getByRole("img", { name: "Invoice editor" }),
    ).toHaveAttribute("src", screen.mediaUrl);
  },
};

export const Viewer: Story = {
  args: { editable: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "Add screen" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Open screen: Invoice editor" }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: { product: { ...product, screens: [] } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("No screens yet")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Add screen" }));
    const dialog = within(
      within(canvasElement.ownerDocument.body).getByRole("dialog", {
        name: "Add a screen",
      }),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await expect(
      canvas.getByRole("button", { name: "Add screen" }),
    ).toHaveFocus();
  },
};

export const FailedUploadKeepsDialogOpen: Story = {
  play: async ({ canvas, canvasElement, args }) => {
    const fetch = spyOn(window, "fetch").mockResolvedValue(
      Response.json({ error: "Upload failed. Try again." }, { status: 500 }),
    );
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Add screen" }));
      const dialog = within(
        within(canvasElement.ownerDocument.body).getByRole("dialog", {
          name: "Add a screen",
        }),
      );
      await userEvent.upload(
        dialog.getByLabelText("Screenshot file"),
        new File(["image"], "new-view.png", { type: "image/png" }),
      );
      await expect(dialog.findByRole("alert")).resolves.toHaveTextContent(
        "Upload failed. Try again.",
      );
      await expect(args.onScreensAdded).not.toHaveBeenCalled();
      await expect(
        dialog.getByRole("button", { name: "Choose screenshot" }),
      ).toBeEnabled();
      await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    } finally {
      fetch.mockRestore();
    }
  },
};

export const German: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Ansicht öffnen: Invoice editor" }),
    ).toHaveAccessibleDescription("2 Markierungen · 1 verknüpfte Funktion");
  },
};

const onViewAll = fn();
export const BoundedOverviewPreview: Story = {
  args: {
    product: {
      ...product,
      screens: Array.from({ length: 4 }, (_, index) => ({
        ...screen,
        id: `screen-${index}`,
        label: `Product view ${index + 1}`,
        regions: [],
      })),
    },
  },
  render: ({ product }) => (
    <ProductScreenPreview product={product} onViewAll={onViewAll} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(3);
    await expect(
      canvas.queryByRole("link", { name: "Open screen: Product view 4" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "View all screens" }),
    );
    await expect(onViewAll).toHaveBeenCalledOnce();
  },
};

const phoneViewport = {
  options: {
    phone: {
      name: "Phone",
      styles: { width: "390px", height: "844px" },
      type: "mobile" as const,
    },
  },
};

export const MobilePreviewStaysInOneRow: Story = {
  ...BoundedOverviewPreview,
  parameters: { viewport: phoneViewport },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link");
    await expect(links).toHaveLength(3);
    await expect(links[0]!.getBoundingClientRect().top).toBe(
      links[2]!.getBoundingClientRect().top,
    );
    links[0]!.focus();
    await userEvent.tab();
    await userEvent.tab();
    await expect(links[2]).toHaveFocus();
    await expect(links[2]!.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};
