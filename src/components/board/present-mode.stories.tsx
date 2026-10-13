import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { PresentMode } from "./present-mode";
import { getDemoBoard } from "@/lib/demo-data";

const demo = getDemoBoard();
const firstLabel = demo.screens[0]?.regions[0]?.label ?? "";

/**
 * Present mode over the built-in example board (the same data served at
 * /share/demo). Fullscreen, keyboard-driven: ← / → to move, Esc to exit.
 */
const meta = {
  component: PresentMode,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    boardName: demo.board.name,
    screens: demo.screens,
    onClose: fn(),
  },
} satisfies Meta<typeof PresentMode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DemoBoard: Story = {
  // Proves the demo screens + region overlay actually composed: a real
  // region label from demo-data must be painted on the first screen.
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole("dialog", {
      name: "Presentation mode",
    });
    await waitFor(() =>
      expect(within(dialog).getByText(firstLabel)).toBeVisible(),
    );
  },
};

export const SecondScreen: Story = {
  args: { initialIndex: 1 },
};

export const KeyboardAndFocus: Story = {
  play: async ({ canvasElement, args }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = within(
      await page.findByRole("dialog", { name: "Presentation mode" }),
    );
    await expect(
      dialog.getByRole("button", { name: "Exit presentation" }),
    ).toHaveFocus();
    await expect(
      dialog.getByRole("button", { name: "Previous screen" }),
    ).toBeDisabled();
    dialog.getByRole("button", { name: "Next screen" }).focus();
    await userEvent.tab();
    await expect(
      dialog.getByRole("button", { name: "Enter fullscreen" }),
    ).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(dialog.getByText("2 / 2")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Next screen" }),
    ).toBeDisabled();
    await userEvent.keyboard("{Home}");
    await expect(dialog.getByText("1 / 2")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const FullscreenUnavailable: Story = {
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument;
    const page = within(document.body);
    const original = Object.getOwnPropertyDescriptor(
      document.documentElement,
      "requestFullscreen",
    );
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: async () => {
        throw new Error("Fullscreen denied");
      },
    });
    try {
      const dialog = within(
        await page.findByRole("dialog", { name: "Presentation mode" }),
      );
      await userEvent.click(
        dialog.getByRole("button", { name: "Enter fullscreen" }),
      );
      await expect(await dialog.findByRole("alert")).toHaveTextContent(
        "Fullscreen is unavailable. Continue presenting in this window.",
      );
      await expect(
        dialog.getByRole("button", { name: "Exit presentation" }),
      ).toBeEnabled();
    } finally {
      if (original)
        Object.defineProperty(
          document.documentElement,
          "requestFullscreen",
          original,
        );
      else
        Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    }
  },
};
