import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
    const stateButton = await canvas.findByRole("button", { name: "SHIPPED" });
    stateButton.focus();
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
