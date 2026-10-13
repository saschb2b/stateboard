import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import type { Board } from "@/lib/types";
import { BoardSettings } from "./board-settings";

const example = getReleaseDemo();
const failFirstSave = fn(
  async (details: Pick<Board, "name" | "description">): Promise<Board> => {
    if (failFirstSave.mock.calls.length === 1) {
      throw new Error("Couldn't save changes.");
    }
    return { ...example.product.board, ...details };
  },
);
const meta = {
  component: BoardSettings,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    board: example.product.board,
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
    initialShareLinks: [],
    stats: { screens: 3, regions: 12, shareLinks: 0 },
    onSaveDetails: fn(async (details: Pick<Board, "name" | "description">) => ({
      ...example.product.board,
      ...details,
    })),
  },
} satisfies Meta<typeof BoardSettings>;
export default meta;
type Story = StoryObj<typeof meta>;

export const General: Story = {};
export const VisualSharing: Story = { args: { initialSection: "sharing" } };
export const EditDetails: Story = {
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole("textbox", { name: /Board name/ });
    const description = canvas.getByRole("textbox", { name: "Description" });
    await expect(
      canvas.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    await userEvent.clear(name);
    await userEvent.type(name, "  Billing service  ");
    await userEvent.clear(description);
    await userEvent.type(description, "  Payments, invoices, and refunds.  ");
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Unsaved changes",
    );
    await userEvent.click(name);
    await userEvent.keyboard("{Enter}");
    await expect(args.onSaveDetails).toHaveBeenCalledWith({
      name: "Billing service",
      description: "Payments, invoices, and refunds.",
    });
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Changes saved.",
    );
    await expect(
      canvas.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    await expect(name).toHaveValue("Billing service");
    await userEvent.clear(name);
    await userEvent.type(name, "A second draft");
    await userEvent.click(
      canvas.getByRole("button", { name: "Discard changes" }),
    );
    await expect(name).toHaveValue("Billing service");
    await expect(description).toHaveValue("Payments, invoices, and refunds.");
    await expect(
      canvas.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
  },
};

export const KeepDraftAcrossSections: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.clear(canvas.getByRole("textbox", { name: /Board name/ }));
    await userEvent.type(
      canvas.getByRole("textbox", { name: /Board name/ }),
      "Draft board name",
    );
    await userEvent.clear(canvas.getByRole("textbox", { name: "Description" }));
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Description" }),
      "Draft description",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Visual sharing" }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Link name (optional)" }),
      "Design review draft",
    );
    await userEvent.click(canvas.getByRole("button", { name: "General" }));
    await expect(
      canvas.getByRole("textbox", { name: /Board name/ }),
    ).toHaveValue("Draft board name");
    await expect(
      canvas.getByRole("textbox", { name: "Description" }),
    ).toHaveValue("Draft description");
    await userEvent.click(
      canvas.getByRole("button", { name: "Discard changes" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: /Board name/ }),
    ).toHaveValue(args.board.name);
    await expect(
      canvas.getByRole("textbox", { name: "Description" }),
    ).toHaveValue(args.board.description ?? "");
    await expect(args.onSaveDetails).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Visual sharing" }),
    );
    await expect(
      canvas.getByRole("textbox", { name: "Link name (optional)" }),
    ).toHaveValue("Design review draft");
  },
};

export const FailedSaveKeepsDraft: Story = {
  args: {
    onSaveDetails: failFirstSave,
  },
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole("textbox", { name: /Board name/ });
    const description = canvas.getByRole("textbox", { name: "Description" });
    await userEvent.clear(name);
    await userEvent.type(name, "Retry this edit");
    await userEvent.clear(description);
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Couldn't save changes.",
    );
    await expect(name).toHaveValue("Retry this edit");
    await expect(description).toHaveValue("");
    await expect(
      canvas.getByRole("button", { name: "Save changes" }),
    ).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
    await expect(args.onSaveDetails).toHaveBeenLastCalledWith({
      name: "Retry this edit",
      description: null,
    });
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Changes saved.",
    );
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const RequiredName: Story = {
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole("textbox", { name: /Board name/ });
    await userEvent.clear(name);
    await userEvent.type(name, "   ");
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
    await expect(name).toBeInvalid();
    await expect(name).toHaveFocus();
    await expect(name).toHaveAccessibleDescription(
      "Board name can't be empty.",
    );
    await expect(args.onSaveDetails).not.toHaveBeenCalled();
    await userEvent.type(name, "Corrected name");
    await expect(name).not.toBeInvalid();
  },
};

export const GermanEditDetails: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas, args }) => {
    const name = canvas.getByRole("textbox", { name: /Board-Name/ });
    await userEvent.clear(name);
    await userEvent.type(name, "Zahlungsdienst");
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Ungespeicherte Änderungen",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Änderungen verwerfen" }),
    );
    await expect(name).toHaveValue(args.board.name);
    await userEvent.clear(name);
    await userEvent.type(name, "Zahlungsdienst");
    await userEvent.click(
      canvas.getByRole("button", { name: "Änderungen speichern" }),
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Änderungen gespeichert.",
    );
    await expect(
      canvas.getByRole("button", { name: "Änderungen speichern" }),
    ).toBeDisabled();
  },
};
export const DeleteConfirmation: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete this board" }),
    );
    const dialog = within(within(document.body).getByRole("dialog"));
    await expect(
      dialog.getByRole("button", { name: "Delete this board" }),
    ).toBeDisabled();
    await userEvent.type(
      dialog.getByRole("textbox", { name: "Board name to confirm" }),
      "wrong product",
    );
    await expect(
      dialog.getByRole("button", { name: "Delete this board" }),
    ).toBeDisabled();
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  },
};

export const GermanDeletionDetails: Story = {
  parameters: { locale: "de" },
  args: { stats: { screens: 1, regions: 2, shareLinks: 1 } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole("textbox", { name: /Board-Name/ }),
    ).toHaveValue(args.board.name);
    await expect(
      canvas.getByText(/1 Ansicht, 2 Bereiche und 1 Freigabelink/),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Dieses Board löschen" }),
    );
    const dialog = within(within(document.body).getByRole("dialog"));
    await expect(
      dialog.getByRole("button", { name: "Dieses Board löschen" }),
    ).toBeDisabled();
    await waitFor(() =>
      expect(
        dialog.getByRole("textbox", { name: "Board-Name zur Bestätigung" }),
      ).toBeVisible(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Abbrechen" }));
  },
};
