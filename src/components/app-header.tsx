import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

interface AppHeaderProps {
  /** Optional right-side slot for page-specific actions (Save, Share, etc). */
  actions?: React.ReactNode;
  /** Optional crumb shown after the wordmark, e.g. board name in editor. */
  crumb?: string;
}

/**
 * Universal top bar.
 *
 * The orange square + wordmark mirrors the pitch deck identity: the small
 * filled square next to "STATEBOARD" is the brand mark, not decoration.
 */
export function AppHeader({ actions, crumb }: AppHeaderProps) {
  return (
    <AppBar position="sticky">
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 60 },
          gap: 2,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              aria-hidden
              sx={{
                width: 14,
                height: 14,
                bgcolor: "primary.main",
                borderRadius: 0.5,
              }}
            />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
            >
              STATEBOARD
            </Typography>
          </Stack>
        </Link>
        {crumb ? (
          <>
            <Typography
              component="span"
              sx={{ color: "text.secondary", mx: 1 }}
              aria-hidden
            >
              /
            </Typography>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ color: "text.secondary", fontWeight: 500, flex: 1 }}
            >
              {crumb}
            </Typography>
          </>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        {actions ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {actions}
          </Stack>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
