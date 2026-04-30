"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { AppHeader } from "./app-header";
import type { Board } from "@/lib/types";

interface BoardListProps {
  initialBoards: Board[];
}

/**
 * Suggested starting points for the create-board dialog. The labels
 * demonstrate naming patterns; clicking pre-fills the name field.
 */
const PRESETS: { label: string; name: () => string }[] = [
  {
    label: "Quarterly review",
    name: () => `Quarterly review · ${quarterTag()}`,
  },
  { label: "Product launch", name: () => "Product launch · " },
  { label: "Demo prep", name: () => "Demo prep · " },
  { label: "Sprint review", name: () => "Sprint review · " },
];

function quarterTag(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

export function BoardList({ initialBoards }: BoardListProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setBoards((prev) => [created, ...prev]);
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/b/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const openCreate = (preset?: (typeof PRESETS)[number]) => {
    setError(null);
    setName(preset ? preset.name() : "");
    setDescription("");
    setOpen(true);
  };

  return (
    <>
      <AppHeader />
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
                One board per product or per quarterly review. Most teams keep
                3–8.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                size="small"
                variant="text"
                color="inherit"
                component={Link}
                href="/v/demo"
                target="_blank"
                rel="noopener"
                endIcon={<OpenInNewIcon fontSize="inherit" />}
                sx={{ color: "text.secondary" }}
              >
                View example
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => openCreate()}
              >
                New board
              </Button>
            </Stack>
          </Stack>

          {boards.length === 0 ? (
            <EmptyState onCreate={openCreate} />
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
              {boards.map((b) => (
                <BoardCard key={b.id} board={b} />
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <Dialog
        open={open}
        onClose={() => !creating && setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New board</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Dashboard / Q2 2026"
              helperText="Pick a name like the title of a deck you'd send your CEO."
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", rowGap: 0.75 }}
            >
              {PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => setName(p.name())}
                />
              ))}
            </Stack>
            {error ? (
              <Typography variant="caption" color="error">
                {error}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
        </DialogActions>
      </Dialog>
    </>
  );
}

/**
 * Empty-state when the user has zero boards. Demonstrates the concept by
 * pointing at the live example AND offers preset starting points so the
 * next click is a name rather than a blank prompt.
 */
function EmptyState({
  onCreate,
}: {
  onCreate: (preset?: (typeof PRESETS)[number]) => void;
}) {
  return (
    <Paper sx={{ p: { xs: 3, sm: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Start with the example
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See what a finished board looks like — two screens, twelve regions,
            three states. Then come back and create your own.
          </Typography>
          <Button
            component={Link}
            href="/v/demo"
            target="_blank"
            rel="noopener"
            variant="outlined"
            color="primary"
            endIcon={<OpenInNewIcon fontSize="inherit" />}
            sx={{ mt: 2 }}
          >
            Open the example
          </Button>
        </Box>

        <Box sx={{ borderTop: 1, borderColor: "divider", pt: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Or start with a name
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick the kind of report you&apos;re prepping — we&apos;ll fill in a
            sensible default name.
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            {PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                variant="outlined"
                clickable
                onClick={() => onCreate(p)}
                sx={{
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

function BoardCard({ board }: { board: Board }) {
  return (
    <Paper
      component={Link}
      href={`/b/${board.id}`}
      sx={{
        p: 2.5,
        textDecoration: "none",
        color: "inherit",
        display: "block",
        transition: "transform 120ms ease, border-color 120ms ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {board.name}
      </Typography>
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
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontFamily: "monospace" }}
      >
        /v/{board.slug}
      </Typography>
    </Paper>
  );
}
