import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app/app-header";

/** Shell for a board's settings while the board record streams in. */
export default function BoardSettingsLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Skeleton variant="text" width={200} height={44} />
            <Skeleton variant="text" width="55%" />
          </Box>
          <Paper sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={80} />
              <Skeleton variant="rounded" width={120} height={36} />
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
