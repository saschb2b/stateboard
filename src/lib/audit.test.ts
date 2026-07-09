import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  auditActionLabel,
  auditRowToCsv,
  auditToCsv,
  formatAuditTime,
  parseAuditCursor,
  parseAuditFilters,
  parseAuditLimit,
  summarizeMeta,
  type AuditEntry,
} from "./audit.ts";

describe("parseAuditFilters", () => {
  it("keeps a known action, target type, and actor", () => {
    const f = parseAuditFilters({
      actor: "u1",
      action: "board.create",
      target: "board",
    });
    assert.deepEqual(f, {
      actor: "u1",
      action: "board.create",
      targetType: "board",
    });
  });

  it("drops an unknown action or target type rather than rejecting", () => {
    const f = parseAuditFilters({ action: "board.nuke", target: "galaxy" });
    assert.deepEqual(f, {});
  });

  it("maps a date range to a UTC [from, nextDay) window", () => {
    const f = parseAuditFilters({ from: "2026-07-01", to: "2026-07-09" });
    assert.equal(f.fromMs, Date.parse("2026-07-01"));
    // `to` is exclusive: the start of 2026-07-10, so the whole 9th is included.
    assert.equal(f.toMs, Date.parse("2026-07-10"));
  });

  it("ignores malformed dates and blank/whitespace values", () => {
    const f = parseAuditFilters({
      from: "07/01/2026",
      to: "not-a-date",
      actor: "   ",
    });
    assert.deepEqual(f, {});
  });

  it("ignores absent params entirely", () => {
    assert.deepEqual(parseAuditFilters({}), {});
    assert.deepEqual(parseAuditFilters({ actor: undefined, action: null }), {});
  });
});

describe("parseAuditLimit", () => {
  it("falls back to the default when absent or unparseable", () => {
    assert.equal(parseAuditLimit(null), 50);
    assert.equal(parseAuditLimit("abc"), 50);
  });

  it("clamps to [1, max] and truncates", () => {
    assert.equal(parseAuditLimit("0"), 1);
    assert.equal(parseAuditLimit("-5"), 1);
    assert.equal(parseAuditLimit("999"), 200);
    assert.equal(parseAuditLimit("17.9"), 17);
  });
});

describe("parseAuditCursor", () => {
  it("returns null when either param is absent (Number(null) is 0, not NaN)", () => {
    assert.equal(parseAuditCursor(null, null), null);
    assert.equal(parseAuditCursor("123", null), null);
    assert.equal(parseAuditCursor(null, "5"), null);
    assert.equal(parseAuditCursor("", ""), null);
  });

  it("returns null for non-numeric input", () => {
    assert.equal(parseAuditCursor("abc", "5"), null);
  });

  it("builds a cursor from two finite numbers", () => {
    assert.deepEqual(parseAuditCursor("1781085462571", "38"), {
      at: 1781085462571,
      id: 38,
    });
  });
});

describe("auditActionLabel", () => {
  it("maps known actions to friendly labels", () => {
    assert.equal(auditActionLabel("share_link.revoke"), "Revoked share link");
  });

  it("falls back to the raw value for anything unknown", () => {
    assert.equal(auditActionLabel("board.teleport"), "board.teleport");
  });
});

describe("formatAuditTime", () => {
  it("renders a fixed UTC minute string", () => {
    const at = Date.parse("2026-07-09T09:57:58.123Z");
    assert.equal(formatAuditTime(at), "2026-07-09 09:57 UTC");
  });
});

describe("summarizeMeta", () => {
  it("returns '' for null meta", () => {
    assert.equal(summarizeMeta(null), "");
  });

  it("joins string values plainly and JSON-encodes the rest", () => {
    assert.equal(
      summarizeMeta({ name: "Acme", screens: 3, order: ["a", "b"] }),
      'name=Acme · screens=3 · order=["a","b"]',
    );
  });
});

describe("auditRowToCsv", () => {
  const base: AuditEntry = {
    id: 1,
    actorId: "u1",
    actorName: "Alice",
    action: "board.create",
    targetType: "board",
    targetId: "b1",
    meta: { name: "Q2" },
    at: Date.parse("2026-07-09T09:57:58.000Z"),
  };

  it("emits an ISO timestamp and JSON-encoded meta", () => {
    const row = auditRowToCsv(base);
    assert.equal(
      row,
      '2026-07-09T09:57:58.000Z,u1,Alice,board.create,board,b1,"{""name"":""Q2""}"',
    );
  });

  it("quotes cells containing commas and doubles embedded quotes", () => {
    const row = auditRowToCsv({
      ...base,
      actorName: 'Ray, "The Boss"',
      meta: null,
    });
    assert.match(row, /"Ray, ""The Boss"""/);
  });

  it("defangs a formula-injection cell with a leading apostrophe", () => {
    const row = auditRowToCsv({
      ...base,
      actorName: "=cmd|'/c calc'!A1",
      meta: null,
    });
    // Leading '=' triggers the apostrophe guard. No comma/quote/newline in the
    // value, so it is defanged but not RFC-quoted.
    assert.match(row, /,'=cmd\|'\/c calc'!A1,/);
  });

  it("both defangs and quotes when the value also contains a comma", () => {
    const row = auditRowToCsv({ ...base, actorName: "=1,2", meta: null });
    assert.match(row, /"'=1,2"/);
  });

  it("leaves an empty actor name as an empty field", () => {
    const row = auditRowToCsv({ ...base, actorId: null, actorName: null });
    assert.match(row, /^2026-07-09T09:57:58.000Z,,,board.create/);
  });
});

describe("auditToCsv", () => {
  it("prepends a header row and terminates with CRLF", () => {
    const csv = auditToCsv([]);
    assert.equal(
      csv,
      "at_utc,actor_id,actor_name,action,target_type,target_id,meta\r\n",
    );
  });
});
