import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getReleaseDemo } from "@/lib/release-demo";
import { RegionFeatureLinks } from "./region-feature-links";
import { getDemoBoard } from "@/lib/demo-data";
import type { Region } from "@/lib/types";
import type { RegionPatch } from "@/lib/region-update";
import { ScreenAnnotatorView } from "./screen-annotator";

type UpdateRegion = (id: string, patch: RegionPatch) => Promise<Region>;

const screen = getDemoBoard().screens[0]!;
const region = screen.regions[0]!;
const meta = {
  component: ScreenAnnotatorView,
  tags: ["ai-generated"],
  args: {
    screen,
    now: region.updatedAt,
    authors: {},
    focusRegionId: region.id,
    onScreenUpdated: fn(),
    onError: fn(),
    createRegion: fn(async (patch: RegionPatch) => ({
      ...region,
      ...patch,
      id: "new-region",
    })),
    updateRegion: fn<UpdateRegion>(async (_id: string, patch: RegionPatch) => ({
      ...region,
      ...patch,
    })),
    deleteRegion: fn(async () => {}),
  },
} satisfies Meta<typeof ScreenAnnotatorView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DeleteUnderRegionOptions: Story = {
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole("button", { name: "Delete region" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Region options" }),
    );
    await userEvent.click(
      within(document.body).getByRole("menuitem", { name: "Delete region" }),
    );
    await waitFor(() =>
      expect(args.deleteRegion).toHaveBeenCalledWith(region.id),
    );
    await expect(args.updateRegion).not.toHaveBeenCalled();
  },
};

export const TextSaveBeforeStateChange: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const label = await canvas.findByRole("textbox", { name: "Label" });
    await userEvent.clear(label);
    await userEvent.type(label, "Verified label");
    await userEvent.click(canvas.getByRole("button", { name: "MISSING" }));
    await waitFor(() => expect(args.updateRegion).toHaveBeenCalledTimes(2));
    await expect(args.updateRegion).toHaveBeenNthCalledWith(1, region.id, {
      label: "Verified label",
    });
    await expect(args.updateRegion).toHaveBeenNthCalledWith(2, region.id, {
      state: "missing",
    });
    await waitFor(() =>
      expect(args.onScreenUpdated).toHaveBeenLastCalledWith(
        expect.objectContaining({
          regions: expect.arrayContaining([
            expect.objectContaining({
              id: region.id,
              state: "missing",
              label: "Verified label",
            }),
          ]),
        }),
      ),
    );
    await expect(label).toHaveValue("Verified label");
  },
};

export const FailedStateChange: Story = {
  args: {
    updateRegion: fn<UpdateRegion>(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByRole("button", {
      name: "MISSING",
    });
    await userEvent.click(button);
    await waitFor(() =>
      expect(args.onError).toHaveBeenCalledWith("Connection lost. Try again."),
    );
    await expect(
      canvas.getByRole("button", { name: "SHIPPED" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(args.onScreenUpdated).not.toHaveBeenCalled();
  },
};

export const FailedTextSaveKeepsDraft: Story = {
  args: {
    updateRegion: fn<UpdateRegion>(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const label = await canvas.findByRole("textbox", { name: "Label" });
    await userEvent.clear(label);
    await userEvent.type(label, "Unsaved label");
    await userEvent.tab();
    await waitFor(() =>
      expect(args.onError).toHaveBeenCalledWith("Connection lost. Try again."),
    );
    await expect(label).toHaveValue("Unsaved label");
    await expect(args.onScreenUpdated).not.toHaveBeenCalled();
  },
};

export const StateWaitsForPendingText: Story = {
  args: { updateRegion: fn<UpdateRegion>(() => new Promise<Region>(() => {})) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const label = await canvas.findByRole("textbox", { name: "Label" });
    await userEvent.clear(label);
    await userEvent.type(label, "Pending label");
    await userEvent.click(canvas.getByRole("button", { name: "MISSING" }));
    await expect(args.updateRegion).toHaveBeenCalledOnce();
    await expect(args.updateRegion).toHaveBeenCalledWith(region.id, {
      label: "Pending label",
    });
    await expect(
      canvas.getByRole("button", { name: "SHIPPED" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

export const RepeatedFailedMovesRestoreSavedPosition: Story = {
  args: {
    updateRegion: fn<UpdateRegion>(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const first = Promise.withResolvers<Region>();
    args.updateRegion.mockImplementationOnce(() => first.promise);
    await canvas.findByRole("button", { name: "SHIPPED" });
    canvas.getByRole("group", { name: "Screen annotations" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(args.updateRegion).toHaveBeenCalledOnce());
    await userEvent.keyboard("{ArrowRight}");
    first.reject(new Error("Connection lost. Try again."));
    await waitFor(() => expect(args.updateRegion).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(args.onError).toHaveBeenCalledTimes(2));
    await expect(args.onScreenUpdated).toHaveBeenLastCalledWith(
      expect.objectContaining({
        regions: expect.arrayContaining([
          expect.objectContaining({ id: region.id, x: region.x, y: region.y }),
        ]),
      }),
    );
  },
};

export const GermanStateLabelsPreserveValues: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas, args }) => {
    await expect(
      await canvas.findByRole("textbox", { name: "Beschriftung" }),
    ).toHaveValue(region.label ?? "");
    await userEvent.click(canvas.getByRole("button", { name: "FEHLT" }));
    await waitFor(() =>
      expect(args.updateRegion).toHaveBeenCalledWith(region.id, {
        state: "missing",
      }),
    );
    await expect(canvas.getByRole("button", { name: "FEHLT" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const InspectorWaitsUntilDrawingEnds: Story = {
  render: (args) => (
    <div style={{ display: "flex", height: 600, width: "100%" }}>
      <ScreenAnnotatorView {...args} />
    </div>
  ),
  args: { focusRegionId: undefined },
  play: async ({ canvas }) => {
    const pointer = userEvent.setup();
    const image = canvas.getByRole("img", { name: screen.label! });
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
      canvas.getByRole("complementary", { hidden: true }),
    ).toHaveAttribute("aria-hidden", "true");
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

export const MovingRegionKeepsDraftInspectorWidth: Story = {
  render: InspectorWaitsUntilDrawingEnds.render,
  args: { focusRegionId: undefined },
  play: async ({ canvas }) => {
    const pointer = userEvent.setup();
    const image = canvas.getByRole("img", { name: screen.label! });
    const surface = image.parentElement!;
    const initial = image.getBoundingClientRect();
    await pointer.pointer([
      {
        target: surface,
        keys: "[MouseLeft>]",
        coords: { clientX: initial.x + 30, clientY: initial.y + 30 },
      },
      {
        target: surface,
        coords: { clientX: initial.x + 90, clientY: initial.y + 90 },
      },
      { target: surface, keys: "[/MouseLeft]" },
    ]);
    await expect(
      canvas.getByRole("button", { name: "Add region" }),
    ).toBeVisible();
    const inspector = canvas.getByRole("complementary", { name: "Inspector" });
    await waitFor(() =>
      expect(inspector.getBoundingClientRect().width).toBe(312),
    );
    const before = image.getBoundingClientRect();
    const label = canvas.getByText(region.label!);
    const box = label.getBoundingClientRect();
    await pointer.pointer({
      target: label,
      keys: "[MouseLeft>]",
      coords: { clientX: box.x + 5, clientY: box.y + 5 },
    });
    await expect(inspector).toHaveAttribute("aria-hidden", "false");
    await expect(image.getBoundingClientRect().width).toBe(before.width);
    await pointer.pointer({ target: label, keys: "[/MouseLeft]" });
    await expect(canvas.getByRole("textbox", { name: "Label" })).toHaveValue(
      region.label,
    );
  },
};

export const FeaturePickerDoesNotChangeRegion: Story = {
  args: {
    renderRegionDetails: (selected) => (
      <RegionFeatureLinks
        regionId={selected.id}
        capabilities={getReleaseDemo().product.capabilities}
        links={[]}
        readOnly={false}
        onChange={async () => {}}
      />
    ),
  },
  play: async ({ canvas, args }) => {
    const picker = await canvas.findByRole("combobox", {
      name: "Link a feature",
    });
    picker.focus();
    await userEvent.keyboard("{ArrowDown}");
    await within(document.body).findByRole("listbox");
    await userEvent.keyboard(
      "{ArrowDown}{ArrowUp}123{Delete}{Backspace}{Escape}",
    );
    await waitFor(() => expect(picker).toHaveFocus());
    await userEvent.keyboard("123{Delete}{Backspace}");
    // Changing selection flushes any incorrectly queued keyboard nudge.
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.updateRegion).not.toHaveBeenCalled();
    await expect(args.deleteRegion).not.toHaveBeenCalled();
  },
};

export const LongNotesStayScrollable: Story = {
  args: {
    screen: {
      ...screen,
      regions: screen.regions.map((item) =>
        item.id === region.id
          ? {
              ...item,
              notes:
                "Published screenshot. Source and observation context are recorded here. ".repeat(
                  30,
                ),
            }
          : item,
      ),
    },
  },
  play: async ({ canvas }) => {
    const notes = await canvas.findByRole("textbox", { name: "Notes" });
    await expect(notes.scrollHeight).toBeGreaterThan(notes.clientHeight);
    await expect(notes.clientHeight).toBeLessThan(180);
  },
};
