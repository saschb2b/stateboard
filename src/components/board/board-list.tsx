"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LibraryAddOutlinedIcon from "@mui/icons-material/LibraryAddOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import { AppHeader } from "@/components/app/app-header";
import { UserMenu } from "@/components/app/user-menu";
import type { Board, ScreenWithRegions } from "@/lib/types";
import type { CurrentMember } from "@/lib/auth";
import type { ReleaseOverview } from "@/lib/release-types";
import { ReleaseOverviewSummary } from "@/components/release/release-overview-summary";
import { clientRequest } from "@/lib/client-request";

export interface BoardListItem {
  board: Board;
  shareToken: string | null;
  screens: ScreenWithRegions[];
  totals: { shipped: number; mock: number; missing: number };
  updatedLabel?: string;
  updatedAt?: number;
  now?: number;
  releaseOverview?: ReleaseOverview;
}

interface BoardListProps {
  initialItems: BoardListItem[];
  viewer: CurrentMember;
}

interface BoardListActions {
  onCreate: (input: { name: string; description: string }) => Promise<Board>;
  onDuplicate: (board: Board) => Promise<Board>;
  onOpen: (board: Board) => void;
}

export function BoardList(props: BoardListProps) {
  const router = useRouter();
  return (
    <BoardListView
      {...props}
      onCreate={(input) =>
        clientRequest<Board>("/api/boards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        })
      }
      onDuplicate={(board) =>
        clientRequest<Board>(`/api/boards/${board.id}/clone`, {
          method: "POST",
        })
      }
      onOpen={(board) => router.push(`/boards/${board.id}/releases`)}
    />
  );
}

export function BoardListView({
  initialItems,
  viewer,
  onCreate,
  onDuplicate,
  onOpen,
}: BoardListProps & BoardListActions) {
  const t = useTranslations("Visual");
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const editable = viewer.role !== "viewer";

  const create = async () => {
    if (inFlight.current || !name.trim()) return;
    inFlight.current = true;
    setCreating(true);
    setError(null);
    try {
      const board = await onCreate({
        name: name.trim(),
        description: description.trim(),
      });
      setItems((current) => [
        {
          board,
          shareToken: null,
          screens: [],
          totals: { shipped: 0, mock: 0, missing: 0 },
          updatedLabel: t("justNow"),
        },
        ...current,
      ]);
      setOpen(false);
      onOpen(board);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("createBoardError"));
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  };

  return (
    <>
      <AppHeader
        homeHref="/boards"
        crumb={t("workspace")}
        actions={<UserMenu user={viewer.user} role={viewer.role} />}
      />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography component="h1" variant="h5">
              {t("boards")}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {t("boardListDescription")}
            </Typography>
          </Box>
          {editable && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setName("");
                setDescription("");
                setError(null);
                setOpen(true);
              }}
            >
              {t("newBoard")}
            </Button>
          )}
        </Stack>
        {items.length ? (
          <Paper sx={{ overflow: "hidden" }}>
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t("productCount", { count: items.length })}
              </Typography>
            </Box>
            <Stack
              divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
            >
              {items.map((item) => (
                <BoardRow
                  key={item.board.id}
                  item={item}
                  editable={editable}
                  onDuplicate={onDuplicate}
                  onOpen={onOpen}
                />
              ))}
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ px: 3, py: { xs: 4, sm: 6 } }}>
            <Stack spacing={1.5} alignItems="flex-start" sx={{ maxWidth: 460 }}>
              <FolderOutlinedIcon sx={{ color: "text.secondary" }} />
              <Typography component="h2" variant="h6">
                {t("firstProduct")}
              </Typography>
              <Typography color="text.secondary">
                {editable
                  ? t("createBoardDescription")
                  : t("createBoardEditor")}
              </Typography>
              <Button
                component={Link}
                href="/share/demo/releases"
                color="inherit"
                endIcon={<ArrowForwardIcon />}
              >
                {t("exploreExample")}
              </Button>
            </Stack>
          </Paper>
        )}
        {items.length > 0 && (
          <Button
            component={Link}
            href="/share/demo/releases"
            color="inherit"
            size="small"
            sx={{ mt: 2, color: "text.secondary" }}
          >
            {t("viewExampleAssessment")}
          </Button>
        )}
      </Container>
      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <DialogTitle>{t("newBoard")}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                label={t("productName")}
                required
                fullWidth
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={creating}
                placeholder="StateBoard"
              />
              <TextField
                label={t("descriptionOptional")}
                fullWidth
                multiline
                minRows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={creating}
              />
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={creating}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={creating || !name.trim()}
            >
              {creating ? t("creating") : t("createBoard")}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}

function BoardRow({
  item,
  editable,
  onDuplicate,
  onOpen,
}: { item: BoardListItem; editable: boolean } & Pick<
  BoardListActions,
  "onDuplicate" | "onOpen"
>) {
  const t = useTranslations("Visual");
  const format = useFormatter();
  const { board, screens, shareToken } = item;
  const updatedLabel =
    item.updatedAt !== undefined && item.now !== undefined
      ? format.relativeTime(item.updatedAt, item.now)
      : (item.updatedLabel ?? t("justNow"));
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const duplicate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setCloning(true);
    setError(null);
    try {
      onOpen(await onDuplicate(board));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("duplicateBoardError"),
      );
    } finally {
      inFlight.current = false;
      setCloning(false);
    }
  };
  const copy = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/share/${shareToken}`,
      );
      setCopied(true);
    } catch {
      setError(t("copyLinkScreensError"));
    }
  };
  return (
    <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) minmax(260px, 0.9fr) auto",
          },
          gap: { xs: 2, md: 3 },
          alignItems: "center",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component={Link}
            href={`/boards/${board.id}/releases`}
            variant="h6"
            sx={{
              display: "inline-block",
              color: "text.primary",
              textDecoration: "none",
              overflowWrap: "anywhere",
              "&:hover": { color: "primary.main" },
            }}
          >
            {board.name}
          </Typography>
          {board.description && (
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 440 }}>
              {board.description}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1.25 }}
          >
            {t("updatedAt", { time: updatedLabel })}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0, "& > .MuiStack-root": { my: 0 } }}>
          <ReleaseOverviewSummary
            overview={item.releaseOverview}
            showCandidate
          />
        </Box>
        <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
          <Button
            component={Link}
            href={`/boards/${board.id}/releases`}
            variant="outlined"
            color="inherit"
            endIcon={<ArrowForwardIcon />}
          >
            {t("openBoard")}
          </Button>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              component={Link}
              href={`/boards/${board.id}`}
              color="inherit"
              size="small"
              startIcon={<ImageOutlinedIcon />}
              sx={{ color: "text.secondary" }}
            >
              {t("screenCount", { count: screens.length })}
            </Button>
            {editable && (
              <Tooltip title={t("copyScreensTooltip")}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void duplicate()}
                    disabled={cloning}
                    aria-label={t("copyBoardScreens", { name: board.name })}
                  >
                    <LibraryAddOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {shareToken && (
              <Tooltip title={copied ? t("copied") : t("copyVisualShareLink")}>
                <IconButton
                  size="small"
                  onClick={() => void copy()}
                  aria-label={t("copyBoardVisualLink", { name: board.name })}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
