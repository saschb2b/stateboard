import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { AppHeader } from "@/components/app-header";

/** Shell for /settings/api-keys while the key list streams in. */
export default function ApiKeysLoading() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Box>
            <Skeleton variant="text" width={160} height={44} />
            <Skeleton variant="text" width="80%" />
          </Box>
          <Paper sx={{ p: 2.5 }}>
            <Skeleton variant="text" width={80} />
            <Skeleton variant="rounded" height={40} sx={{ mt: 1.5 }} />
          </Paper>
          <Paper sx={{ overflow: "hidden" }}>
            <Stack
              divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} sx={{ p: 2 }}>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="70%" />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </>
  );
}
