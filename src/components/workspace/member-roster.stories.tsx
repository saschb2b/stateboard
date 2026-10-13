import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { MemberRosterView } from "./member-roster";
import type { WorkspaceMember } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

const NOW = 1_785_542_400_000;
const DAY = 86_400_000;

const viewer: CurrentMember = {
  user: {
    id: "user-alice",
    email: "alice@example.com",
    name: "Alice",
    image: null,
  },
  workspaceId: "default",
  role: "owner",
};

const member = (
  id: string,
  name: string,
  role: WorkspaceMember["role"],
): WorkspaceMember => ({
  userId: id,
  role,
  createdAt: NOW - 90 * DAY,
  name,
  email: `${name.toLowerCase()}@example.com`,
  image: null,
});

const meta = {
  component: MemberRosterView,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    viewer,
    onChangeRole: fn(async () => {}),
    onRemove: fn(async () => true),
  },
} satisfies Meta<typeof MemberRosterView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Roster: Story = {
  args: {
    initialMembers: [
      member("user-alice", "Alice", "owner"),
      member("user-bob", "Bob", "editor"),
      member("user-carol", "Carol", "editor"),
      member("user-dave", "Dave", "viewer"),
    ],
  },
};

export const SoloOwner: Story = {
  args: { initialMembers: [member("user-alice", "Alice", "owner")] },
};

const EDITABLE_MEMBERS = [
  member("user-alice", "Alice", "owner"),
  member("user-bob", "Bob", "editor"),
];

export const FailedRoleChange: Story = {
  args: {
    initialMembers: EDITABLE_MEMBERS,
    onChangeRole: fn(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const role = canvas.getByRole("combobox", { name: "Role for Bob" });
    for (let attempt = 1; attempt <= 2; attempt++) {
      await userEvent.click(role);
      await userEvent.click(
        within(document.body).getByRole("option", { name: "viewer" }),
      );
      await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
        "Connection lost. Try again.",
      );
      await expect(role).toHaveTextContent("editor");
      await expect(args.onChangeRole).toHaveBeenCalledTimes(attempt);
    }
  },
};

export const PendingRoleChange: Story = {
  args: {
    initialMembers: EDITABLE_MEMBERS,
    onChangeRole: fn(() => new Promise<void>(() => {})),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Role for Bob" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: "viewer" }),
    );
    for (const role of canvas.getAllByRole("combobox")) {
      await expect(role).toHaveAttribute("aria-disabled", "true");
    }
    await expect(
      canvas.getByRole("combobox", { name: "Role for Bob" }),
    ).toHaveTextContent("editor");
    await expect(
      canvas.getByRole("button", { name: "Remove Alice" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("button", { name: "Remove Bob" }),
    ).toBeDisabled();
    await expect(args.onChangeRole).toHaveBeenCalledOnce();
  },
};

export const SavedRoleChange: Story = {
  args: { initialMembers: EDITABLE_MEMBERS },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Role for Bob" }),
    );
    await userEvent.click(
      within(document.body).getByRole("option", { name: "viewer" }),
    );
    await expect(
      canvas.getByRole("combobox", { name: "Role for Bob" }),
    ).toHaveTextContent("viewer");
    await expect(args.onChangeRole).toHaveBeenCalledWith(
      EDITABLE_MEMBERS[1],
      "viewer",
    );
  },
};

export const FailedRemoval: Story = {
  args: {
    initialMembers: EDITABLE_MEMBERS,
    onRemove: fn(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Remove Bob" }));
    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "Connection lost. Try again.",
    );
    await expect(
      canvas.getByRole("combobox", { name: "Role for Bob" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Remove Bob" }),
    ).toBeEnabled();
  },
};

export const GermanRoleChangePreservesApiValue: Story = {
  parameters: { locale: "de" },
  args: { initialMembers: EDITABLE_MEMBERS },
  play: async ({ canvas, args }) => {
    const role = canvas.getByRole("combobox", { name: "Rolle für Bob" });
    await expect(role).toHaveTextContent("Bearbeitung");
    await userEvent.click(role);
    await userEvent.click(
      within(document.body).getByRole("option", { name: "Lesen" }),
    );
    await expect(args.onChangeRole).toHaveBeenCalledWith(
      EDITABLE_MEMBERS[1],
      "viewer",
    );
    await expect(role).toHaveTextContent("Lesen");
    await expect(
      canvas.getByRole("button", { name: "Bob entfernen" }),
    ).toBeVisible();
  },
};
