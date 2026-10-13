import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "@mui/material/Button";
import { expect, fn, within } from "storybook/test";
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
    await userEvent.click(
      canvas.getByRole("button", { name: `Rename ${args.crumb}` }),
    );
    const input = canvas.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Renamed board{Enter}");
    await expect(args.onCrumbChange).toHaveBeenCalledWith("Renamed board");
  },
};

export const KeyboardRename: Story = {
  args: {
    homeHref: "/boards",
    crumb: "StateBoard release review",
    onCrumbChange: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.tab();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Rename StateBoard release review" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const input = canvas.getByRole("textbox");
    await expect(input).toHaveFocus();
    await userEvent.clear(input);
    await userEvent.type(input, "Review candidate{Enter}");
    await expect(args.onCrumbChange).toHaveBeenCalledWith("Review candidate");
  },
};

const assessmentPath = [
  { label: "Boards", href: "/boards" },
  { label: "StateBoard", href: "/boards/stateboard/releases" },
  {
    label: "Assessments",
    href: "/boards/stateboard/releases?section=releases",
  },
  { label: "Release candidate 2026.10" },
];

export const AssessmentHierarchy: Story = {
  args: { homeHref: "/boards", breadcrumbs: assessmentPath },
  play: async ({ canvas }) => {
    const navigation = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    await expect(
      navigation.getByRole("link", { name: "Boards" }),
    ).toHaveAttribute("href", "/boards");
    await expect(
      navigation.getByRole("link", { name: "StateBoard" }),
    ).toHaveAttribute("href", "/boards/stateboard/releases");
    await expect(
      navigation.getByRole("link", { name: "Assessments" }),
    ).toHaveAttribute("href", "/boards/stateboard/releases?section=releases");
    await expect(
      navigation.getByText("Release candidate 2026.10"),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      navigation.queryByRole("link", { name: "Release candidate 2026.10" }),
    ).not.toBeInTheDocument();
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

export const MobileParentNavigation: Story = {
  args: AssessmentHierarchy.args,
  parameters: { viewport: phoneViewport },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    const navigation = within(
      canvas.getByRole("navigation", { name: "Page location" }),
    );
    const parent = navigation.getByRole("link", {
      name: "Back to Assessments",
    });
    await expect(parent).toHaveAttribute(
      "href",
      "/boards/stateboard/releases?section=releases",
    );
    await expect(
      navigation.queryByRole("link", { name: "Boards" }),
    ).not.toBeInTheDocument();
    parent.focus();
    await expect(parent).toHaveFocus();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};

export const GermanMobileParentNavigation: Story = {
  args: {
    homeHref: "/boards",
    breadcrumbs: [
      { label: "Boards", href: "/boards" },
      {
        label:
          "StateBoard – Produktzustand und Release-Bewertungen für das gesamte Entwicklungsteam",
        href: "/boards/stateboard/releases",
      },
      { label: "Board-Einstellungen" },
    ],
  },
  parameters: { locale: "de", viewport: phoneViewport },
  globals: { viewport: { value: "phone", isRotated: false } },
  play: async ({ canvas }) => {
    const navigation = within(
      canvas.getByRole("navigation", { name: "Seitenpfad" }),
    );
    const parent = navigation.getByRole("link", {
      name: /^Zurück zu StateBoard/,
    });
    await expect(parent).toHaveAttribute("href", "/boards/stateboard/releases");
    await expect(parent).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    );
  },
};
