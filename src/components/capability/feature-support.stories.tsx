import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/i18n/messages/en/product.json";
import { getReleaseDemo } from "@/lib/release-demo";
import { FeatureSupport } from "./feature-support";

const example = getReleaseDemo();
const capability = example.product.capabilities.find(
  (item) => item.id === "cap-export",
);
if (!capability) throw new Error("Feature story requires the export fixture.");
const screen = example.product.screens.find((item) => item.regions.length > 0);
const region = screen?.regions[0];
if (!screen || !region)
  throw new Error("Feature story requires a screen region.");

const meta = {
  component: FeatureSupport,
  tags: ["ai-generated"],
  args: {
    capability,
    product: example.product,
    editable: true,
    mutate: fn(async () => {}),
  },
} satisfies Meta<typeof FeatureSupport>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AddSystemInContext: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByText(messages.supportingDetails));
    await userEvent.click(
      canvas.getByRole("button", { name: messages.addSupportingSystem }),
    );
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveTextContent(capability.name);
    await expect(within(dialog).getAllByRole("combobox")).toHaveLength(1);
    await userEvent.click(within(dialog).getByRole("combobox"));
    await expect(
      page.queryByRole("option", { name: "Billing API" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      page.getByRole("option", { name: "Identity service" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: messages.saveConnection }),
    );
    await waitFor(() =>
      expect(args.mutate).toHaveBeenCalledWith({
        type: "capability_component.put",
        data: {
          capabilityId: capability.id,
          componentId: "cmp-identity",
          relation: "uses",
          description: "",
          required: false,
        },
      }),
    );
  },
};

export const LinkScreenInContext: Story = {
  args: { product: { ...example.product, regionCapabilities: [] } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByText(messages.supportingDetails));
    await userEvent.click(
      canvas.getByRole("button", { name: messages.linkScreen }),
    );
    const dialog = within(page.getByRole("dialog"));
    await expect(dialog.getAllByRole("combobox")).toHaveLength(1);
    await userEvent.click(dialog.getByRole("combobox"));
    await userEvent.click(
      page.getByRole("option", {
        name: `${screen.label ?? messages.screen} · ${region.label ?? messages.region}`,
      }),
    );
    await userEvent.click(
      dialog.getByRole("button", { name: messages.saveConnection }),
    );
    await waitFor(() =>
      expect(args.mutate).toHaveBeenCalledWith({
        type: "region_capability.put",
        data: { capabilityId: capability.id, regionId: region.id },
      }),
    );
  },
};

export const Viewer: Story = {
  args: { editable: false },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(messages.supportingDetails));
    await expect(canvas.getByText("Billing API")).toBeVisible();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    await expect(args.mutate).not.toHaveBeenCalled();
  },
};

export const UnlinkFailure: Story = {
  args: {
    product: { ...example.product, regionCapabilities: [] },
    mutate: fn(async () => {
      throw new Error("Connection could not be removed.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(messages.supportingDetails));
    await userEvent.click(
      canvas.getByRole("button", { name: `${messages.unlink}: Billing API` }),
    );
    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "Connection could not be removed.",
    );
    await expect(args.mutate).toHaveBeenCalledWith({
      type: "capability_component.delete",
      data: { capabilityId: capability.id, componentId: "cmp-billing" },
    });
    await expect(canvas.getByText("Billing API")).toBeVisible();
  },
};
