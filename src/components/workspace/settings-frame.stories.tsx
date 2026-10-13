import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Typography } from "@mui/material";
import { SettingsFrame } from "./settings-frame";

const meta = {
  component: SettingsFrame,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    section: "api-keys",
    title: "API keys",
    description: "Connect agents and CI to this workspace.",
    children: <Typography>Agent connections</Typography>,
    viewer: {
      user: {
        id: "example-owner",
        email: "owner@example.test",
        name: "Example owner",
        image: null,
      },
      workspaceId: "default",
      role: "owner",
    },
  },
} satisfies Meta<typeof SettingsFrame>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OwnerNavigation: Story = {
  play: async ({ canvas }) => {
    const navigation = within(
      canvas.getByRole("navigation", { name: "Workspace settings" }),
    );
    await expect(
      navigation.getByRole("link", { name: "API keys" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation.getByRole("link", { name: "Members" }),
    ).toHaveAttribute("href", "/settings/members");
    await expect(
      navigation.getByRole("link", { name: "Audit log" }),
    ).toHaveAttribute("href", "/settings/audit");
  },
};
export const ViewerNavigation: Story = {
  args: { viewer: { ...meta.args.viewer, role: "viewer" } },
  play: async ({ canvas }) => {
    const navigation = within(
      canvas.getByRole("navigation", { name: "Workspace settings" }),
    );
    await expect(
      navigation.queryByRole("link", { name: "Members" }),
    ).not.toBeInTheDocument();
    await expect(
      navigation.queryByRole("link", { name: "Audit log" }),
    ).not.toBeInTheDocument();
    await expect(
      navigation.getByRole("link", { name: "API keys" }),
    ).toBeVisible();
  },
};
