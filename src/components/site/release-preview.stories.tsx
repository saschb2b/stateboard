import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ReleasePreview } from "./release-preview";

const meta = {
  component: ReleasePreview,
  tags: ["ai-generated"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof ReleasePreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ExplorePerspectives: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overview = canvas.getByRole("tab", { name: "Overview" });
    await userEvent.click(overview);
    await userEvent.keyboard("{ArrowRight}{Enter}");
    const architecture = canvas.getByRole("tab", { name: "Architecture" });
    await expect(architecture).toHaveFocus();
    await expect(architecture).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByRole("tabpanel")).toHaveAccessibleName(
      "Architecture",
    );
    await expect(canvas.getByText("PostgreSQL", { exact: true })).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: /Explore architecture/ }),
    ).toHaveAttribute("href", "/share/demo/releases?view=backend");
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await expect(canvas.getByRole("tabpanel")).toHaveAccessibleName("Checks");
    await expect(
      canvas.getByText("No observation submitted · Operations"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Needs evidence" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Illustrative assessment · no live data"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: /Explore checks/ }),
    ).toHaveAttribute("href", "/share/demo/releases?view=qa");
  },
};

export const GermanPreview: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Nachweise fehlen" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Architektur" }));
    await expect(canvas.getByRole("tabpanel")).toHaveAccessibleName(
      "Architektur",
    );
    await expect(
      canvas.getByRole("link", { name: "Architektur im Beispiel öffnen" }),
    ).toHaveAttribute("href", "/share/demo/releases?view=backend");
    await expect(canvas.getByText("PostgreSQL", { exact: true })).toBeVisible();
  },
};
