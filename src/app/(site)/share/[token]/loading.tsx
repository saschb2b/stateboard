import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app/app-header";

/**
 * Shown while a shared board loads. Mirrors the BoardShare layout
 * (description line, the three state totals, then the tabbed screen)
 * so the artifact an exec opened doesn't flash an empty page first.
 */
export default function ShareLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width="42%" sx={{ mb: 3, maxWidth: 720 }} />
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={96} height={37} />
          ))}
        </Stack>
        <Paper sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Skeleton variant="text" width={84} />
            <Skeleton variant="text" width={84} />
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Skeleton
              variant="rounded"
              sx={{ width: "100%", aspectRatio: "16 / 9" }}
            />
          </Box>
        </Paper>
      </Container>
    </>
  );
}
