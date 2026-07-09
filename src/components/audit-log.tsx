"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import {
  AUDIT_ACTIONS,
  AUDIT_EXPORT_CAP,
  AUDIT_TARGET_TYPES,
  auditActionLabel,
  formatAuditTime,
  summarizeMeta,
  type AuditCursor,
  type AuditEntry,
} from "@/lib/audit";
import type { UserRef } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

interface AuditLogProps {
  viewer: CurrentMember;
  initialEntries: AuditEntry[];
  initialCursor: AuditCursor | null;
  /** Distinct actors present in the log, for the actor filter. */
  actors: UserRef[];
  pageSize: number;
  /** API base for the (filtered) list — workspace-wide or a single board. */
  listEndpoint: string;
  /** API base for the CSV export, mirroring `listEndpoint`'s scope. */
  exportEndpoint: string;
  /** Header breadcrumb + page heading. */
  crumb: string;
  heading: string;
  subtitle: string;
  /** Where the header's home link points (defaults to the board list). */
  backHref?: string;
}

interface AuditPage {
  entries: AuditEntry[];
  nextCursor: AuditCursor | null;
}

/** Truncate a long id/token for the cell, keeping the full value on hover. */
function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 10)}…` : id;
}

/**
 * Audit-log table, reused for two scopes: the owner-only workspace log at
 * `/settings/audit`, and a board's own history at `/boards/[id]/history` (any
 * member). Scope is entirely a matter of which `listEndpoint` / `exportEndpoint`
 * the page passes; the table, filters, and pagination are identical.
 *
 * The first page is server-rendered (unfiltered within its scope). Changing any
 * filter refetches page one; "Load more" walks the keyset cursor. Everything the
 * table shows is also what the CSV export contains, so a reader can eyeball then
 * export.
 */
export function AuditLog({
  viewer,
  initialEntries,
  initialCursor,
  actors,
  pageSize,
  listEndpoint,
  exportEndpoint,
  crumb,
  heading,
  subtitle,
  backHref = "/boards",
}: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>(initialEntries);
  const [cursor, setCursor] = useState<AuditCursor | null>(initialCursor);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(actor || action || target || from || to);
  // A monotonic token so a slow earlier request can't overwrite a newer one.
  const reqSeq = useRef(0);

  const buildQuery = (withCursor: boolean): URLSearchParams => {
    const p = new URLSearchParams();
    if (actor) p.set("actor", actor);
    if (action) p.set("action", action);
    if (target) p.set("target", target);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (withCursor && cursor) {
      p.set("before", String(cursor.at));
      p.set("beforeId", String(cursor.id));
    }
    return p;
  };

  const load = async (reset: boolean) => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    const p = buildQuery(!reset);
    p.set("limit", String(pageSize));
    try {
      const res = await fetch(`${listEndpoint}?${p.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (seq === reqSeq.current) {
          setError(body.error ?? "Couldn't load the audit log.");
        }
        return;
      }
      const data = (await res.json()) as AuditPage;
      if (seq !== reqSeq.current) return; // a newer request already won
      setEntries((prev) => (reset ? data.entries : [...prev, ...data.entries]));
      setCursor(data.nextCursor);
    } catch {
      if (seq === reqSeq.current) setError("Couldn't load the audit log.");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  // Refetch page one whenever a filter changes. Driven by an effect (not the
  // change handlers) so `load` runs with the updated state, not the stale
  // closure it was called from. Skips the initial mount, where the server
  // already supplied the unfiltered first page.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    void load(true);
    // Intentionally keyed on the filter values only; `load` reads them fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, action, target, from, to]);

  const clearFilters = () => {
    setActor("");
    setAction("");
    setTarget("");
    setFrom("");
    setTo("");
  };

  const exportHref = `${exportEndpoint}?${buildQuery(false).toString()}`;

  return (
    <>
      <AppHeader
        homeHref={backHref}
        crumb={crumb}
        actions={<UserMenu user={viewer.user} role={viewer.role} />}
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              {heading}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          {/* filter bar */}
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ flexWrap: "wrap", rowGap: 1.5 }}
          >
            <TextField
              select
              size="small"
              label="Actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All actors</MenuItem>
              {actors.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name ?? a.email}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">All actions</MenuItem>
              {AUDIT_ACTIONS.map((a) => (
                <MenuItem key={a} value={a}>
                  {auditActionLabel(a)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Resource"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All resources</MenuItem>
              {AUDIT_TARGET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace("_", " ")}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              size="small"
              label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              size="small"
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {hasFilters ? (
              <Button size="small" color="inherit" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}

            <Box sx={{ flex: 1 }} />

            <Tooltip
              title={`Downloads up to ${AUDIT_EXPORT_CAP.toLocaleString()} most recent matching entries`}
            >
              <Button
                component="a"
                href={exportHref}
                download
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<FileDownloadOutlinedIcon />}
                sx={{ borderColor: "divider" }}
              >
                Export CSV
              </Button>
            </Tooltip>
          </Stack>

          {error ? (
            <Paper
              sx={{ p: 2, borderColor: "error.main", color: "error.main" }}
            >
              <Typography variant="body2">{error}</Typography>
            </Paper>
          ) : null}

          {entries.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {hasFilters
                  ? "No entries match these filters."
                  : "No activity has been recorded yet."}
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ overflow: "hidden" }}>
              <Table
                size="small"
                sx={{ "& td, & th": { whiteSpace: "nowrap" } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>When (UTC)</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((e) => {
                    const details = summarizeMeta(e.meta);
                    return (
                      <TableRow key={e.id} hover>
                        <TableCell
                          sx={{
                            fontFamily: "monospace",
                            color: "text.secondary",
                          }}
                        >
                          {formatAuditTime(e.at)}
                        </TableCell>
                        <TableCell>
                          {e.actorName ?? "a former member"}
                        </TableCell>
                        <TableCell>{auditActionLabel(e.action)}</TableCell>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                          >
                            <Chip
                              label={e.targetType.replace("_", " ")}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: "divider" }}
                            />
                            {e.targetId ? (
                              <Tooltip title={e.targetId}>
                                <Box
                                  component="span"
                                  sx={{
                                    fontFamily: "monospace",
                                    fontSize: 12,
                                    color: "text.secondary",
                                  }}
                                >
                                  {shortId(e.targetId)}
                                </Box>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "text.secondary",
                          }}
                        >
                          {details ? (
                            <Tooltip title={details}>
                              <Box
                                component="span"
                                sx={{ fontFamily: "monospace", fontSize: 12 }}
                              >
                                {details}
                              </Box>
                            </Tooltip>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}

          {cursor ? (
            <Box sx={{ textAlign: "center" }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => void load(false)}
                disabled={loading}
                sx={{ borderColor: "divider" }}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </Box>
          ) : null}
        </Stack>
      </Container>
    </>
  );
}
