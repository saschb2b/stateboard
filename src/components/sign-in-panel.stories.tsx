import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SignInPanel } from "./sign-in-panel";

/**
 * The whole sign-in surface: one Keycloak button, no provider picker,
 * and the "see the example board" escape hatch for account-less visitors.
 * The button triggers a real OIDC redirect, so stories are render-only.
 */
const meta = {
  component: SignInPanel,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SignInPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { callback: "/boards" },
};
