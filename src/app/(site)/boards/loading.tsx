import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app-header";

/**
 * Shown while the board list streams in from Postgres. Mirrors the
 * BoardList layout (header row + responsive card grid) so the page
 * doesn't jump when the real data lands.
 */
export default function BoardsLoading() {
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
              <Skeleton variant="text" width={140} height={44} />
              <Skeleton variant="text" width={300} />
            </Box>
            <Skeleton variant="rounded" width={132} height={36} />
          </Stack>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Paper key={i} sx={{ p: 2.5 }}>
                <Skeleton variant="text" width="65%" height={28} />
                <Skeleton variant="text" width="95%" />
                <Skeleton variant="text" width="45%" />
              </Paper>
            ))}
          </Box>
        </Stack>
      </Container>
    </>
  );
}
