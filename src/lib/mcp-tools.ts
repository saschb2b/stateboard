import "server-only";
import {
  createBoard,
  createRegion,
  createShareLink,
  deleteRegion,
  getBoard,
  getBoardWithScreens,
  getRegion,
  getScreen,
  listBoardStateCounts,
  listBoards,
  listShareLinks,
  updateBoard,
  updateRegion,
  writeAudit,
} from "./db";
import { newId, newShareToken } from "./ids";
import { MCP_TOOLS, type ToolOutcome } from "./mcp";
import {
  REGION_STATES,
  TEXT_LIMITS,
  checkTextLength,
  meetsRole,
  validateRegionBox,
  type Board,
  type Region,
  type RegionState,
} from "./types";
import type { CurrentMember } from "./auth";

/**
 * DB-backed implementations of the MCP tools.
 *
 * Each mutation mirrors its REST twin exactly: same validation helpers,
 * same ownership walk (404-style "not found" rather than confirming that a
 * foreign resource exists), same writeAudit call — with `via: "mcp"` in the
 * meta so the audit log can tell an agent's edit from a browser's.
 */

const text = (data: unknown): ToolOutcome => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const fail = (message: string): ToolOutcome => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

async function ownedBoard(
  boardId: unknown,
  workspaceId: string,
): Promise<Board | null> {
  if (typeof boardId !== "string") return null;
  const board = await getBoard(boardId);
  return board && board.workspaceId === workspaceId ? board : null;
}

async function ownedRegion(
  regionId: unknown,
  workspaceId: string,
): Promise<{ region: Region; boardId: string } | null> {
  if (typeof regionId !== "string") return null;
  const region = await getRegion(regionId);
  if (!region) return null;
  const screen = await getScreen(region.screenId);
  if (!screen) return null;
  const board = await getBoard(screen.boardId);
  if (!board || board.workspaceId !== workspaceId) return null;
  return { region, boardId: screen.boardId };
}

type ToolImpl = (
  member: CurrentMember,
  args: Record<string, unknown>,
) => Promise<ToolOutcome>;

const impls: Record<string, ToolImpl> = {
  async list_boards(member) {
    const [boards, counts] = await Promise.all([
      listBoards(member.workspaceId),
      listBoardStateCounts(member.workspaceId),
    ]);
    return text(
      boards.map((b) => ({
        ...b,
        regionStates: counts.get(b.id) ?? { shipped: 0, mock: 0, missing: 0 },
      })),
    );
  },

  async get_board(member, args) {
    const board = await ownedBoard(args.board_id, member.workspaceId);
    if (!board) return fail("board not found");
    const full = await getBoardWithScreens(board.id);
    if (!full) return fail("board not found");
    return text(full);
  },

  async create_board(member, args) {
    const name = str(args.name);
    if (!name) return fail("name is required");
    const nameErr = checkTextLength(name, "name", TEXT_LIMITS.name);
    if (nameErr) return fail(nameErr);
    const description = str(args.description);
    const descErr = checkTextLength(
      description,
      "description",
      TEXT_LIMITS.description,
    );
    if (descErr) return fail(descErr);

    const board = await createBoard({
      id: newId(),
      workspaceId: member.workspaceId,
      name,
      description,
      createdBy: member.user.id,
    });
    // Same as the REST route: a board is born shareable.
    const link = await createShareLink({
      token: newShareToken(),
      boardId: board.id,
      label: null,
      createdBy: member.user.id,
    });
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "board.create",
      targetType: "board",
      targetId: board.id,
      boardId: board.id,
      meta: { name, via: "mcp" },
    });
    return text({ ...board, shareUrl: `/share/${link.token}` });
  },

  async update_board(member, args) {
    const board = await ownedBoard(args.board_id, member.workspaceId);
    if (!board) return fail("board not found");

    const patch: { name?: string; description?: string | null } = {};
    if ("name" in args && args.name !== undefined) {
      const name = str(args.name);
      if (!name) return fail("name can't be empty");
      const nameErr = checkTextLength(name, "name", TEXT_LIMITS.name);
      if (nameErr) return fail(nameErr);
      patch.name = name;
    }
    if ("description" in args && args.description !== undefined) {
      if (args.description !== null && typeof args.description !== "string") {
        return fail("description must be a string or null");
      }
      const description = args.description === null ? null : str(args.description);
      const descErr = checkTextLength(
        description,
        "description",
        TEXT_LIMITS.description,
      );
      if (descErr) return fail(descErr);
      patch.description = description;
    }
    if (Object.keys(patch).length === 0) {
      return fail("provide name and/or description");
    }

    const updated = await updateBoard(board.id, patch, member.user.id);
    if (!updated) return fail("board not found");
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "board.update",
      targetType: "board",
      targetId: board.id,
      boardId: board.id,
      meta: { ...patch, via: "mcp" },
    });
    return text(updated);
  },

  async create_region(member, args) {
    if (typeof args.screen_id !== "string") return fail("screen not found");
    const screen = await getScreen(args.screen_id);
    if (!screen) return fail("screen not found");
    const board = await getBoard(screen.boardId);
    if (!board || board.workspaceId !== member.workspaceId) {
      return fail("screen not found");
    }

    const box = validateRegionBox(args);
    if (!box.ok) return fail(box.error);
    if (
      typeof args.state !== "string" ||
      !REGION_STATES.includes(args.state as RegionState)
    ) {
      return fail(`state must be one of ${REGION_STATES.join(", ")}`);
    }
    const label = str(args.label);
    const labelErr = checkTextLength(label, "label", TEXT_LIMITS.label);
    if (labelErr) return fail(labelErr);
    const notes = str(args.notes);
    const notesErr = checkTextLength(notes, "notes", TEXT_LIMITS.notes);
    if (notesErr) return fail(notesErr);

    const region = await createRegion(
      {
        id: newId(),
        screenId: screen.id,
        ...box.box,
        state: args.state as RegionState,
        label,
        notes,
      },
      member.user.id,
    );
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "region.create",
      targetType: "region",
      targetId: region.id,
      boardId: screen.boardId,
      meta: { screenId: screen.id, state: region.state, via: "mcp" },
    });
    return text(region);
  },

  async update_region(member, args) {
    const owned = await ownedRegion(args.region_id, member.workspaceId);
    if (!owned) return fail("region not found");
    const existing = owned.region;

    const patch: Partial<
      Pick<Region, "x" | "y" | "w" | "h" | "state" | "label" | "notes">
    > = {};

    // Like the REST PATCH: validate the resulting geometry, not each field
    // in isolation, so a partial move can't push the box off-screen.
    if ("x" in args || "y" in args || "w" in args || "h" in args) {
      const box = validateRegionBox({
        x: "x" in args ? args.x : existing.x,
        y: "y" in args ? args.y : existing.y,
        w: "w" in args ? args.w : existing.w,
        h: "h" in args ? args.h : existing.h,
      });
      if (!box.ok) return fail(box.error);
      if ("x" in args) patch.x = box.box.x;
      if ("y" in args) patch.y = box.box.y;
      if ("w" in args) patch.w = box.box.w;
      if ("h" in args) patch.h = box.box.h;
    }
    if ("state" in args && args.state !== undefined) {
      if (
        typeof args.state !== "string" ||
        !REGION_STATES.includes(args.state as RegionState)
      ) {
        return fail(`state must be one of ${REGION_STATES.join(", ")}`);
      }
      patch.state = args.state as RegionState;
    }
    if ("label" in args && args.label !== undefined) {
      if (args.label !== null && typeof args.label !== "string") {
        return fail("label must be a string or null");
      }
      const label = args.label === null ? null : str(args.label);
      const labelErr = checkTextLength(label, "label", TEXT_LIMITS.label);
      if (labelErr) return fail(labelErr);
      patch.label = label;
    }
    if ("notes" in args && args.notes !== undefined) {
      if (args.notes !== null && typeof args.notes !== "string") {
        return fail("notes must be a string or null");
      }
      const notes = args.notes === null ? null : str(args.notes);
      const notesErr = checkTextLength(notes, "notes", TEXT_LIMITS.notes);
      if (notesErr) return fail(notesErr);
      patch.notes = notes;
    }
    if (Object.keys(patch).length === 0) {
      return fail("provide at least one field to change");
    }

    const updated = await updateRegion(existing.id, patch, member.user.id);
    if (!updated) return fail("region not found");
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "region.update",
      targetType: "region",
      targetId: existing.id,
      boardId: owned.boardId,
      meta: { ...patch, via: "mcp" },
    });
    return text(updated);
  },

  async delete_region(member, args) {
    const owned = await ownedRegion(args.region_id, member.workspaceId);
    if (!owned) return fail("region not found");
    if (!(await deleteRegion(owned.region.id, member.user.id))) {
      return fail("region not found");
    }
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "region.delete",
      targetType: "region",
      targetId: owned.region.id,
      boardId: owned.boardId,
      meta: { via: "mcp" },
    });
    return text({ deleted: owned.region.id });
  },

  async list_share_links(member, args) {
    const board = await ownedBoard(args.board_id, member.workspaceId);
    if (!board) return fail("board not found");
    const links = await listShareLinks(board.id);
    return text(links.map((l) => ({ ...l, shareUrl: `/share/${l.token}` })));
  },

  async create_share_link(member, args) {
    const board = await ownedBoard(args.board_id, member.workspaceId);
    if (!board) return fail("board not found");
    const label = str(args.label);
    const labelErr = checkTextLength(label, "label", TEXT_LIMITS.label);
    if (labelErr) return fail(labelErr);

    const link = await createShareLink({
      token: newShareToken(),
      boardId: board.id,
      label,
      createdBy: member.user.id,
    });
    await writeAudit({
      workspaceId: member.workspaceId,
      actorId: member.user.id,
      action: "share_link.create",
      targetType: "share_link",
      targetId: link.token,
      boardId: board.id,
      meta: { boardId: board.id, label, via: "mcp" },
    });
    return text({ ...link, shareUrl: `/share/${link.token}` });
  },
};

// Compile-time-adjacent guard: every declared tool has an implementation.
// (A test asserts this too; this keeps the failure mode loud in dev.)
for (const tool of MCP_TOOLS) {
  if (!impls[tool.name]) {
    throw new Error(`MCP tool ${tool.name} declared but not implemented`);
  }
}

/** Bind the tool set to an authenticated member for one request. */
export function createMcpToolExecutor(member: CurrentMember) {
  return async (
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolOutcome> => {
    const def = MCP_TOOLS.find((t) => t.name === name);
    const impl = impls[name];
    if (!def || !impl) return fail(`unknown tool: ${name}`);
    if (!meetsRole(member.role, def.requiredRole)) {
      return fail(
        `this API key has ${member.role} access; ${name} requires ${def.requiredRole}`,
      );
    }
    return impl(member, args);
  };
}
