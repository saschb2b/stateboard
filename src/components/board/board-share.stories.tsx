import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import Box from "@mui/material/Box";
import { getDemoBoard } from "@/lib/demo-data";
import { BoardShare } from "./board-share";

const demo = getDemoBoard();
const meta = {
  component: BoardShare,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: { board: demo.board, screens: demo.screens },
} satisfies Meta<typeof BoardShare>;
export default meta;
type Story = StoryObj<typeof meta>;

export const VisualReview: Story = {};
export const Empty: Story = { args: { screens: [] } };
export const NarrowReview: Story = {
  render: (args) => (
    <Box sx={{ width: 390, maxWidth: "100%" }}>
      <BoardShare {...args} />
    </Box>
  ),
};

export const ScreensAndPresentationFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const second = demo.screens[1];
    if (!second) throw new Error("The demo needs two screens for navigation.");
    await userEvent.click(
      canvas.getByRole("tab", { name: second.label ?? "Screen 2" }),
    );
    await expect(
      within(canvas.getByRole("tabpanel")).getByRole("img"),
    ).toHaveAttribute("src", second.mediaUrl);
    const present = canvas.getByRole("button", { name: "Present" });
    await userEvent.click(present);
    const dialog = await page.findByRole("dialog", {
      name: "Presentation mode",
    });
    await expect(
      within(dialog).getByRole("button", { name: "Exit presentation" }),
    ).toHaveFocus();
    await waitFor(() =>
      expect(within(dialog).getByText("2 / 2")).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Presentation mode" }),
      ).toBeNull(),
    );
    await expect(present).toHaveFocus();
  },
};

export const GermanVisualReview: Story = {
  parameters: { locale: "de" },
  args: {
    screens: demo.screens.map((screen) => ({ ...screen, label: null })),
    updatedAt: demo.board.updatedAt,
    now: demo.board.updatedAt + 3_600_000,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: demo.board.name, level: 1 }),
    ).toBeVisible();
    await expect(canvas.getByText("Aktualisiert vor 1 Stunde")).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Ansicht 1" })).toBeVisible();
    await expect(canvas.getAllByText("PRODUKTIV")[0]).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Präsentieren" }));
    const dialog = within(
      await within(document.body).findByRole("dialog", {
        name: "Präsentationsmodus",
      }),
    );
    await expect(
      dialog.getByRole("button", { name: "Präsentation beenden" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Escape}");
  },
};
