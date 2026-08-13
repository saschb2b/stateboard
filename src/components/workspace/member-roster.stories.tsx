import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MemberRoster } from "./member-roster";
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

/**
 * Owner-only roster. Role changes and removals call the real API, so
 * stories are render-only; the last-owner guard lives server-side.
 */
const meta = {
  component: MemberRoster,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: { viewer },
} satisfies Meta<typeof MemberRoster>;

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
