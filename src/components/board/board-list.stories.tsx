import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getReleaseDemo } from "@/lib/release-demo";
import { expect, fn, userEvent, within } from "storybook/test";
import { BoardListView } from "./board-list";

const example = getReleaseDemo();
/** Product overview with local callbacks for creation and duplication. */
const meta = {
  component: BoardListView,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    onCreate: fn(async () => example.product.board),
    onDuplicate: fn(async () => example.product.board),
    onOpen: fn(),
    initialItems: [
      {
        board: example.product.board,
        screens: example.product.screens,
        shareToken: null,
        totals: { shipped: 6, mock: 3, missing: 3 },
        updatedLabel: "Today",
        releaseOverview: {
          assessment: example.detail.assessment,
          state: example.readiness.state,
          blockerCount: example.readiness.blockers.length,
          gapCount: example.readiness.gaps.length,
          evaluatedAt: example.readiness.evaluatedAt,
          validUntil: example.readiness.validUntil,
          decision: null,
          decisionRevision: null,
          decisionAt: null,
        },
      },
    ],
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
} satisfies Meta<typeof BoardListView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProductOverview: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Latest candidate/)).toBeVisible();
    await expect(canvas.getByText(/evidence gaps/)).toBeVisible();
    await expect(canvas.getByText(/No recorded decision/)).toBeVisible();
  },
};
export const FirstProduct: Story = { args: { initialItems: [] } };

export const CreateFailureKeepsDraft: Story = {
  args: {
    onCreate: fn(async () => {
      throw new Error("Connection interrupted. Try again.");
    }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "New board" }));
    const dialog = within(document.body).getByRole("dialog");
    const form = within(dialog);
    await userEvent.type(
      form.getByRole("textbox", { name: "Product name" }),
      "StateBoard",
    );
    await userEvent.click(form.getByRole("button", { name: "Create board" }));
    await expect(form.getByRole("alert")).toHaveTextContent(
      "Connection interrupted",
    );
    await expect(
      form.getByRole("textbox", { name: "Product name" }),
    ).toHaveValue("StateBoard");
    await expect(args.onOpen).not.toHaveBeenCalled();
    await userEvent.click(form.getByRole("button", { name: "Cancel" }));
  },
};
export const DuplicateFailure: Story = {
  args: {
    onDuplicate: fn(async () => {
      throw new Error("Unable to duplicate this board.");
    }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", {
        name: `Copy screens from ${example.product.board.name}`,
      }),
    );
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Unable to duplicate",
    );
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
};
export const Viewer: Story = {
  args: { viewer: { ...meta.args.viewer, role: "viewer" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("button", { name: "New board" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: /^Edit / }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "Open board" }),
    ).toHaveAttribute("href", `/boards/${example.product.board.id}/releases`);
  },
};

export const EditorCanFindBoardSettings: Story = {
  args: { viewer: { ...meta.args.viewer, role: "editor" } },
  play: async ({ canvas }) => {
    const edit = canvas.getByRole("link", {
      name: `Edit ${example.product.board.name}`,
    });
    await expect(edit).toHaveAttribute(
      "href",
      `/boards/${example.product.board.id}/settings`,
    );
    edit.focus();
    await expect(edit).toHaveFocus();
    await expect(
      canvas.getByRole("link", { name: "Open board" }),
    ).toHaveAttribute("href", `/boards/${example.product.board.id}/releases`);
  },
};
