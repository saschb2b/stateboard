import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "@mui/material/Button";
import { expect, fn } from "storybook/test";
import { AppHeader } from "./app-header";

/** The universal top bar: wordmark, optional crumb, right-side actions. */
const meta = {
  component: AppHeader,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCrumb: Story = {
  args: { homeHref: "/boards", crumb: "Acme Dashboard / Q3 2026" },
};

export const WithActions: Story = {
  args: {
    homeHref: "/boards",
    crumb: "Acme Dashboard / Q3 2026",
    actions: (
      <>
        <Button variant="outlined" size="small">
          Share
        </Button>
        <Button variant="contained" size="small">
          Present
        </Button>
      </>
    ),
  },
};

export const EditableCrumb: Story = {
  args: {
    homeHref: "/boards",
    crumb: "Acme Dashboard / Q3 2026",
    onCrumbChange: fn(),
  },
  // Clicking the crumb swaps it for an input; Enter commits the new name.
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByTitle("Click to rename"));
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed board{Enter}");
    await expect(args.onCrumbChange).toHaveBeenCalledWith("Renamed board");
  },
};
