import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app/app-header";

/**
 * Shown while the editor loads a board and its screens. Mirrors the
 * BoardEditor chrome (screen tabs + state filter pills, then the canvas
 * and side panel) so the heavy editor view doesn't pop in cold.
 */
export default function BoardEditorLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ flexWrap: "wrap", rowGap: 1 }}
          >
            <Skeleton variant="rounded" width={120} height={32} />
            <Skeleton variant="rounded" width={104} height={32} />
            <Box sx={{ flex: 1 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={66} height={32} />
            ))}
          </Stack>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton
                variant="rounded"
                sx={{ width: "100%", aspectRatio: "16 / 9" }}
              />
            </Box>
            <Paper
              sx={{ p: 2.5, width: { xs: "100%", lg: 320 }, flexShrink: 0 }}
            >
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="55%" height={26} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="85%" />
                <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
