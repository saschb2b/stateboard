import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ApiKeysSettings } from "./api-keys-settings";
import type { ApiKey, WorkspaceApiKey, WorkspaceRole } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

// Fixed clock (2026-08-01T00:00:00Z) so expiry labels are deterministic.
const NOW = 1_785_542_400_000;
const DAY = 86_400_000;

const viewer = (role: WorkspaceRole): CurrentMember => ({
  user: {
    id: "user-alice",
    email: "alice@example.com",
    name: "Alice",
    image: null,
  },
  workspaceId: "default",
  role,
});

const key = (
  id: string,
  name: string,
  overrides: Partial<ApiKey> = {},
): ApiKey => ({
  id,
  workspaceId: "default",
  userId: "user-alice",
  name,
  keyPrefix: `sbk_${id.padEnd(8, "0")}`,
  role: "editor",
  createdAt: NOW - 30 * DAY,
  expiresAt: NOW + 60 * DAY,
  lastUsedAt: NOW - 2 * DAY,
  revokedAt: null,
  ...overrides,
});

const KEYS: ApiKey[] = [
  key("relbot01", "release-bot"),
  key("cldcode1", "claude-code", {
    role: "viewer",
    expiresAt: NOW + 5 * DAY, // inside the 14-day warning window
    lastUsedAt: NOW - 3_600_000,
  }),
  key("cicheck1", "ci-status-check", {
    expiresAt: NOW - 1 * DAY, // expired yesterday
  }),
  key("oldbot01", "old-bot", {
    revokedAt: NOW - 10 * DAY,
    lastUsedAt: null,
  }),
  key("forever1", "dashboard-kiosk", {
    expiresAt: null, // explicit no-expiration
  }),
];

const WORKSPACE_KEYS: WorkspaceApiKey[] = [
  ...KEYS.map((k) => ({
    ...k,
    userName: "Alice",
    userEmail: "alice@example.com",
  })),
  {
    ...key("bobkey01", "bobs-agent", { userId: "user-bob" }),
    userName: "Bob",
    userEmail: "bob@example.com",
  },
];

/**
 * Self-service API keys with the full expiry vocabulary on display:
 * active, expiring-soon (amber), expired (dimmed), revoked, and
 * no-expiration. Mutations hit the real API, so stories are render-only.
 */
const meta = {
  component: ApiKeysSettings,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: { now: NOW },
} satisfies Meta<typeof ApiKeysSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An editor sees only their own keys. */
export const MemberView: Story = {
  args: {
    viewer: viewer("editor"),
    initialKeys: KEYS,
    initialWorkspaceKeys: null,
  },
};

/** Owners additionally get the whole-workspace inventory, owners named. */
export const OwnerView: Story = {
  args: {
    viewer: viewer("owner"),
    initialKeys: KEYS,
    initialWorkspaceKeys: WORKSPACE_KEYS,
  },
};

export const Empty: Story = {
  args: {
    viewer: viewer("viewer"),
    initialKeys: [],
    initialWorkspaceKeys: null,
  },
};
