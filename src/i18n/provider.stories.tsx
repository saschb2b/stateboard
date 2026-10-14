import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  MutationForm,
  type FormValues,
} from "@/components/release/mutation-form";
import { AppLocaleProvider } from "./provider";
import { LanguageSwitcher } from "./language-switcher";

function LocalizedForm({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const t = useTranslations("Release");
  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <LanguageSwitcher />
      <MutationForm
        fields={[
          { name: "summary", label: t("evidence.observation"), required: true },
        ]}
        submitLabel={t("evidence.append")}
        onSubmit={onSubmit}
      />
      <Stack>
        {[0, 1, 2].map((count) => (
          <Typography key={count}>{t("filters.count", { count })}</Typography>
        ))}
      </Stack>
    </Stack>
  );
}

function LocaleFormPreview({
  onSubmit,
}: {
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  return (
    <AppLocaleProvider initialLocale="en" persist={false}>
      <LocalizedForm onSubmit={onSubmit} />
    </AppLocaleProvider>
  );
}

const meta = {
  component: LocaleFormPreview,
  tags: ["ai-generated"],
  args: { onSubmit: fn(async () => {}) },
} satisfies Meta<typeof LocaleFormPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PreserveDraftAndKeyboardSelection: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const draft = "Release-Audit für Kandidat 42";
    await userEvent.type(canvas.getByLabelText(/^Observation/), draft);
    await expect(canvas.getByText("0 checks")).toBeVisible();
    await expect(canvas.getByText("1 check")).toBeVisible();
    await expect(canvas.getByText("2 checks")).toBeVisible();
    const languageButton = canvas.getByRole("button", {
      name: "Language / Sprache",
    });
    languageButton.focus();
    await userEvent.keyboard("{Enter}");
    await expect(languageButton).toHaveAttribute("aria-expanded", "true");
    const english = page.getByRole("menuitemradio", { name: "English" });
    const german = page.getByRole("menuitemradio", { name: "Deutsch" });
    await expect(english).toHaveAttribute("aria-checked", "true");
    await expect(german).toHaveAttribute("aria-checked", "false");
    english.focus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(canvas.getByLabelText(/^Beobachtung/)).toHaveValue(draft);
    await expect(canvas.getByText("0 Prüfungen")).toBeVisible();
    await expect(canvas.getByText("1 Prüfung")).toBeVisible();
    await expect(canvas.getByText("2 Prüfungen")).toBeVisible();
    await waitFor(() =>
      expect(canvasElement.ownerDocument.documentElement).toHaveAttribute(
        "lang",
        "de",
      ),
    );
    const germanButton = canvas.getByRole("button", {
      name: "Sprache / Language",
    });
    await expect(germanButton).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(germanButton);
    await expect(
      page.getByRole("menuitemradio", { name: "Deutsch" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: "English" }),
    ).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard("{Escape}");
    await expect(germanButton).toHaveFocus();
    await userEvent.click(
      canvas.getByRole("button", { name: "Ergebnis speichern" }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({ summary: draft });
    await userEvent.click(germanButton);
    await userEvent.click(page.getByRole("menuitemradio", { name: "English" }));
    await expect(canvas.getByLabelText(/^Observation/)).toHaveValue(draft);
    await expect(
      canvas.getByRole("button", { name: "Save result" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(canvasElement.ownerDocument.documentElement).toHaveAttribute(
        "lang",
        "en",
      ),
    );
  },
};
