import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { Capability } from "@/lib/release-types";
import { RegionFeatureLinks } from "./region-feature-links";

const feature: Capability = {
  id: "feature",
  boardId: "board",
  name: "Find project work",
  outcome: "Continue a saved chat",
  definitionRevision: 1,
  ownerLabel: "Product team",
  ownerUserId: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
};
const meta = {
  component: RegionFeatureLinks,
  tags: ["ai-generated"],
  args: {
    regionId: "region",
    capabilities: [feature],
    links: [],
    readOnly: false,
    onChange: fn(async () => {}),
  },
  render: function RegionLinks(args) {
    const [links, setLinks] = useState(args.links);
    return (
      <RegionFeatureLinks
        {...args}
        links={links}
        onChange={async (regionId, capabilityId, linked) => {
          await args.onChange(regionId, capabilityId, linked);
          setLinks((current) =>
            linked
              ? [...current, { regionId, capabilityId }]
              : current.filter(
                  (link) =>
                    link.regionId !== regionId ||
                    link.capabilityId !== capabilityId,
                ),
          );
        }}
      />
    );
  },
} satisfies Meta<typeof RegionFeatureLinks>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LinkAndUnlink: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Link a feature" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: feature.name }),
    );
    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith("region", "feature", true),
    );
    await expect(
      canvas.queryByText("No feature linked yet."),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await canvas.findByRole("button", { name: `Unlink ${feature.name}` }),
    );
    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith("region", "feature", false),
    );
    await expect(canvas.getByText("No feature linked yet.")).toBeVisible();
  },
};
export const FailedLink: Story = {
  args: {
    onChange: fn(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Link a feature" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: feature.name }),
    );
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Connection lost. Try again.",
    );
    await expect(canvas.getByText("No feature linked yet.")).toBeVisible();
    await expect(canvas.getByRole("combobox")).not.toBeDisabled();
  },
};
export const ViewerLinks: Story = {
  args: {
    links: [{ regionId: "region", capabilityId: "feature" }],
    readOnly: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(feature.name)).toBeVisible();
    await expect(canvas.queryByRole("combobox")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};
export const GermanLinks: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("combobox", { name: "Funktion verknüpfen" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Noch keine Funktion verknüpft."),
    ).toBeVisible();
  },
};
