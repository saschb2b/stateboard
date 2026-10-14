import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { getDemoBoard } from "@/lib/demo-data";
import { BoardEditor } from "./board-editor";

const example = getDemoBoard();
const meta = {
  component: BoardEditor,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    board: example.board,
    initialScreens: example.screens,
    initialShareLinks: [],
    authors: {},
    now: example.board.updatedAt,
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
} satisfies Meta<typeof BoardEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Screens: Story = {};
export const BoardNavigation: Story = {
  play: async ({ canvas, args }) => {
    const location = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    await expect(
      location.getByRole("link", { name: "Boards" }),
    ).toHaveAttribute("href", "/boards");
    await expect(
      location.getByRole("link", { name: args.board.name }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/releases`);
    await expect(
      location.getByRole("link", { name: "Screens" }),
    ).toHaveAttribute(
      "href",
      `/boards/${args.board.id}/releases?section=screens`,
    );
    await expect(
      canvas.queryByRole("button", { name: `Rename ${args.board.name}` }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "More board options" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.getByRole("menuitem", { name: "Edit board" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
    await expect(
      menu.getByRole("menuitem", { name: "Board history" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/history`);
    await userEvent.keyboard("{Escape}");
    await expect(
      canvas.getByRole("button", { name: "More board options" }),
    ).toHaveFocus();
  },
};
export const KeyboardScreenSelection: Story = {
  play: async ({ canvas }) => {
    const screen = example.screens[1]!;
    const thumbnail = canvas.getByRole("button", {
      name: `Open screen: ${screen.label}`,
    });
    thumbnail.focus();
    await userEvent.keyboard("{Enter}");
    await expect(thumbnail).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("heading", { level: 1, name: screen.label! }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("img", { name: screen.label! }),
    ).toBeVisible();
  },
};
export const EmptyBoard: Story = {
  args: { initialScreens: [] },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole("heading", { name: "No screens yet" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Edit board" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
  },
};
export const EmptyBoardRetainsReleaseReview: Story = {
  args: {
    initialScreens: [],
    initialContext: {
      review: {
        label: "Installed app",
        href: `/boards/${example.board.id}/releases/current?view=visual&capability=files`,
      },
    },
  },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByRole("heading", { name: "No screens yet" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Back to release review" }),
    ).toHaveAttribute("href", args.initialContext!.review!.href);
  },
};
export const ViewerNavigation: Story = {
  args: { viewer: { ...meta.args.viewer, role: "viewer" } },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "More board options" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.queryByRole("menuitem", { name: "Edit board" }),
    ).not.toBeInTheDocument();
    await expect(
      menu.queryByRole("menuitem", { name: "Copy share link" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        menu.getByRole("menuitem", { name: "Release readiness" }),
      ).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
  },
};
export const GermanNavigation: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Weitere Board-Optionen" }),
    );
    const menu = within(within(document.body).getByRole("menu"));
    await expect(
      menu.getByRole("menuitem", { name: "Board bearbeiten" }),
    ).toHaveAttribute("href", `/boards/${args.board.id}/settings`);
    await userEvent.keyboard("{Escape}");
  },
};

export const ReturnToSelectedReview: Story = {
  args: {
    initialContext: {
      screenId: example.screens[1]?.id,
      review: {
        label: "Installed app",
        href: `/boards/${example.board.id}/releases/current?view=visual&capability=files`,
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Back to release review" }),
    ).toHaveAttribute(
      "href",
      `/boards/${example.board.id}/releases/current?view=visual&capability=files`,
    );
    await expect(
      canvas.getByRole("img", { name: example.screens[1]!.label! }),
    ).toBeVisible();
  },
};
export const CancelScreenUpload: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add screen" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("button", { name: "Add screen" }),
    ).toHaveFocus();
  },
};
export const DrawingKeepsCanvasPosition: Story = {
  args: { initialScreens: [{ ...example.screens[0]!, regions: [] }] },
  play: async ({ canvas }) => {
    const pointer = userEvent.setup();
    const image = canvas.getByRole("img", { name: example.screens[0]!.label! });
    const surface = image.parentElement!;
    const before = image.getBoundingClientRect();
    await pointer.pointer([
      {
        target: surface,
        keys: "[MouseLeft>]",
        coords: { clientX: before.x + 30, clientY: before.y + 30 },
      },
      {
        target: surface,
        coords: { clientX: before.x + 90, clientY: before.y + 90 },
      },
    ]);
    await expect(
      canvas.getByRole("button", { name: "Collapse screens" }),
    ).toBeVisible();
    const during = image.getBoundingClientRect();
    await expect(during.x).toBe(before.x);
    await expect(during.width).toBe(before.width);
    await pointer.pointer({ keys: "[/MouseLeft]", target: surface });
    await expect(
      canvas.getByRole("button", { name: "Add region" }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Discard draft" }),
    );
  },
};

export const FeaturePickerOwnsPresentationShortcut: Story = {
  args: {
    initialCapabilities: getReleaseDemo().product.capabilities,
    initialContext: {
      screenId: example.screens[0]!.id,
      regionId: example.screens[0]!.regions[0]!.id,
    },
  },
  play: async ({ canvas }) => {
    const picker = await canvas.findByRole("combobox", {
      name: "Link a feature",
    });
    picker.focus();
    await userEvent.keyboard("p");
    await expect(
      canvas.queryByRole("dialog", { name: "Presentation mode" }),
    ).not.toBeInTheDocument();
    await expect(picker).toBeVisible();
    await expect(picker).toHaveFocus();
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
const mobileScreen = {
  ...example.screens[0]!,
  regions: example.screens[0]!.regions.map((item) => ({
    ...item,
    notes:
      "Published screenshot. Source and observation context are recorded here. ".repeat(
        30,
      ),
  })),
};

export const MobileRegionKeepsImageAboveInspector: Story = {
  args: {
    initialScreens: [mobileScreen],
    initialContext: {
      screenId: mobileScreen.id,
      regionId: mobileScreen.regions[0]!.id,
    },
    initialCapabilities: getReleaseDemo().product.capabilities,
  },
  parameters: { viewport: phoneViewport },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Notes" });
    const image = canvas
      .getByRole("img", { name: mobileScreen.label! })
      .getBoundingClientRect();
    const inspector = canvas
      .getByRole("complementary", { name: "Inspector" })
      .getBoundingClientRect();
    await expect(window.innerWidth).toBe(390);
    await expect(image.height).toBeGreaterThan(100);
    await expect(image.top).toBeGreaterThanOrEqual(
      canvas.getByRole("banner").getBoundingClientRect().bottom,
    );
    await expect(image.bottom).toBeLessThanOrEqual(inspector.top);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};
export const GermanMobileRegionKeepsImageAboveInspector: Story = {
  args: MobileRegionKeepsImageAboveInspector.args,
  parameters: { locale: "de", viewport: phoneViewport },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox", { name: "Notizen" });
    const image = canvas
      .getByRole("img", { name: mobileScreen.label! })
      .getBoundingClientRect();
    const inspector = canvas
      .getByRole("complementary", { name: "Bereichsdetails" })
      .getBoundingClientRect();
    await expect(window.innerWidth).toBe(390);
    await expect(image.height).toBeGreaterThan(100);
    await expect(image.top).toBeGreaterThanOrEqual(
      canvas.getByRole("banner").getBoundingClientRect().bottom,
    );
    await expect(image.bottom).toBeLessThanOrEqual(inspector.top);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};
