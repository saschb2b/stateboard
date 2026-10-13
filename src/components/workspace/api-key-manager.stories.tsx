import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ApiKeyManagerView } from "./api-key-manager";
import type { ApiKeyCreateInput } from "./api-key-create-form";
import type { ApiKey, WorkspaceApiKey, WorkspaceRole } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

// Fixed clock (2026-08-01T00:00:00Z) so expiry labels are deterministic.
type CreateKey = (
  input: ApiKeyCreateInput,
) => Promise<ApiKey & { key: string }>;

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
 * no-expiration. Stories use local callbacks for mutations.
 */
const meta = {
  component: ApiKeyManagerView,
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
  args: {
    now: NOW,
    createKey: fn<CreateKey>(async (input: ApiKeyCreateInput) => ({
      ...key("newkey01", input.name),
      key: "sbk_story_fixture_only",
    })),
    revokeKey: fn(async () => true),
  },
} satisfies Meta<typeof ApiKeyManagerView>;

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

/** Owners see other members' keys without repeating their own inventory. */
export const OwnerView: Story = {
  args: {
    viewer: viewer("owner"),
    initialKeys: KEYS,
    initialWorkspaceKeys: WORKSPACE_KEYS,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole("button", { name: "Revoke release-bot" }),
    ).toHaveLength(1);
    await expect(
      canvas.getByRole("button", { name: "Revoke bobs-agent" }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    viewer: viewer("viewer"),
    initialKeys: [],
    initialWorkspaceKeys: null,
  },
};

export const FailedCreationKeepsInput: Story = {
  args: {
    viewer: viewer("editor"),
    initialKeys: [],
    initialWorkspaceKeys: null,
    createKey: fn<CreateKey>(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Key name" }),
      "release-bot",
    );
    for (let attempt = 1; attempt <= 2; attempt++) {
      await userEvent.click(canvas.getByRole("button", { name: "Create key" }));
      await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
        "Connection lost. Try again.",
      );
      await expect(
        canvas.getByRole("textbox", { name: "Key name" }),
      ).toHaveValue("release-bot");
      await expect(args.createKey).toHaveBeenCalledTimes(attempt);
    }
  },
};

export const FailedRevocationKeepsKey: Story = {
  args: {
    viewer: viewer("editor"),
    initialKeys: [key("relbot01", "release-bot")],
    initialWorkspaceKeys: null,
    revokeKey: fn(async () => {
      throw new Error("Connection lost. Try again.");
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Revoke release-bot" }),
    );
    await expect(canvas.findByRole("alert")).resolves.toHaveTextContent(
      "Connection lost. Try again.",
    );
    await expect(
      canvas.getByRole("button", { name: "Revoke release-bot" }),
    ).toBeEnabled();
    await expect(canvas.queryByText("Revoked")).not.toBeInTheDocument();
    await expect(args.revokeKey).toHaveBeenCalledOnce();
  },
};

export const PendingCreation: Story = {
  args: {
    viewer: viewer("editor"),
    initialKeys: [],
    initialWorkspaceKeys: null,
    createKey: fn<CreateKey>(
      () => new Promise<ApiKey & { key: string }>(() => {}),
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Key name" }),
      "release-bot",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Create key" }));
    await expect(
      canvas.getByRole("button", { name: "Create key" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("textbox", { name: "Key name" }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole("combobox", { name: "Key role" }),
    ).toHaveAttribute("aria-disabled", "true");
    await expect(args.createKey).toHaveBeenCalledOnce();
  },
};

export const NewSecretSurvivesEarlierRevocation: Story = {
  args: {
    viewer: viewer("editor"),
    initialKeys: [],
    initialWorkspaceKeys: null,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const revocation = Promise.withResolvers<boolean>();
    args.revokeKey.mockImplementationOnce(() => revocation.promise);
    args.createKey
      .mockResolvedValueOnce({
        ...key("firstkey", "first-bot"),
        key: "sbk_first_fixture_only",
      })
      .mockResolvedValueOnce({
        ...key("secondkey", "second-bot"),
        key: "sbk_second_fixture_only",
      });
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Key name" }),
      "first-bot",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Create key" }));
    await expect(
      canvas.findByText("sbk_first_fixture_only"),
    ).resolves.toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Revoke first-bot" }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Key name" }),
      "second-bot",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Create key" }));
    await expect(
      canvas.findByText("sbk_second_fixture_only"),
    ).resolves.toBeVisible();
    revocation.resolve(true);
    await waitFor(() => expect(canvas.getByText("Revoked")).toBeVisible());
    await expect(canvas.getByText("sbk_second_fixture_only")).toBeVisible();
  },
};
