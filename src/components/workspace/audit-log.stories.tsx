import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AuditLog } from "./audit-log";

const meta = {
  component: AuditLog,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    viewer: {
      user: {
        id: "alice",
        name: "Alice",
        email: "alice@example.test",
        image: null,
      },
      role: "owner",
      workspaceId: "test-workspace",
    },
    actors: [{ id: "alice", name: "Alice", email: "alice@example.test" }],
    initialEntries: [
      {
        id: 1,
        actorId: "alice",
        actorName: "Alice",
        action: "release.evidence",
        targetType: "release_evidence",
        targetId: "evidence-123",
        meta: { result: "pass", candidateRef: "candidate-v1" },
        at: 1_785_542_400_000,
      },
    ],
    initialCursor: null,
    pageSize: 50,
    listEndpoint: "/api/workspace/audit",
    exportEndpoint: "/api/workspace/audit/export",
  },
} satisfies Meta<typeof AuditLog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GermanEventLabels: Story = {
  parameters: { locale: "de" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Änderungsprotokoll", level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("cell", { name: "Nachweis erfasst" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("cell", { name: "Nachweis evidence-123" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "CSV exportieren" }),
    ).toHaveAttribute("href", "/api/workspace/audit/export?");
    await userEvent.click(canvas.getByRole("combobox", { name: "Aktion" }));
    await expect(
      within(document.body).getByRole("option", { name: "Nachweis erfasst" }),
    ).toHaveAttribute("data-value", "release.evidence");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(canvas.getByRole("combobox", { name: "Ressource" }));
    await expect(
      within(document.body).getByRole("option", {
        name: "Nachweis",
      }),
    ).toHaveAttribute("data-value", "release_evidence");
    await userEvent.keyboard("{Escape}");
  },
};

export const GermanProductHistory: Story = {
  parameters: { locale: "de" },
  args: { boardName: "StateBoard · RC 1", backHref: "/boards/test-board" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", {
        name: "StateBoard · RC 1 · Verlauf",
        level: 1,
      }),
    ).toBeVisible();
    await expect(canvas.getByRole("cell", { name: "Alice" })).toBeVisible();
    await expect(canvas.getByText(/candidateRef=candidate-v1/)).toBeVisible();
  },
};
