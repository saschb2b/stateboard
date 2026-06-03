"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LibraryAddOutlinedIcon from "@mui/icons-material/LibraryAddOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { AppHeader } from "./app-header";
import { UserMenu } from "./user-menu";
import { StateChip } from "./state-chip";
import { STATE_META } from "@/lib/state-meta";
import { REGION_STATES } from "@/lib/types";
import type { Board, ScreenWithRegions } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";

export interface BoardListItem {
  board: Board;
  /** Most-recent active share-link token, or null if none. */
  shareToken: string | null;
  /** Screens (with regions) for the card's preview carousel, in display order. */
  screens: ScreenWithRegions[];
  /** Region counts by state across the whole board, for the status summary. */
  totals: { shipped: number; mock: number; missing: number };
  /** Pre-formatted relative time the board was last touched, e.g. "3d ago". */
  updatedLabel: string;
}

interface BoardListProps {
  initialItems: BoardListItem[];
  viewer: CurrentMember;
}

const canEdit = (role: CurrentMember["role"]) =>
  role === "owner" || role === "editor";

export function BoardList({ initialItems, viewer }: BoardListProps) {
  const router = useRouter();
  const [items, setItems] = useState<BoardListItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = canEdit(viewer.role);

  const onCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/boards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `failed (${res.status})`);
        return;
      }
      const created: Board = await res.json();
      setItems((prev) => [
        {
          board: created,
          shareToken: null,
          screens: [],
          totals: { shipped: 0, mock: 0, missing: 0 },
          updatedLabel: "just now",
        },
        ...prev,
      ]);
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/boards/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const openCreate = () => {
    setError(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  return (
    <>
      <AppHeader
        homeHref="/boards"
        actions={
          <>
            <Button
              size="small"
              variant="text"
              color="inherit"
              component={Link}
              href="/share/demo"
              target="_blank"
              rel="noopener"
              endIcon={<OpenInNewIcon fontSize="inherit" />}
              sx={{ color: "text.secondary" }}
            >
              View example
            </Button>
            <UserMenu user={viewer.user} role={viewer.role} />
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                Boards
              </Typography>
              <Typography variant="body1" color="text.secondary">
                One board per product or per quarterly review. Most teams keep 3
                to 8.
              </Typography>
            </Box>
            {editable ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => openCreate()}
              >
                New board
              </Button>
            ) : null}
          </Stack>

          {items.length === 0 ? (
            <EmptyState canCreate={editable} />
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
              }}
            >
              {items.map((it) => (
                <BoardCard key={it.board.id} item={it} editable={editable} />
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5 }}>New board</DialogTitle>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: 3, pb: 2 }}
        >
          A board collects the screens you want to talk about with stakeholders.
          You can edit everything later.
        </Typography>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5}>
            <TextField
              autoFocus
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Dashboard / Q2 2026"
              helperText={
                <>
                  This is the title stakeholders see at the top of the share
                  link. Common pattern:{" "}
                  <Box
                    component="span"
                    sx={{ fontFamily: "monospace", color: "text.primary" }}
                  >
                    Product / Quarter
                  </Box>
                  .
                </>
              }
            />
            <TextField
              label="Subtitle"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional · e.g. End-of-Q2 review for the leadership team."
              helperText="Appears beneath the name on the share link. Useful for context the title can't carry."
            />

            <Box
              sx={{
                p: 2,
                bgcolor: "background.default",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "text.secondary",
                  textTransform: "uppercase",
                }}
              >
                Next, in this board
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}
              >
                <NextStep n={1} label="Upload a screenshot" />
                <StepArrow />
                <NextStep n={2} label="Mark regions" />
                <StepArrow />
                <NextStep n={3} label="Share the link" />
              </Stack>
            </Box>

            {error ? (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            justifyContent: "space-between",
          }}
        >
          <Button
            size="small"
            component={Link}
            href="/share/demo"
            target="_blank"
            rel="noopener"
            endIcon={<OpenInNewIcon fontSize="inherit" />}
            sx={{ color: "text.secondary" }}
          >
            See the example first
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <Paper
      sx={{
        p: { xs: 4, sm: 6 },
        textAlign: "center",
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {canCreate ? "Not sure where to start?" : "No boards yet"}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 460, mx: "auto" }}
      >
        {canCreate
          ? "Open the example board: two screens, twelve regions across all three states. It's the fastest way to feel what a finished board does."
          : "An editor in this workspace hasn't created any boards yet. Open the example to see what one looks like."}
      </Typography>
      <Button
        component={Link}
        href="/share/demo"
        target="_blank"
        rel="noopener"
        variant="outlined"
        color="primary"
        endIcon={<OpenInNewIcon fontSize="inherit" />}
      >
        Open the example
      </Button>
    </Paper>
  );
}

function NextStep({ n, label }: { n: number; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
    </Stack>
  );
}

function StepArrow() {
  return (
    <Box
      aria-hidden
      sx={{
        color: "text.secondary",
        opacity: 0.5,
        display: { xs: "none", sm: "inline" },
      }}
    >
      →
    </Box>
  );
}

function BoardCard({
  item,
  editable,
}: {
  item: BoardListItem;
  editable: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [cloning, setCloning] = useState(false);
  const { board, shareToken, screens, totals, updatedLabel } = item;
  const totalRegions = totals.shipped + totals.mock + totals.missing;

  const copyShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // Deep-copy this board, then open the copy so the user can swap a screen or
  // two. The whole card is a link, so swallow the click that triggered it.
  const onClone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cloning) return;
    setCloning(true);
    try {
      const res = await fetch(`/api/boards/${board.id}/clone`, {
        method: "POST",
      });
      if (!res.ok) {
        setCloning(false);
        return;
      }
      const cloned: Board = await res.json();
      router.push(`/boards/${cloned.id}`);
    } catch {
      setCloning(false);
    }
  };

  // Editors land on the editor; viewers go straight to the public share
  // view (read-only) so the editor's edit affordances aren't a tease.
  const href = editable
    ? `/boards/${board.id}`
    : shareToken
      ? `/share/${shareToken}`
      : `/boards/${board.id}`;

  return (
    <Paper
      component={Link}
      href={href}
      sx={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        overflow: "hidden",
        transition: "transform 120ms ease, border-color 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
        },
      }}
    >
      <BoardScreenCarousel screens={screens} />
      <Box sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Typography variant="h6" sx={{ mb: 0.5, flex: 1 }}>
            {board.name}
          </Typography>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            {editable ? (
              <Tooltip title="Duplicate board">
                <IconButton
                  size="small"
                  onClick={onClone}
                  disabled={cloning}
                  aria-label="Duplicate board"
                >
                  {cloning ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <LibraryAddOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : null}
            {shareToken ? (
              <Tooltip title={copied ? "Copied!" : "Copy share link"}>
                <IconButton
                  size="small"
                  onClick={copyShare}
                  aria-label="Copy share link"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        </Stack>
        {board.description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {board.description}
          </Typography>
        ) : null}
        {totalRegions > 0 ? (
          <Stack direction="row" spacing={1.25} sx={{ mb: 1.5 }}>
            {REGION_STATES.map((s) => (
              <Stack key={s} direction="row" spacing={0.5} alignItems="center">
                <StateChip state={s} size="sm" />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {totals[s]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          alignItems="baseline"
          justifyContent="space-between"
        >
          {shareToken ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily: "monospace",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              /share/{shareToken.slice(0, 8)}…
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic" }}
            >
              No active share link
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0 }}
          >
            {updatedLabel}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

/**
 * Swipeable peek at a board's screens. Native horizontal scroll-snap gives
 * touch/trackpad swiping for free; dots and hover arrows drive it on desktop.
 * It lives inside the card link, so its controls preventDefault/stopPropagation
 * to change slides without navigating — a tap on a slide still opens the board.
 */
function BoardScreenCarousel({ screens }: { screens: ScreenWithRegions[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (screens.length === 0) {
    return (
      <Box
        sx={{
          aspectRatio: "16 / 10",
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          color: "text.disabled",
        }}
      >
        <ImageOutlinedIcon />
        <Typography variant="caption">No screens yet</Typography>
      </Box>
    );
  }

  const go = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <Box
      sx={{
        position: "relative",
        borderBottom: 1,
        borderColor: "divider",
        "&:hover .carousel-nav": { opacity: 1 },
      }}
    >
      <Box
        ref={scrollRef}
        onScroll={onScroll}
        sx={{
          display: "flex",
          aspectRatio: "16 / 10",
          overflowX: "auto",
          bgcolor: "background.default",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {screens.map((s, i) => (
          <Box
            key={s.id}
            sx={{
              flex: "0 0 100%",
              height: "100%",
              scrollSnapAlign: "center",
              containerType: "size",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Inner box carries the screen's exact aspect ratio, contained
                inside the fixed thumbnail via container-query units, so the
                painted regions line up with the image at any card width. */}
            <Box
              sx={{
                position: "relative",
                aspectRatio: `${s.width} / ${s.height}`,
                width: `min(100cqw, calc(100cqh * ${s.width} / ${s.height}))`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.mediaUrl}
                alt={s.label ?? `Screen ${i + 1}`}
                loading="lazy"
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  display: "block",
                }}
              />
              {s.regions.map((r) => (
                <Box
                  key={r.id}
                  aria-hidden
                  sx={{
                    position: "absolute",
                    left: `${r.x * 100}%`,
                    top: `${r.y * 100}%`,
                    width: `${r.w * 100}%`,
                    height: `${r.h * 100}%`,
                    border: `1.5px solid ${STATE_META[r.state].color}`,
                    bgcolor: STATE_META[r.state].fill,
                    borderRadius: "2px",
                    pointerEvents: "none",
                  }}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {screens.length > 1 ? (
        <>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.4,
              pointerEvents: "none",
            }}
          >
            {active + 1} / {screens.length}
          </Box>
          <CarouselArrow
            edge="left"
            disabled={active === 0}
            onClick={(e) => go(e, active - 1)}
          />
          <CarouselArrow
            edge="right"
            disabled={active === screens.length - 1}
            onClick={(e) => go(e, active + 1)}
          />
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: "absolute",
              bottom: 6,
              left: 0,
              right: 0,
              justifyContent: "center",
            }}
          >
            {screens.map((s, i) => (
              <Box
                component="button"
                key={s.id}
                onClick={(e) => go(e, i)}
                aria-label={`Show screen ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                sx={{
                  width: 8,
                  height: 8,
                  p: 0,
                  border: 0,
                  borderRadius: "50%",
                  cursor: "pointer",
                  bgcolor:
                    i === active ? "primary.main" : "rgba(255,255,255,0.55)",
                  boxShadow: "0 0 2px rgba(0,0,0,0.6)",
                  transition: "background-color 120ms ease",
                  "&:focus-visible": {
                    outline: 2,
                    outlineStyle: "solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              />
            ))}
          </Stack>
        </>
      ) : null}
    </Box>
  );
}

function CarouselArrow({
  edge,
  disabled,
  onClick,
}: {
  edge: "left" | "right";
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <IconButton
      className="carousel-nav"
      size="small"
      onClick={onClick}
      disabled={disabled}
      aria-label={edge === "left" ? "Previous screen" : "Next screen"}
      sx={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [edge]: 4,
        opacity: 0,
        transition: "opacity 120ms ease",
        bgcolor: "rgba(0,0,0,0.45)",
        color: "#fff",
        "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
        "&.Mui-disabled": { color: "rgba(255,255,255,0.3)" },
      }}
    >
      {edge === "left" ? (
        <ChevronLeftIcon fontSize="small" />
      ) : (
        <ChevronRightIcon fontSize="small" />
      )}
    </IconButton>
  );
}
